"use client";

import { useEffect, useRef, useState } from "react";
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
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="home-data-proof-title"
      className="overflow-hidden bg-[#071b33] py-16 text-white sm:py-24 lg:py-28"
    >
      <Container>
        <div
          className={`mx-auto max-w-[760px] text-center transition-all duration-700 motion-reduce:transition-none ${
            visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#efb85b]">
            Une lecture plus transparente
          </span>
          <h2
            id="home-data-proof-title"
            className="mt-3 text-[1.9rem] font-extrabold tracking-[-0.035em] text-white sm:mt-4 sm:text-[2.65rem]"
          >
            Des résultats plus clairs pour mieux décider
          </h2>
          <p className="mx-auto mt-4 max-w-[690px] text-[13.5px] leading-6 text-white/70 sm:text-[15px] sm:leading-7">
            Chaque résultat indique clairement sa source, son niveau d’information et les éléments qui peuvent encore manquer.
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-[1080px] sm:mt-14 lg:mt-16">
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1f6f8b]/15 blur-3xl lg:block" />

          <div className="relative grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.92fr)_minmax(0,1fr)] lg:gap-8">
            <div className="space-y-4 lg:space-y-6">
              {proofPoints.slice(0, 2).map((point, index) => (
                <article
                  key={point.key}
                  className={`rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-all duration-700 motion-reduce:transition-none sm:p-6 ${
                    visible ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"
                  }`}
                  style={{ transitionDelay: `${120 + index * 100}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#efb85b]/35 bg-[#efb85b]/10 text-[11px] font-extrabold text-[#efb85b]">
                      {point.number}
                    </span>
                    <div>
                      <h3 className="text-[15px] font-extrabold tracking-[-0.01em] text-white sm:text-[16px]">
                        {point.title}
                      </h3>
                      <p className="mt-2 text-[12.5px] leading-5 text-white/65 sm:text-[13px] sm:leading-6">
                        {point.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div
              className={`relative order-first mx-auto w-full max-w-[430px] transition-all duration-700 motion-reduce:transition-none lg:order-none ${
                visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-5 scale-[0.98] opacity-0"
              }`}
              style={{ transitionDelay: "180ms" }}
            >
              <div className="rounded-[28px] border border-white/15 bg-white p-3 shadow-[0_32px_80px_rgba(0,0,0,0.32)] sm:p-4">
                <div className="overflow-hidden rounded-[21px] bg-[#f2eee7]">
                  <div className="relative h-[176px] bg-[linear-gradient(135deg,#c7d8dc_0%,#f4e7d2_52%,#d7c5ae_100%)] sm:h-[205px]">
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#071b33]/55 to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[#071b33] shadow-sm">
                      Exemple de lecture
                    </span>
                    <span className="absolute bottom-4 left-4 rounded-full bg-[#071b33]/90 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      Appartement · Agdal
                    </span>
                  </div>

                  <div className="space-y-4 bg-white p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1f6f8b]">
                          Source indiquée
                        </p>
                        <p className="mt-1.5 text-[18px] font-extrabold tracking-[-0.025em] text-[#071b33]">
                          Résultat immobilier
                        </p>
                      </div>
                      <span className="rounded-full bg-[#edf6f7] px-3 py-1.5 text-[10px] font-extrabold text-[#1f6f8b]">
                        Informations visibles
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {["Localisation", "Caractéristiques", "Provenance"].map((label) => (
                        <div key={label} className="rounded-xl bg-[#f5f6f7] px-2.5 py-3 text-center">
                          <span className="block h-1.5 rounded-full bg-[#1f6f8b]/22" />
                          <span className="mt-2 block text-[9px] font-bold leading-4 text-[#536274]">{label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-[#e8ebee] pt-4">
                      <span className="text-[10.5px] font-bold text-[#687586]">Résultats proches regroupés</span>
                      <span className="rounded-full bg-[#071b33] px-3 py-1.5 text-[10px] font-extrabold text-white">Comparer</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:self-center">
              <article
                className={`rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-all duration-700 motion-reduce:transition-none sm:p-6 ${
                  visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                }`}
                style={{ transitionDelay: "320ms" }}
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#efb85b]/35 bg-[#efb85b]/10 text-[11px] font-extrabold text-[#efb85b]">
                    {proofPoints[2].number}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-extrabold tracking-[-0.01em] text-white sm:text-[16px]">
                      {proofPoints[2].title}
                    </h3>
                    <p className="mt-2 text-[12.5px] leading-5 text-white/65 sm:text-[13px] sm:leading-6">
                      {proofPoints[2].description}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
