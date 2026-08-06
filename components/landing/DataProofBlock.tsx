import { Container } from "@/components/ui/Container";

const proofPoints = [
  {
    key: "source",
    number: "01",
    title: "Source clairement indiquée",
    description: "Vous savez toujours d’où provient l’information présentée.",
  },
  {
    key: "information",
    number: "02",
    title: "Niveau d’information visible",
    description: "Les éléments disponibles et ceux qui manquent restent faciles à identifier.",
  },
  {
    key: "similar",
    number: "03",
    title: "Résultats similaires mieux organisés",
    description: "Les offres proches sont rapprochées pour faciliter la comparaison et réduire le bruit.",
  },
] as const;

export function DataProofBlock() {
  return (
    <section aria-labelledby="home-data-proof-title" className="overflow-hidden bg-[#071b33] py-14 text-white sm:py-24 lg:py-28">
      <Container>
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end lg:gap-14">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.17em] text-[#efb85b] sm:text-[11.5px]">
                Une lecture plus transparente
              </span>
              <h2 id="home-data-proof-title" className="mt-3 text-[2rem] font-extrabold leading-[1.08] tracking-[-0.04em] text-white sm:mt-4 sm:text-[2.75rem]">
                Des résultats plus clairs pour mieux décider
              </h2>
              <p className="mt-4 max-w-[620px] text-[14.5px] leading-7 text-white/72 sm:text-[15.5px]">
                Chaque résultat indique clairement sa source, son niveau d’information et les éléments qui peuvent encore manquer.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-5 shadow-[0_26px_70px_rgba(0,0,0,0.22)] sm:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#7DD3FC]">Exemple de lecture</p>
                  <p className="mt-2 text-[1.25rem] font-extrabold tracking-[-0.025em] text-white">Appartement · Agdal</p>
                </div>
                <span className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold text-white/75">Informations visibles</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {["Localisation", "Caractéristiques", "Provenance"].map((label) => (
                  <div key={label} className="rounded-xl bg-white/[0.065] px-2.5 py-3.5 text-center">
                    <span className="mx-auto block h-1.5 w-3/4 rounded-full bg-[#60A5FA]/45" />
                    <span className="mt-2.5 block text-[10.5px] font-bold leading-4 text-white/68">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-[12px]">
                <span className="font-semibold text-white/60">Résultats proches regroupés</span>
                <span className="rounded-full bg-[#0B63CE] px-3 py-1.5 font-extrabold text-white">Comparer</span>
              </div>
            </div>
          </div>

          <div className="mt-8 divide-y divide-white/10 border-y border-white/10 lg:mt-12 lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {proofPoints.map((point) => (
              <article key={point.key} className="flex gap-4 px-1 py-5 sm:py-6 lg:px-7 lg:first:pl-0 lg:last:pr-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#efb85b]/35 bg-[#efb85b]/10 text-[12px] font-extrabold text-[#efb85b]">
                  {point.number}
                </span>
                <div>
                  <h3 className="text-[16px] font-extrabold leading-5 tracking-[-0.01em] text-white">{point.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-6 text-white/66">{point.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
