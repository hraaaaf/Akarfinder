import Image from "next/image";
import { INTENT_VISUALS, PROPERTY_VISUALS, SERVICE_VISUALS, STATE_VISUALS } from "@/lib/brand/visual-assets";

function GallerySection({ title, entries }: { title: string; entries: [string, string][] }) {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0B63CE]">AkarFinder Visual System V1</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0B1F3A]">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {entries.map(([label, src]) => (
          <article key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#F4F8FC]">
              <Image src={src} alt="" fill className="object-contain" sizes="(max-width: 640px) 100vw, 25vw" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-[#0B1F3A]">{label}</h3>
            <p className="mt-1 break-all text-xs text-slate-500">{src}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function VisualSystemDemoPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-14">
        <header className="max-w-3xl">
          <p className="text-sm font-bold text-[#0B63CE]">QA Gallery</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-[#0B1F3A]">AkarFinder Visual System V1</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Validation visuelle de cohérence avant intégration massive. Palette bleu/navy/blanc uniquement. Les City Marks sont exclus jusqu&apos;à validation de fidélité architecturale.
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
