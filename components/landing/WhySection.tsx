import { MapPinned, Search, TimerReset } from "lucide-react";
import { Container } from "@/components/ui/Container";

const benefits = [
  {
    title: "Rechercher plus intelligemment",
    body: "Une seule recherche explore plusieurs sources.",
    icon: Search,
  },
  {
    title: "Comprendre avant de visiter",
    body: "Quartiers, contexte et informations utiles sont réunis pour mieux comparer.",
    icon: MapPinned,
  },
  {
    title: "Gagner du temps",
    body: "Moins de bruit, moins de doublons et des résultats plus pertinents.",
    icon: TimerReset,
  },
];

export function WhySection() {
  return (
    <section className="overflow-hidden bg-background py-14 sm:py-24 lg:py-28">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:gap-16">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.17em] text-accent sm:text-[11.5px]">
              La différence AkarFinder
            </span>
            <h2 className="mt-3 max-w-[640px] text-[2rem] font-extrabold leading-[1.08] tracking-[-0.04em] text-foreground sm:mt-4 sm:text-[2.75rem]">
              Pourquoi rechercher avec AkarFinder ?
            </h2>
            <p className="mt-4 max-w-[620px] text-[14.5px] leading-7 text-muted-foreground sm:text-[15.5px]">
              Nous ne publions pas simplement des annonces. Nous vous aidons à trouver plus vite le bon bien.
            </p>

            <div className="mt-8 divide-y divide-border/20 border-y border-border/20 sm:mt-10">
              {benefits.map(({ title, body, icon: Icon }) => (
                <article key={title} className="group flex gap-4 py-5 sm:py-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent transition duration-300 group-hover:bg-accent group-hover:text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-extrabold leading-5 tracking-tight text-card-foreground sm:text-[17px]">{title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-6 text-muted-foreground sm:text-[14px]">{body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[560px]" aria-hidden="true">
            <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute -right-10 bottom-6 h-48 w-48 rounded-full bg-[#0b6bcb]/10 blur-3xl" />

            <div className="relative rounded-[2rem] border border-border/20 bg-[linear-gradient(145deg,var(--card),var(--background))] p-4 shadow-[0_28px_90px_rgba(7,27,51,0.14)] sm:p-6">
              <div className="rounded-2xl border border-border/15 bg-background p-4 sm:p-5">
                <div className="flex items-center gap-3 rounded-xl border border-border/20 bg-card px-4 py-3 shadow-sm">
                  <Search className="h-4 w-4 text-accent" />
                  <span className="text-[12.5px] font-semibold text-foreground sm:text-[13px]">Appartement à Agdal</span>
                  <span className="ml-auto rounded-full bg-accent px-3 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-white">Rechercher</span>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    ["Appartement lumineux à Agdal", "Rabat · Agdal", "1 850 000 DH"],
                    ["Appartement proche des commerces", "Rabat · Agdal", "1 920 000 DH"],
                    ["Appartement avec terrasse", "Rabat · Haut Agdal", "2 100 000 DH"],
                  ].map(([title, location, price], index) => (
                    <div key={title} className={`rounded-xl border p-3.5 ${index === 0 ? "border-accent/35 bg-accent/[0.045] shadow-[0_8px_24px_rgba(7,27,51,0.06)]" : "border-border/15 bg-card/70"}`}>
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-16 shrink-0 rounded-lg bg-gradient-to-br from-[#dce9f5] via-[#f6efe5] to-[#d6e3d8]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-extrabold text-foreground sm:text-[12.5px]">{title}</p>
                          <p className="mt-1 text-[10.5px] text-muted-foreground sm:text-[11px]">{location}</p>
                          <p className="mt-2 text-[11.5px] font-extrabold text-accent sm:text-[12px]">{price}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute -left-2 top-[38%] rounded-xl border border-border/15 bg-card px-3 py-2 shadow-[0_12px_35px_rgba(7,27,51,0.14)] sm:-left-8">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-accent">Plus clair</p>
                <p className="mt-0.5 text-[10.5px] font-semibold text-foreground">Les bons repères d’abord</p>
              </div>

              <div className="absolute -right-2 bottom-[18%] rounded-xl border border-border/15 bg-card px-3 py-2 shadow-[0_12px_35px_rgba(7,27,51,0.14)] sm:-right-7">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-accent">Moins de bruit</p>
                <p className="mt-0.5 text-[10.5px] font-semibold text-foreground">Comparez plus vite</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
