#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { logger } from "./util/logger.js";
import { RedisEventBus } from "./bus/redis.js";
import { RfxManagerClient } from "./sdk/rfx-client.js";
import { QueryManagerClient } from "./sdk/query-manager-client.js";
import { buildWebhookServer } from "./webhooks/server.js";
import { SyncAgent } from "./sync/agent.js";
import { InMemoryMappingStore } from "./sync/mapping.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  const bus = RedisEventBus.fromUrl(cfg.REDIS_URL);

  const rfx = new RfxManagerClient({ baseUrl: cfg.RFX_BASE_URL, token: cfg.RFX_API_TOKEN });
  const qm = new QueryManagerClient({ baseUrl: cfg.QM_BASE_URL, token: cfg.QM_API_TOKEN });

  const app = buildWebhookServer({
    bus,
    streams: { rfx: cfg.REDIS_STREAM_RFX, qm: cfg.REDIS_STREAM_QM },
    secrets: { rfx: cfg.RFX_WEBHOOK_SECRET, qm: cfg.QM_WEBHOOK_SECRET },
  });

  const ac = new AbortController();
  const agent = new SyncAgent({
    rfx,
    qm,
    bus,
    store: new InMemoryMappingStore(),
    logger,
    streams: { rfx: cfg.REDIS_STREAM_RFX, qm: cfg.REDIS_STREAM_QM },
    group: cfg.REDIS_CONSUMER_GROUP,
  });
  agent.start(ac.signal).catch((err) => logger.error({ err }, "sync agent crashed"));

  const server = app.listen(cfg.PORT, () => {
    logger.info({ port: cfg.PORT }, "procurement bridge listening");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    ac.abort();
    server.close();
    await bus.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "fatal");
  process.exit(1);
});
