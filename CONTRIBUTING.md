# Contributing to jnana-setu

Thanks for wanting to improve the catalog. Please read
[`LICENSING.md`](./LICENSING.md) before you open a PR — it is the one rule
we cannot bend.

## Adding or updating a resource

1. Verify the license on the resource's own page.
2. Add the entry to the correct file under `data/resources/`. If the source
   is new, also add it to `data/sources.json` in the same PR.
3. Run locally:
   ```bash
   npm run check
   ```
   This runs TypeScript, ESLint, and Zod-validates every JSON entry.
4. Open the PR. In the description, paste a link to the page where the
   license is stated, and (if possible) a screenshot or copy of the license
   text.

## Code changes

- Keep the catalog code MIT-compatible.
- Don't add network calls that fetch from paywalled sources.
- Don't download or commit PDFs, video files, or textbook content.
- Prefer small, focused PRs; update `README.md` when behavior changes.

## Running locally

```bash
npm install
npm run dev          # http://localhost:3000
npm run validate:catalog
```

## Reporting a licensing concern

If you notice a resource that may be infringing, or a link that has rotted,
open an issue. Takedowns are handled within 72 hours (see
[`LICENSING.md`](./LICENSING.md#reporting)).
