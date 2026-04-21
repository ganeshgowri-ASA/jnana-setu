# n8n workflows for jnana-setu

This directory holds exported n8n workflow definitions that keep the catalog
fresh without scraping or mirroring copyrighted content. Each workflow:

1. Fetches an **official index page** or API from an approved source
   (NPTEL, OpenStax, LibreTexts, GATE-organising IIT, etc.).
2. Normalises new entries into the catalog JSON schema (`data/schema.ts`).
3. Opens a **pull request** against `main` with the diff — never commits directly.

A human reviewer then verifies:

- the license statement is still visible on the source page, and
- the linked URL is the official host (not a third-party mirror).

No workflow ever downloads the full resource. They only process metadata
(title, URL, license, author, institution) that the source itself publishes.

## Importing a workflow

1. Open your n8n instance (self-hosted or cloud).
2. **Workflows → Import from file** → select any `workflows/*.json`.
3. Configure the required credentials: a GitHub App with write access to
   `ganeshgowri-asa/jnana-setu` scoped to open pull requests only.
4. Enable the schedule trigger. Default cadence is **weekly at 03:00 IST on Sundays**.

## Environment

| Variable | Purpose |
| --- | --- |
| `GITHUB_APP_ID` | GitHub App credential id configured in n8n |
| `GITHUB_REPO` | Always `ganeshgowri-asa/jnana-setu` |
| `N8N_REFRESH_WEBHOOK_SECRET` | Shared secret for the optional callback webhook |

## Governance

Any new workflow must be reviewed against the licensing policy in
[`/LICENSING.md`](../LICENSING.md) before it is enabled. If you add a new
source, update `data/sources.json` first and get it merged — the workflow
must refer to an approved `sourceId`.
