import { HomeBrowser } from "@/components/HomeBrowser";
import { LegalBadge } from "@/components/LegalBadge";
import { getCatalog } from "@/lib/catalog";

export const revalidate = 3600;

export default async function HomePage() {
  const catalog = await getCatalog();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <LegalBadge />
          <span className="text-xs uppercase tracking-widest text-slate-500">
            {catalog.resources.length} resources · {catalog.sources.length} sources · {catalog.subjects.length} subjects
          </span>
        </div>
        <h1 className="text-4xl font-bold leading-tight text-slate-50 md:text-5xl">
          <span className="font-devanagari">ज्ञानसेतु</span>
          <span className="mx-3 text-slate-600">·</span>
          <span>jnana-setu</span>
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-300 md:text-xl">
          An open bridge to EEE &amp; GATE knowledge — curated from NPTEL, MIT
          OCW, OpenStax, LibreTexts, and official GATE archives.
        </p>
      </section>

      <HomeBrowser
        resources={catalog.resources}
        sources={catalog.sources}
        subjects={catalog.subjects}
      />
    </div>
  );
}
