import type { Logger } from "pino";
import type { EventBus, BridgeEvent } from "../bus/events.js";
import type { RfxManagerClient } from "../sdk/rfx-client.js";
import type { QueryManagerClient } from "../sdk/query-manager-client.js";
import { QueryMessageSchema, QuerySchema, type Query, type QueryMessage } from "../sdk/types.js";
import type { MappingStore } from "./mapping.js";

export interface SyncAgentDeps {
  rfx: RfxManagerClient;
  qm: QueryManagerClient;
  bus: EventBus;
  store: MappingStore;
  logger: Logger;
  streams: { rfx: string; qm: string };
  group: string;
  consumer?: string;
}

/**
 * Bidirectional sync agent.
 *
 * - Subscribes to the RFX stream, projecting RFX query events into
 *   Query Manager threads (creating them on first sight).
 * - Subscribes to the Query Manager stream, projecting QM thread events
 *   back into the originating RFX query.
 *
 * All upstream operations are idempotent: thread creation is gated on
 * a mapping lookup, and message mirroring is gated on a per-direction
 * `messageId` ledger.
 */
export class SyncAgent {
  private readonly consumer: string;

  constructor(private readonly deps: SyncAgentDeps) {
    this.consumer = deps.consumer ?? `sync-${process.pid}`;
  }

  async start(signal?: AbortSignal): Promise<void> {
    const { bus, streams, group, logger } = this.deps;
    logger.info({ streams, group, consumer: this.consumer }, "sync agent starting");
    await Promise.all([
      bus.consume(streams.rfx, group, this.consumer, (_id, e) => this.handleRfxEvent(e), { signal }),
      bus.consume(streams.qm, group, this.consumer, (_id, e) => this.handleQmEvent(e), { signal }),
    ]);
  }

  // ---------------- RFX → Query Manager ----------------

  async handleRfxEvent(event: BridgeEvent): Promise<void> {
    const { logger } = this.deps;
    switch (event.type) {
      case "rfx.query.created":
        await this.mirrorRfxQuery(this.parseQuery(event.payload.query));
        break;
      case "rfx.query.message_added":
        await this.mirrorRfxMessage(
          String(event.payload.queryId),
          this.parseMessage(event.payload.message),
        );
        break;
      case "rfx.query.status_changed":
        await this.mirrorRfxStatus(
          String(event.payload.queryId),
          String(event.payload.status) as Query["status"],
        );
        break;
      default:
        logger.debug({ type: event.type }, "ignoring non-RFX event on RFX stream");
    }
  }

  private async mirrorRfxQuery(query: Query): Promise<string> {
    const { qm, store } = this.deps;
    const existing = await store.getThreadId(query.id);
    if (existing) return existing;

    const remoteExisting = await qm.findThreadByExternalId(query.id);
    if (remoteExisting) {
      await store.setThreadId(query.id, remoteExisting.id);
      return remoteExisting.id;
    }

    const initial = query.messages[0];
    const thread = await qm.createThread({
      rfqId: query.rfqId,
      vendorId: query.vendorId,
      subject: query.subject,
      externalId: query.id,
      initialMessage: initial
        ? { authorId: initial.authorId, authorRole: initial.authorRole, body: initial.body }
        : { authorId: "system", authorRole: "system", body: query.subject },
    });
    await store.setThreadId(query.id, thread.id);
    if (initial) await store.markMessageMirrored("rfx->qm", initial.id);
    return thread.id;
  }

  private async mirrorRfxMessage(rfxQueryId: string, message: QueryMessage): Promise<void> {
    const { qm, rfx, store, logger } = this.deps;
    if (await store.isMessageMirrored("rfx->qm", message.id)) return;

    let threadId = await store.getThreadId(rfxQueryId);
    if (!threadId) {
      const query = await rfx.getQuery(rfxQueryId);
      threadId = await this.mirrorRfxQuery(query);
    }

    await qm.postMessage(threadId, {
      authorId: message.authorId,
      authorRole: message.authorRole,
      body: message.body,
      externalMessageId: message.id,
    });
    await store.markMessageMirrored("rfx->qm", message.id);
    logger.debug({ rfxQueryId, threadId, messageId: message.id }, "mirrored RFX → QM");
  }

  private async mirrorRfxStatus(rfxQueryId: string, status: Query["status"]): Promise<void> {
    const { qm, store } = this.deps;
    const threadId = await store.getThreadId(rfxQueryId);
    if (!threadId) return;
    await qm.updateStatus(threadId, status);
  }

  // ---------------- Query Manager → RFX ----------------

  async handleQmEvent(event: BridgeEvent): Promise<void> {
    const { logger } = this.deps;
    switch (event.type) {
      case "qm.thread.message_added":
        await this.mirrorQmMessage(
          String(event.payload.threadId),
          this.parseMessage(event.payload.message),
        );
        break;
      case "qm.thread.status_changed":
        await this.mirrorQmStatus(
          String(event.payload.threadId),
          String(event.payload.status) as Query["status"],
        );
        break;
      case "qm.thread.created":
        // Threads created in QM that originated from RFX are already mapped.
        // Threads originated in QM are not pushed back into RFX (no upstream API
        // for buyer-initiated queries on the vendor portal).
        break;
      default:
        logger.debug({ type: event.type }, "ignoring non-QM event on QM stream");
    }
  }

  private async mirrorQmMessage(threadId: string, message: QueryMessage): Promise<void> {
    const { rfx, store, logger } = this.deps;
    if (await store.isMessageMirrored("qm->rfx", message.id)) return;
    const rfxQueryId = await store.getRfxQueryId(threadId);
    if (!rfxQueryId) {
      logger.warn({ threadId }, "no RFX query mapped for thread; dropping message");
      return;
    }
    await rfx.postQueryMessage(rfxQueryId, { authorId: message.authorId, body: message.body });
    await store.markMessageMirrored("qm->rfx", message.id);
  }

  private async mirrorQmStatus(threadId: string, status: Query["status"]): Promise<void> {
    const { rfx, store } = this.deps;
    const rfxQueryId = await store.getRfxQueryId(threadId);
    if (!rfxQueryId) return;
    await rfx.updateQueryStatus(rfxQueryId, status);
  }

  // ---------------- helpers ----------------

  private parseQuery(value: unknown): Query {
    return QuerySchema.parse(value);
  }

  private parseMessage(value: unknown): QueryMessage {
    return QueryMessageSchema.parse(value);
  }
}
