# Licensing policy

jnana-setu is committed to being a **legal, open-access** catalog. This
document is the binding rule for what may and may not be added to the
catalog. It applies to human contributors and to the n8n refresh workflows
alike.

## The rule

Every entry in `data/resources/**` must satisfy **at least one** of the
following conditions, verified against the source page at the time the entry
is added or refreshed.

### A. Openly licensed

The resource is released by its author or publisher under one of:

- `CC BY 4.0`
- `CC BY-SA 4.0`
- `CC BY-NC 4.0`
- `CC BY-NC-SA 4.0`
- `CC0 1.0`
- Government-of-India Open Data License
- A comparable open license named on the source page

and the license statement is visible on the resource's own page — not just
inferred from a site-wide footer.

### B. Public domain

The resource is in the public domain in its country of origin (for
example, U.S. federal government works published by NASA NTRS).

### C. Officially released free-of-cost

The resource is hosted by an official body (an IIT organising GATE, the
Ministry of Education, the awarding university on Shodhganga, etc.) and is
freely accessible without a paywall or registration. In this category we
link only to the **official host**. We never mirror the file.

## What is never acceptable

- **Mirroring or hosting** copyrighted textbooks, solution manuals,
  coaching-institute PDFs, or paywalled journal articles — even if an
  uploaded copy exists somewhere on the public web.
- **Scraping** the text or PDFs of paywalled content.
- **Stripping attribution**: authors, institution, publisher and license
  badge must survive to the UI card.
- Linking to a **third-party mirror** of a paper/paper-key that the
  organising IIT has published itself. Always use the original source.

## Reporting

If you are a rights holder who believes a link in this catalog points to
infringing content, open an issue at
<https://github.com/ganeshgowri-asa/jnana-setu/issues>, or email the
maintainers (address in the repository profile). We triage takedowns within
**72 hours**. If the claim is valid, we remove the entry immediately; the
takedown is recorded in the git history.

## Review checklist (for PR reviewers)

- [ ] The `license` field matches what the source page shows today.
- [ ] The `url` is on the source's official domain (see `data/sources.json`).
- [ ] The `sourceId` refers to an approved source.
- [ ] No full-text copy, PDF, or thumbnail image of the resource is being
      committed to this repo.
- [ ] Author, institution and license are preserved in the JSON and therefore
      on the rendered card.

## Catalog code

The application source code is licensed under the [MIT License](./LICENSE).
Each linked resource carries its own license; the MIT license applies only to
the Next.js app, the catalog schema, the build scripts and the n8n workflow
definitions.
