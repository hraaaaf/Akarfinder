import Link from "next/link";
import { Container } from "@/components/ui/Container";

const points = [
  { title: "Quartier lisible", body: "Repères de proximité indicatifs pour situer le bien sans être sur place." },
  { title: "Source visible", body: "L'origine du résultat et son niveau d'information restent affichés clairement." },
  { title: "Repères indicatifs", body: "Repère marché du quartier quand les données nécessaires sont disponibles." },
  { title: "Parcours adapté", body: "Source originale ou parcours AkarFinder selon la nature réelle du résultat." },
  { title: "Décision plus claire", body: "Prix, prix/m², contexte et informations disponibles réunis sans inventer les données manquantes." },
];

function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function MreTrustSection() {
  return (
    <section className="bg-background py-12 sm:py-16">
      <Container>
        <div className="overflow-hidden rounded-3xl border border-border/15 bg-card">
          <div className="grid gap-0 lg:grid-cols-[1fr_1.3fr]">
            <div className="flex flex-col justify-center p-6 sm:p-10">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#7c3aed]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c3aed] sm:text-[12px]">
                Pensé pour les MRE
              </span>
              <h2 className="mt-3 text-[1.8rem] font-bold leading-tight tracking-[-0.03em] text-card-foreground sm:mt-4 sm:text-[2.3rem]">
                Décider à distance avec plus de contexte.
              </h2>
              <p className="mt-3 text-[13.5px] leading-6 text-muted-foreground sm:mt-4 sm:text-[15px] sm:leading-7">
                AkarFinder réunit les repères disponibles, garde les sources visibles et aide à structurer votre projet avant de comparer.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:items-center">
                <Link href="/compagnon" className="w-fit rounded-xl bg-[#7c3aed] px-5 py-3 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(124,58,237,0.25)] transition hover:bg-[#6d28d9] sm:text-[14px]">
                  Construire Mon Projet →
                </Link>
                <Link href="/search?mre=true" className="w-fit rounded-xl border border-[#7c3aed]/30 px-5 py-3 text-[13px] font-bold text-[#7c3aed] transition hover:bg-[#7c3aed]/10 sm:text-[14px]">
                  Explorer les biens →
                </Link>
              </div>
            </div>

            <div className="grid content-center gap-2.5 border-t border-border/12 p-6 sm:grid-cols-2 sm:gap-3 sm:p-10 lg:border-l lg:border-t-0">
              {points.map((pt, index) => (
                <div key={pt.title} className={`${index >= 3 ? "hidden sm:block" : "block"} rounded-xl border border-border/15 bg-surface p-3.5 shadow-sm sm:p-4`}>
                  <div className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#7c3aed]/15"><Check /></span>
                    <p className="text-[13px] font-bold text-card-foreground sm:text-[14px]">{pt.title}</p>
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-muted-foreground sm:mt-1.5 sm:text-[13px] sm:leading-6">{pt.body}</p>
                </div>
              ))}
              <p className="text-[11px] leading-5 text-muted-foreground sm:hidden">
                D'autres repères peuvent être affichés quand les données sont disponibles.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
