import { z } from "zod";

export const BridgeEventSchema = z.object({
  /** Unique id for idempotency */
  id: z.string(),
  /** Source system that produced the event */
  source: z.enum(["rfx", "query_manager", "bridge"]),
  /** Logical event type */
  type: z.enum([
    "rfx.query.created",
    "rfx.query.message_added",
    "rfx.query.status_changed",
    "qm.thread.created",
    "qm.thread.message_added",
    "qm.thread.status_changed",
  ]),
  occurredAt: z.string().datetime({ offset: true }),
  payload: z.record(z.unknown()),
});

export type BridgeEvent = z.infer<typeof BridgeEventSchema>;

/** Common interface that the sync agent depends on (allows in-memory test bus). */
export interface EventBus {
  publish(stream: string, event: BridgeEvent): Promise<string>;
  consume(
    stream: string,
    group: string,
    consumer: string,
    handler: (id: string, event: BridgeEvent) => Promise<void>,
    opts?: { blockMs?: number; count?: number; signal?: AbortSignal },
  ): Promise<void>;
  close(): Promise<void>;
}
