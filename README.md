# jnana-setu

**ज्ञानसेतु — Bridge of Knowledge.**
An open, legally-sourced catalog and searchable web app for EEE / GATE study
material (NPTEL, MIT OCW, OpenStax, LibreTexts, official GATE papers,
Shodhganga, NASA NTRS and more). Auto-refreshed via n8n, deployable on
Vercel.

## Non-negotiable principle

> jnana-setu only **indexes and links** to resources that are openly licensed,
> in the public domain, or officially released free-of-cost. We never scrape,
> mirror, or redistribute copyrighted textbooks or coaching material.

See [`/LICENSING.md`](./LICENSING.md) and the in-app page at `/licensing`.

## Stack

- **Next.js 14** (App Router, TypeScript, Tailwind) — deployable on Vercel
- **Static JSON catalog** under `data/` — no database needed
- **Zod** for schema validation at build time
- **Fuse.js** for fuzzy search (site + JSON API)
- **n8n** for scheduled catalog refresh and link-health checks

## Repository layout

```
.
├── data/
│   ├── schema.ts           Zod schemas + TypeScript types
│   ├── subjects.json       EEE / GATE subjects
│   ├── sources.json        Approved upstream sources (each with its license)
│   └── resources/*.json    Per-source curated entries
├── src/
│   ├── app/                Next.js App Router pages + /api/search
│   ├── components/         Header, Footer, SearchBar, ResourceCard, ...
│   └── lib/                catalog loader, search index, license helpers
├── scripts/
│   ├── validate.ts         Fails CI on any schema / duplicate-id / bad ref
│   └── build-index.ts      Emits public/catalog-index.json for link checks
└── n8n/
    ├── README.md
    └── workflows/*.json    NPTEL / OpenStax refresh + weekly link-health
```

## Getting started

```bash
npm install
cp .env.example .env.local
npm run validate:catalog   # zod-validates every JSON entry
npm run dev                # http://localhost:3000
```

Useful scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local Next dev server |
| `npm run build` | Production build |
| `npm run check` | typecheck + lint + catalog validation (run this in CI) |
| `npm run validate:catalog` | Schema-validate `data/**` |
| `npm run build:index` | Emit `public/catalog-index.json` used by the link-health workflow |

## Adding a resource

1. Confirm the resource is openly-licensed, public-domain, or officially free.
   Take a screenshot of the license statement if it isn't obvious.
2. Add an entry to the appropriate file under `data/resources/` (or create a
   new file if the source is new — but first add the source to
   `data/sources.json`).
3. Run `npm run validate:catalog`. Fix any errors.
4. Open a pull request. A reviewer checks the license on the linked page.

The JSON schema is in [`data/schema.ts`](./data/schema.ts). Fields:

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | slug, unique across the whole catalog |
| `title`, `description` | yes | |
| `sourceId` | yes | must match an entry in `sources.json` |
| `url` | yes | the official host's URL only |
| `subjects` | yes | slug(s) from `subjects.json` |
| `media` | yes | `video-lectures`, `textbook`, `problem-set`, `past-paper`, ... |
| `level` | yes | `ug`, `pg`, `gate`, `mixed` |
| `license` | yes | enum defined in `schema.ts` |
| `licenseUrl` | optional | override for the license link |
| `authors`, `institution`, `year`, `gateTopics`, `tags` | optional | |

## JSON search API

```
GET /api/search?q=<text>&subject=<slug>&source=<id>&media=<type>&level=<level>&limit=<n>
```

Returns up to 100 lean hits with fuzzy scoring. Cached at the edge for one
hour (`s-maxage=3600`).

## Deployment

The project is a standard Next.js app — `vercel deploy` or any Next-compatible
host works. `vercel.json` pins the region to `bom1` (Mumbai) for lower
latency to Indian users.

## Contributing

Read [`/LICENSING.md`](./LICENSING.md) first — we reject PRs that add
copyrighted material even if it's freely available elsewhere on the web.

## License

The catalog code is MIT-licensed (see [`LICENSE`](./LICENSE)). Each linked
resource carries its own license and is attributed individually.
