export const metadata = { title: "Licensing Policy" };

export default function LicensingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 prose prose-slate">
      <h1>Licensing policy</h1>
      <p>
        <strong>jnana-setu is a legal, open-access catalog.</strong> Every entry
        in this catalog must satisfy <em>at least one</em> of the following
        conditions. Entries that do not are rejected during review.
      </p>

      <h2>1. Openly licensed</h2>
      <p>
        The resource is released by its author or publisher under one of the
        Creative Commons licenses (<code>CC BY</code>, <code>CC BY-SA</code>,{" "}
        <code>CC BY-NC</code>, <code>CC BY-NC-SA</code>, <code>CC0</code>) or an
        equivalent open license, and the license statement is visible on the
        source page.
      </p>

      <h2>2. Public domain</h2>
      <p>
        The resource is in the public domain — for example, U.S. federal
        government works published by NASA NTRS.
      </p>

      <h2>3. Officially released free-of-cost</h2>
      <p>
        The resource is hosted by an official body (e.g. an IIT organising
        GATE, Ministry of Education portals) and made freely accessible
        without registration or paywall. We only <em>link</em> to the official
        host; we never mirror or redistribute the PDF.
      </p>

      <h2>What we will never do</h2>
      <ul>
        <li>
          <strong>Never mirror or host</strong> copyrighted textbooks, solution
          manuals, or proprietary coaching-institute material.
        </li>
        <li>
          <strong>Never scrape</strong> paywalled content, even when a scraped
          copy exists elsewhere on the internet.
        </li>
        <li>
          <strong>Never strip attribution</strong> from openly-licensed works:
          authors, publisher, and license badge stay on every card.
        </li>
      </ul>

      <h2>Reporting a problem</h2>
      <p>
        If you are a rights holder who believes a link in this catalog points to
        infringing content, or if you notice a broken link, open an issue on the
        project's{" "}
        <a
          href="https://github.com/ganeshgowri-asa/jnana-setu/issues"
          rel="noopener noreferrer"
        >
          GitHub issue tracker
        </a>
        . We act on valid reports within 72 hours.
      </p>

      <h2>Catalog code</h2>
      <p>
        The source code of this web application is released under the{" "}
        <a href="https://opensource.org/licenses/MIT" rel="noopener noreferrer">
          MIT License
        </a>
        . Each linked resource carries its own license, shown on every card.
      </p>
    </div>
  );
}
