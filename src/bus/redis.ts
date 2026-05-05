import { Redis } from "ioredis";
import { logger } from "../util/logger.js";
import { BridgeEventSchema, type BridgeEvent, type EventBus } from "./events.js";

/**
 * EventBus backed by Redis Streams. Each `publish` call appends a new entry
 * with the JSON-encoded event under the field `data`. `consume` creates the
 * consumer group if missing and dispatches messages to the handler with
 * automatic XACK on success.
 */
export class RedisEventBus implements EventBus {
  constructor(private readonly redis: Redis) {}

  static fromUrl(url: string): RedisEventBus {
    return new RedisEventBus(new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null }));
  }

  async publish(stream: string, event: BridgeEvent): Promise<string> {
    BridgeEventSchema.parse(event);
    const id = await this.redis.xadd(stream, "*", "data", JSON.stringify(event));
    if (!id) throw new Error(`xadd to ${stream} returned null`);
    return id;
  }

  private async ensureGroup(stream: string, group: string): Promise<void> {
    try {
      await this.redis.xgroup("CREATE", stream, group, "$", "MKSTREAM");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("BUSYGROUP")) throw err;
    }
  }

  async consume(
    stream: string,
    group: string,
    consumer: string,
    handler: (id: string, event: BridgeEvent) => Promise<void>,
    opts: { blockMs?: number; count?: number; signal?: AbortSignal } = {},
  ): Promise<void> {
    const { blockMs = 5_000, count = 16, signal } = opts;
    await this.ensureGroup(stream, group);

    while (!signal?.aborted) {
      const res = (await this.redis.xreadgroup(
        "GROUP",
        group,
        consumer,
        "COUNT",
        count,
        "BLOCK",
        blockMs,
        "STREAMS",
        stream,
        ">",
      )) as Array<[string, Array<[string, string[]]>]> | null;

      if (!res) continue;
      for (const [, entries] of res) {
        for (const [id, fields] of entries) {
          const dataIdx = fields.indexOf("data");
          const raw = dataIdx >= 0 ? fields[dataIdx + 1] : undefined;
          if (!raw) {
            await this.redis.xack(stream, group, id);
            continue;
          }
          try {
            const event = BridgeEventSchema.parse(JSON.parse(raw));
            await handler(id, event);
            await this.redis.xack(stream, group, id);
          } catch (err) {
            logger.error({ err, id, stream }, "event handler failed");
            // leave un-acked → will appear in pending and can be claimed/replayed
          }
        }
      }
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
