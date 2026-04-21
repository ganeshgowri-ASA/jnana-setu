import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="group flex items-baseline gap-3">
          <span className="font-devanagari text-2xl font-bold text-slate-50 group-hover:text-saffron">
            ज्ञानसेतु
          </span>
          <span className="hidden text-sm uppercase tracking-widest text-slate-400 sm:inline">
            jnana-setu
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-300 md:gap-6">
          <Link href="/subjects" className="hover:text-saffron">Subjects</Link>
          <Link href="/sources" className="hover:text-saffron">Sources</Link>
          <Link href="/licensing" className="hover:text-saffron">Licensing</Link>
          <Link href="/about" className="hover:text-saffron">About</Link>
          <a
            href="https://github.com/ganeshgowri-asa/jnana-setu"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-md border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300 hover:border-saffron hover:text-saffron md:inline-block"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
