# Deploy

## Container image

```bash
docker build -t ghcr.io/ganeshgowri-asa/procurement-bridge:0.1.0 .
docker push ghcr.io/ganeshgowri-asa/procurement-bridge:0.1.0
```

## npm package — `@anahatasri/procurement-bridge`

Prerequisites:

1. An npm access token with publish rights on the `@anahatasri` scope, exported as `NPM_TOKEN`.
2. A clean working tree on a tagged commit (`v0.1.0-procurement-bridge` for the first release).

Publish flow:

```bash
# 1. install + verify
npm ci
npm run lint
npm test

# 2. build distributable
npm run build

# 3. authenticate
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc

# 4. publish (the prepublishOnly script re-runs lint/test/build defensively)
npm publish --access public

# 5. verify
npm view @anahatasri/procurement-bridge versions
```

The package exports:

| Subpath  | Module                       |
|----------|------------------------------|
| `.`      | `dist/index.js` (server)     |
| `./sdk`  | `dist/sdk/index.js` (clients + Zod schemas) |
| `./bus`  | `dist/bus/events.js` (`BridgeEvent`, `EventBus`) |
| `./openapi` | `docs/openapi.yaml`       |

## Tagging convention

Tags are component-prefixed because this monorepo will host more bridges over time:

- `v0.1.0-procurement-bridge` — first cut of the bridge service / SDK.

## Rolling back

If a release needs to be revoked within 72 h:

```bash
npm unpublish @anahatasri/procurement-bridge@0.1.0
```

Beyond 72 h, publish a `0.1.1` patch with the fix or `npm deprecate`.
