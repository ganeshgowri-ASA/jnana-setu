export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm">
        <p>
          <strong className="text-slate-100">jnana-setu</strong> indexes and
          links to <strong className="text-slate-100">openly-licensed</strong>,{" "}
          <strong className="text-slate-100">public-domain</strong>, and{" "}
          <strong className="text-slate-100">officially-free</strong> study
          resources only. We never host or mirror copyrighted textbooks.
        </p>
        <p className="mt-2 text-slate-400">
          Found a broken link or a licensing concern? Open an issue at{" "}
          <a
            href="https://github.com/ganeshgowri-asa/jnana-setu/issues"
            className="text-saffron hover:underline"
            rel="noopener noreferrer"
          >
            github.com/ganeshgowri-asa/jnana-setu
          </a>
          .
        </p>
        <p className="mt-6 text-xs text-slate-500">
          Catalog code is MIT-licensed. Each linked resource carries its own
          license — see the badge on every card.
        </p>
      </div>
    </footer>
  );
}
