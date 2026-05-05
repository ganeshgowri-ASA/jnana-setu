import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  RFX_BASE_URL: z.string().url().default("https://rfxmanager.ril.com"),
  RFX_API_TOKEN: z.string().default(""),
  RFX_WEBHOOK_SECRET: z.string().default(""),

  QM_BASE_URL: z.string().url().default("https://pncplatform.ril.com/queryManager"),
  QM_API_TOKEN: z.string().default(""),
  QM_WEBHOOK_SECRET: z.string().default(""),

  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_STREAM_RFX: z.string().default("bridge:rfx"),
  REDIS_STREAM_QM: z.string().default("bridge:qm"),
  REDIS_CONSUMER_GROUP: z.string().default("bridge-sync"),

  SYNC_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),
  LOG_LEVEL: z.string().default("info"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}
