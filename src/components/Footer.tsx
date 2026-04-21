export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600">
        <p>
          <strong>jnana-setu</strong> indexes and links to{" "}
          <strong>openly-licensed</strong>, <strong>public-domain</strong>, and{" "}
          <strong>officially-free</strong> study resources only. We do not host
          or mirror copyrighted textbooks.
        </p>
        <p className="mt-2">
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
        <p className="mt-4 text-xs text-slate-500">
          Catalog code is MIT-licensed. Each linked resource carries its own license —
          see the badge on every card.
        </p>
      </div>
    </footer>
  );
}
