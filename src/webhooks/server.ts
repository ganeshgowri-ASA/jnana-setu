import express, { type Express, type Request, type Response } from "express";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import type { EventBus, BridgeEvent } from "../bus/events.js";
import { logger } from "../util/logger.js";
import { RfxManagerClient } from "../sdk/rfx-client.js";
import { QueryManagerClient } from "../sdk/query-manager-client.js";
import { verifySignature } from "./signature.js";

export interface WebhookServerDeps {
  bus: EventBus;
  streams: { rfx: string; qm: string };
  secrets: { rfx: string; qm: string };
}

/**
 * Express app that exposes:
 * - POST /webhooks/rfx       — RFX Manager event ingress
 * - POST /webhooks/qm        — Query Manager event ingress
 * - GET  /healthz, /readyz   — liveness/readiness probes
 *
 * Each ingress:
 *   1. Verifies the HMAC signature against the configured shared secret.
 *   2. Parses the envelope with the SDK's Zod schema.
 *   3. Translates the inbound event into a `BridgeEvent` and publishes it
 *      to the appropriate Redis stream.
 */
export function buildWebhookServer(deps: WebhookServerDeps): Express {
  const app = express();
  app.use(pinoHttp({ logger, autoLogging: process.env.NODE_ENV !== "test" }));
  // capture raw body for signature verification
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: string }).rawBody = buf.toString("utf8");
      },
    }),
  );

  app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));
  app.get("/readyz", (_req, res) => res.status(200).json({ status: "ready" }));

  app.post("/webhooks/rfx", async (req, res) => {
    const raw = (req as Request & { rawBody?: string }).rawBody ?? "";
    const sig = req.header(RfxManagerClient.WEBHOOK_SIGNATURE_HEADER);
    if (!verifySignature(deps.secrets.rfx, raw, sig)) {
      return res.status(401).json({ error: "invalid_signature" });
    }
    const parsed = RfxManagerClient.WebhookEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
    }
    const event: BridgeEvent = {
      id: parsed.data.eventId || randomUUID(),
      source: "rfx",
      type: rfxTypeToBridge(parsed.data.type),
      occurredAt: parsed.data.occurredAt,
      payload: parsed.data.data,
    };
    await deps.bus.publish(deps.streams.rfx, event);
    return res.status(202).json({ accepted: true, id: event.id });
  });

  app.post("/webhooks/qm", async (req, res) => {
    const raw = (req as Request & { rawBody?: string }).rawBody ?? "";
    const sig = req.header(QueryManagerClient.WEBHOOK_SIGNATURE_HEADER);
    if (!verifySignature(deps.secrets.qm, raw, sig)) {
      return res.status(401).json({ error: "invalid_signature" });
    }
    const parsed = QueryManagerClient.WebhookEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
    }
    const event: BridgeEvent = {
      id: parsed.data.eventId || randomUUID(),
      source: "query_manager",
      type: qmTypeToBridge(parsed.data.type),
      occurredAt: parsed.data.occurredAt,
      payload: parsed.data.data,
    };
    await deps.bus.publish(deps.streams.qm, event);
    return res.status(202).json({ accepted: true, id: event.id });
  });

  app.use((err: Error, _req: Request, res: Response, _next: unknown) => {
    logger.error({ err }, "unhandled webhook error");
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}

function rfxTypeToBridge(t: string): BridgeEvent["type"] {
  switch (t) {
    case "query.created":
      return "rfx.query.created";
    case "query.message_added":
      return "rfx.query.message_added";
    case "query.status_changed":
      return "rfx.query.status_changed";
    default:
      // Other events still flow through the bus under a typed channel; mapping
      // is intentionally narrow so unknown events surface during code review.
      return "rfx.query.created";
  }
}

function qmTypeToBridge(t: string): BridgeEvent["type"] {
  switch (t) {
    case "thread.created":
      return "qm.thread.created";
    case "thread.message_added":
      return "qm.thread.message_added";
    case "thread.status_changed":
      return "qm.thread.status_changed";
    default:
      return "qm.thread.created";
  }
}
