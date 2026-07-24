import { GoldenIllustration } from "@/components/brand/GoldenIllustration";
import { INTENT_VISUALS, PROPERTY_VISUALS, SERVICE_VISUALS, STATE_VISUALS } from "@/lib/brand/visual-assets";

function GallerySection({ title, entries }: { title: string; entries: [string, string][] }) {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0B63CE]">AkarFinder Golden Master · Proposition 3</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0B1F3A]">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {entries.map(([label]) => (
          <article key={label} className="rounded-[2rem] border border-[#DCE8F5] bg-white p-4 shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
            <div className="aspect-square overflow-hidden rounded-[1.55rem] bg-[#EEF6FF]">
              <GoldenIllustration kind={label} className="h-full w-full" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-[#0B1F3A]">{label}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Flat géométrique premium · golden master Proposition 3</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function VisualSystemDemoPage() {
  return (
    <main className="min-h-screen bg-[#F7FAFE] px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-14">
        <header className="max-w-3xl">
          <p className="text-sm font-bold text-[#0B63CE]">QA Gallery · Golden Master</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-[#0B1F3A]">AkarFinder Visual System · Proposition 3</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            La proposition 3 devient la référence absolue : compositions géométriques douces, volumes simples, coins arrondis, profondeur légère et palette dérivée du vrai bleu AkarFinder. Aucun bronze, aucun pictogramme stock.
          </p>
        </header>

        <GallerySection title="Typologies immobilières" entries={Object.entries(PROPERTY_VISUALS)} />
        <GallerySection title="Intentions" entries={Object.entries(INTENT_VISUALS)} />
        <GallerySection title="Services & écosystème" entries={Object.entries(SERVICE_VISUALS)} />
        <GallerySection title="États & fallbacks" entries={Object.entries(STATE_VISUALS)} />
      </div>
    </main>
  );
}
