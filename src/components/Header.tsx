import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="group flex items-baseline gap-3">
          <span className="font-devanagari text-2xl font-bold text-ink group-hover:text-saffron">
            ज्ञानसेतु
          </span>
          <span className="text-sm uppercase tracking-widest text-slate-500">
            jnana-setu
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-slate-700">
          <Link href="/subjects" className="hover:text-saffron">Subjects</Link>
          <Link href="/sources" className="hover:text-saffron">Sources</Link>
          <Link href="/licensing" className="hover:text-saffron">Licensing</Link>
          <Link href="/about" className="hover:text-saffron">About</Link>
        </nav>
      </div>
    </header>
  );
}
