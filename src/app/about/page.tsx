export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-50">About jnana-setu</h1>

      <figure className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <blockquote className="font-devanagari text-xl leading-relaxed text-slate-100">
          विद्या ददाति विनयं विनयाद् याति पात्रताम्।
          <br />
          पात्रत्वाद् धनमाप्नोति धनाद्धर्मं ततः सुखम्॥
        </blockquote>
        <figcaption className="mt-3 text-sm text-slate-400">
          <em>Knowledge begets humility; from humility, worthiness; from
          worthiness, sustenance; from sustenance, right action; and from
          right action, well-being.</em> — a classical Sanskrit verse on the
          purpose of learning.
        </figcaption>
      </figure>

      <div className="prose prose-invert mt-8 max-w-none prose-headings:text-slate-100 prose-a:text-saffron">
        <p>
          <strong>ज्ञानसेतु</strong> — <em>a bridge of knowledge</em>. GATE
          preparation in India is dominated by expensive coaching. Yet many of
          the world's best teachers — from the IITs, from MIT, from Rice — have
          already released their lectures, textbooks and problem sets under
          open licenses. The bottleneck isn't availability; it's discovery.
        </p>
        <p>
          jnana-setu is a curated catalog that sits between learners and these
          free resources. You search once; we surface everything we have
          permission to link to.
        </p>

        <h2>How the catalog stays fresh</h2>
        <p>
          Scheduled Python scrapers under{" "}
          <code>scrapers/</code> check each upstream source on cadence — NPTEL
          course listings, OpenStax book index, LibreTexts sitemaps, and the
          GATE organising IIT's archive pages. Every request is guarded by{" "}
          <code>assert_whitelisted()</code>, <code>robots.txt</code>, and a 1
          req/sec rate limiter. Results are merged into{" "}
          <code>catalog/&lt;subject&gt;.json</code> by <code>id</code> and
          surfaced via a pull request so a human reviewer can verify the
          license on the source page before merge.
        </p>

        <h2>Stack</h2>
        <ul>
          <li>Next.js 14 (App Router) on Vercel</li>
          <li>Static JSON catalog under <code>catalog/</code> — no database</li>
          <li>Fuse.js fuzzy search over the full catalog</li>
          <li>Python + <code>urllib.robotparser</code> + <code>requests</code> for scrapers</li>
          <li>Zod + a TypeScript quality-check script that enforces the sources.yaml whitelist</li>
        </ul>

        <h2>Contributing</h2>
        <p>
          Read <a href="/licensing">the licensing policy</a> first. PRs that
          add copyrighted material are rejected on sight — even when the
          content is freely available elsewhere on the web. See{" "}
          <code>CONTRIBUTING.md</code> for the full checklist.
        </p>
      </div>
    </div>
  );
}
