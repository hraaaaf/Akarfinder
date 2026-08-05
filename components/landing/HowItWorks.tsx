import { MapPin, Search, Scale } from "lucide-react";

import { Container } from "@/components/ui/Container";

const steps = [
  {
    key: "search",
    title: "Cherchez",
    body: "Décrivez votre recherche avec la ville, le quartier, le budget, le type de bien et vos critères essentiels.",
    icon: Search,
  },
  {
    key: "compare",
    title: "Comparez",
    body: "Parcourez des résultats plus clairs avec la source, le niveau d’information, le prix et les offres similaires.",
    icon: Scale,
  },
  {
    key: "decide",
    title: "Décidez",
    body: "Ajoutez le contexte du quartier, les proximités et les informations utiles avant d’organiser une visite.",
    icon: MapPin,
  },
] as const;

function SearchPreview() {
  return (
    <div className="rounded-[1.35rem] border border-[#D9E8F8] bg-[#F8FBFF] p-3 shadow-[0_16px_38px_rgba(18,72,132,0.08)]">
      <div className="flex items-center gap-2 rounded-xl border border-[#D7E6F7] bg-white px-3 py-2.5">
        <Search size={14} className="shrink-0 text-[#0B63CE]" aria-hidden="true" />
        <span className="truncate text-[10.5px] font-semibold text-slate-600">Appartement à Agdal, 2 chambres…</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {['Rabat', 'Acheter', 'Appartement'].map((item) => (
          <span key={item} className="rounded-full border border-[#CFE2F7] bg-white px-2 py-1 text-[9px] font-bold text-[#315E8F]">{item}</span>
        ))}
      </div>
    </div>
  );
}

function ComparePreview() {
  return (
    <div className="rounded-[1.35rem] border border-[#D9E8F8] bg-[#F8FBFF] p-3 shadow-[0_16px_38px_rgba(18,72,132,0.08)]">
      <div className="grid grid-cols-[4.6rem_1fr] gap-3 rounded-xl bg-white p-2.5">
        <div className="rounded-lg bg-gradient-to-br from-[#D8E9FA] via-[#EFF6FD] to-[#BED8F3]" />
        <div>
          <div className="h-2.5 w-3/4 rounded-full bg-[#183D65]/15" />
          <div className="mt-2 h-2 w-1/2 rounded-full bg-[#183D65]/10" />
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[10px] font-black text-[#0B63CE]">1 850 000 DH</span>
            <span className="rounded-full bg-[#EAF4FF] px-2 py-1 text-[8.5px] font-bold text-[#315E8F]">Source visible</span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-xl border border-[#DCE9F6] bg-white px-3 py-2 text-[9px] font-semibold text-slate-500">
        <span>Niveau d’information</span><span className="text-[#0B63CE]">Élevé</span>
      </div>
    </div>
  );
}

function DecidePreview() {
  return (
    <div className="rounded-[1.35rem] border border-[#D9E8F8] bg-[#F8FBFF] p-3 shadow-[0_16px_38px_rgba(18,72,132,0.08)]">
      <div className="relative h-[4.8rem] overflow-hidden rounded-xl bg-[#E9F3FD]">
        <div className="absolute left-0 top-[38%] h-1 w-full rotate-[-7deg] bg-white/90" />
        <div className="absolute left-[38%] top-0 h-full w-1 rotate-[18deg] bg-white/90" />
        <div className="absolute left-[54%] top-[42%] grid h-7 w-7 place-items-center rounded-full bg-[#0B63CE] text-white shadow-[0_8px_20px_rgba(11,99,206,0.35)]">
          <MapPin size={13} aria-hidden="true" />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {['Commerces', 'Mobilité', 'Vie quotidienne'].map((item) => (
          <span key={item} className="rounded-full border border-[#CFE2F7] bg-white px-2 py-1 text-[8.5px] font-bold text-[#315E8F]">{item}</span>
        ))}
      </div>
    </div>
  );
}

function StepPreview({ step }: { step: (typeof steps)[number]['key'] }) {
  if (step === 'search') return <SearchPreview />;
  if (step === 'compare') return <ComparePreview />;
  return <DecidePreview />;
}

export function HowItWorks() {
  return (
    <section className="overflow-hidden bg-surface py-16 sm:py-24 lg:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#2563eb] sm:text-[12px]">Comment ça marche</p>
          <h2 className="mt-3 text-[1.95rem] font-extrabold leading-tight tracking-[-0.04em] text-foreground sm:text-[2.8rem]">
            Votre recherche, simplement
          </h2>
        </div>

        <div className="relative mx-auto mt-10 max-w-[1160px] sm:mt-14">
          <div className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-px bg-gradient-to-r from-[#93C5FD]/25 via-[#2563eb]/55 to-[#93C5FD]/25 md:block" aria-hidden="true" />

          <div className="grid gap-5 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.key}
                  className="group relative rounded-[1.75rem] border border-border/15 bg-card p-5 shadow-[0_14px_46px_rgba(7,27,51,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_65px_rgba(7,27,51,0.12)] sm:p-6"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className="relative z-10 flex items-center gap-3 md:flex-col md:gap-2">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-4 border-surface bg-[#0B63CE] text-white shadow-[0_12px_28px_rgba(11,99,206,0.28)]">
                      <Icon size={21} aria-hidden="true" />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0B63CE] md:mt-1">Étape {index + 1}</span>
                  </div>

                  <div className="mt-5">
                    <StepPreview step={step.key} />
                  </div>

                  <h3 className="mt-5 text-[1.3rem] font-extrabold tracking-[-0.03em] text-card-foreground sm:text-[1.45rem]">{step.title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground sm:text-[14px] sm:leading-7">{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
