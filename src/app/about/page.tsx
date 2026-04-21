export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 prose prose-slate">
      <h1>About jnana-setu</h1>
      <p className="font-devanagari text-lg">
        ज्ञानसेतु — <em>a bridge of knowledge.</em>
      </p>
      <p>
        GATE preparation in India is dominated by expensive coaching. Yet many
        of the world's best teachers — from IITs, from MIT, from Rice — have
        already released their lectures, textbooks and problem sets under open
        licenses. The bottleneck is discovery, not availability.
      </p>
      <p>
        jnana-setu is a curated catalog that sits between learners and these
        free resources. You search once; we surface everything we have
        permission to link to.
      </p>

      <h2>How the catalog stays fresh</h2>
      <p>
        Scheduled{" "}
        <a href="https://n8n.io" rel="noopener noreferrer">
          n8n
        </a>{" "}
        workflows check each upstream source weekly — NPTEL course listings,
        OpenStax book index, IIT GATE paper pages — and open a pull request
        with diff-ready JSON. A human reviewer merges after verifying the
        license on the source page.
      </p>

      <h2>Stack</h2>
      <ul>
        <li>Next.js 14 (App Router) on Vercel</li>
        <li>Static JSON catalog under <code>/data</code> (no database needed)</li>
        <li>Fuse.js for client-simple fuzzy search</li>
        <li>n8n for scheduled refresh workflows</li>
        <li>Zod for catalog validation</li>
      </ul>

      <h2>Contributing</h2>
      <p>
        See <code>CONTRIBUTING.md</code> in the repo. All contributions are
        reviewed against the{" "}
        <a href="/licensing">licensing policy</a>.
      </p>
    </div>
  );
}
