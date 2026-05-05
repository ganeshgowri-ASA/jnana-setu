import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import request from "node:http";
import { buildWebhookServer } from "../src/webhooks/server.js";
import { InMemoryEventBus } from "../src/bus/in-memory.js";
import { NOW, query } from "./fixtures.js";

function sign(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

async function send(
  app: ReturnType<typeof buildWebhookServer>,
  path: string,
  headers: Record<string, string>,
  body: string,
): Promise<{ status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") return reject(new Error("bad addr"));
      const req = request.request(
        {
          host: "127.0.0.1",
          port: addr.port,
          path,
          method: "POST",
          headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body), ...headers },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");
            let json: unknown;
            try {
              json = JSON.parse(text);
            } catch {
              json = text;
            }
            server.close();
            resolve({ status: res.statusCode ?? 0, json });
          });
        },
      );
      req.on("error", (e) => {
        server.close();
        reject(e);
      });
      req.write(body);
      req.end();
    });
  });
}

describe("Webhook receiver", () => {
  const bus = new InMemoryEventBus();
  const app = buildWebhookServer({
    bus,
    streams: { rfx: "rfx", qm: "qm" },
    secrets: { rfx: "rfx-secret", qm: "qm-secret" },
  });

  it("rejects RFX webhook with bad signature", async () => {
    const body = JSON.stringify({
      eventId: "e1",
      type: "query.created",
      occurredAt: NOW,
      data: { query },
    });
    const res = await send(app, "/webhooks/rfx", { "x-rfx-signature": "deadbeef" }, body);
    expect(res.status).toBe(401);
  });

  it("rejects malformed RFX payload", async () => {
    const body = JSON.stringify({ eventId: "e1", type: "unknown" });
    const res = await send(
      app,
      "/webhooks/rfx",
      { "x-rfx-signature": sign("rfx-secret", body) },
      body,
    );
    expect(res.status).toBe(400);
  });

  it("accepts RFX query.created and publishes to RFX stream", async () => {
    const body = JSON.stringify({
      eventId: "e-rfx-1",
      type: "query.created",
      occurredAt: NOW,
      data: { query },
    });
    const res = await send(
      app,
      "/webhooks/rfx",
      { "x-rfx-signature": sign("rfx-secret", body) },
      body,
    );
    expect(res.status).toBe(202);
    const events = bus.snapshot("rfx");
    expect(events.find((e) => e.id === "e-rfx-1")?.type).toBe("rfx.query.created");
  });

  it("accepts QM thread.message_added and publishes to QM stream", async () => {
    const payload = {
      eventId: "e-qm-1",
      type: "thread.message_added",
      occurredAt: NOW,
      data: {
        threadId: "t-1",
        message: {
          id: "m-9",
          authorId: "vendor-1",
          authorRole: "vendor",
          body: "Reply",
          attachments: [],
          createdAt: NOW,
        },
      },
    };
    const body = JSON.stringify(payload);
    const res = await send(
      app,
      "/webhooks/qm",
      { "x-qm-signature": sign("qm-secret", body) },
      body,
    );
    expect(res.status).toBe(202);
    const events = bus.snapshot("qm");
    expect(events.find((e) => e.id === "e-qm-1")?.type).toBe("qm.thread.message_added");
  });
});
