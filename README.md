# jnana-setu

ज्ञानसेतु — *Bridge of Knowledge*.

This repository hosts the **Procurement Bridge** integration service, which
bridges [RIL RFX Manager](https://rfxmanager.ril.com) and
[RIL Query Manager](https://pncplatform.ril.com/queryManager).

## What it does

- Mirrors **Queries** raised in RFX Manager into Query Manager threads, and
  mirrors replies and status changes back. The mirroring is bidirectional and
  idempotent.
- Exposes signed **webhook ingress** endpoints for both portals.
- Publishes a normalised **`BridgeEvent`** to **Redis Streams**, which the
  sync agent consumes via a consumer group.
- Ships TypeScript SDK clients with Zod-validated schemas for `Rfq`, `Vendor`,
  `OfferVersion`, and `Query`.

## Layout

```
src/
  sdk/                   typed clients + schemas
    types.ts             Rfq / Vendor / OfferVersion / Query / QueryMessage
    rfx-client.ts        RFX Manager client
    query-manager-client.ts
    http.ts              shared HTTP client (undici + zod)
  bus/
    events.ts            BridgeEvent + EventBus interface
    redis.ts             Redis Streams implementation
    in-memory.ts         test bus
  sync/
    agent.ts             bidirectional mirroring
    mapping.ts           id-mapping ledger
  webhooks/
    server.ts            Express ingress (RFX + QM)
    signature.ts         HMAC-SHA256 verification
  index.ts               wiring + lifecycle
docs/openapi.yaml        OpenAPI 3.1 spec
test/                    Vitest contract tests + msw mocks
Dockerfile, docker-compose.yml
```

## Local development

```bash
cp .env.example .env
docker compose up --build         # bridge + redis
# or, without docker:
npm install
npm run dev
npm test
```

## Endpoints

| Method | Path             | Purpose                            |
|-------:|------------------|------------------------------------|
| GET    | `/healthz`       | liveness                           |
| GET    | `/readyz`        | readiness                          |
| POST   | `/webhooks/rfx`  | RFX Manager event ingress (signed) |
| POST   | `/webhooks/qm`   | Query Manager event ingress (signed) |

See [`docs/openapi.yaml`](./docs/openapi.yaml) for full request/response schemas.

## Webhook signing

Each portal HMAC-signs the raw request body with a shared secret and sends the
hex digest in `X-Rfx-Signature` / `X-Qm-Signature`. The bridge verifies it with
constant-time comparison before publishing to the bus.

## License

MIT — see [LICENSE](./LICENSE).
