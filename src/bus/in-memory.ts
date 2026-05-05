import { randomUUID } from "node:crypto";
import { BridgeEventSchema, type BridgeEvent, type EventBus } from "./events.js";

/** Lightweight in-memory event bus used for tests. */
export class InMemoryEventBus implements EventBus {
  private streams = new Map<string, Array<{ id: string; event: BridgeEvent }>>();
  private waiters = new Map<string, Array<() => void>>();

  async publish(stream: string, event: BridgeEvent): Promise<string> {
    BridgeEventSchema.parse(event);
    const id = `${Date.now()}-${randomUUID()}`;
    const list = this.streams.get(stream) ?? [];
    list.push({ id, event });
    this.streams.set(stream, list);
    const ws = this.waiters.get(stream) ?? [];
    for (const w of ws) w();
    this.waiters.set(stream, []);
    return id;
  }

  async consume(
    stream: string,
    _group: string,
    _consumer: string,
    handler: (id: string, event: BridgeEvent) => Promise<void>,
    opts: { signal?: AbortSignal } = {},
  ): Promise<void> {
    let cursor = 0;
    while (!opts.signal?.aborted) {
      const list = this.streams.get(stream) ?? [];
      while (cursor < list.length) {
        const entry = list[cursor++]!;
        await handler(entry.id, entry.event);
      }
      await new Promise<void>((resolve) => {
        const ws = this.waiters.get(stream) ?? [];
        ws.push(resolve);
        this.waiters.set(stream, ws);
        opts.signal?.addEventListener("abort", () => resolve(), { once: true });
      });
    }
  }

  async close(): Promise<void> {
    this.streams.clear();
    this.waiters.clear();
  }

  snapshot(stream: string): BridgeEvent[] {
    return (this.streams.get(stream) ?? []).map((e) => e.event);
  }
}
