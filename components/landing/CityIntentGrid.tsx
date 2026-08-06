"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Container } from "@/components/ui/Container";
import { CITIES, type CityConfig } from "@/lib/cities";

const FEATURED_CITY_SLUGS = ["casablanca", "rabat", "marrakech", "tanger", "agadir", "fes"] as const;

type IntentKey = "buy" | "rent" | "invest" | "new";

type Intent = {
  key: IntentKey;
  label: string;
  description: string;
  icon: string;
};

const INTENTS: Intent[] = [
  { key: "buy", label: "Acheter", description: "Biens disponibles à l’achat", icon: "⌂" },
  { key: "rent", label: "Louer", description: "Locations dans la ville choisie", icon: "↗" },
  { key: "invest", label: "Investir", description: "Rechercher un projet d’investissement", icon: "◇" },
  { key: "new", label: "Immobilier neuf", description: "Programmes et biens neufs", icon: "+" },
];

function getCityAriaLabel(city: CityConfig) {
  return `Choisir ${city.label}`;
}

function buildIntentHref(city: CityConfig, intent: IntentKey): string {
  const params = new URLSearchParams({ city: city.label });

  if (intent === "buy") params.set("transaction_type", "buy");
  if (intent === "rent") params.set("transaction_type", "rent");
  if (intent === "invest") params.set("q", `investissement ${city.label}`);
  if (intent === "new") params.set("q", `immobilier neuf ${city.label}`);

  return `/search?${params.toString()}`;
}

function CityCard({ city, selected, onSelect }: { city: CityConfig; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={getCityAriaLabel(city)}
      aria-pressed={selected}
      className={`group relative block w-full overflow-hidden rounded-[1.55rem] border bg-white p-2.5 text-left shadow-[0_18px_44px_rgba(11,31,58,0.08)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_70px_rgba(11,99,206,0.13)] motion-reduce:transform-none sm:rounded-[2rem] sm:p-3 ${
        selected ? "border-[#0B63CE] ring-4 ring-[#0B63CE]/10" : "border-[#DCE8F5] hover:border-[#93C5FD]"
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-[1.2rem] bg-[#EEF6FF] sm:aspect-[4/3] sm:rounded-[1.55rem]">
        {city.image ? (
          <div
            role="img"
            aria-label={city.alt}
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transform-none"
            style={{ backgroundImage: `url(${city.image})` }}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${city.gradient}`} />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,19,38,0.78)_0%,rgba(5,19,38,0.08)_62%)]" />
        <div className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-[11px] border border-white/30 bg-white/90 text-[10px] font-black tracking-[-0.06em] text-[#0B63CE] shadow-[0_12px_28px_rgba(11,31,58,0.16)] backdrop-blur-sm sm:left-4 sm:top-4 sm:h-10 sm:w-10 sm:rounded-[14px] sm:text-[12px]">
          {city.label.slice(0, 2).toUpperCase()}
        </div>
        {selected ? (
          <span className="absolute right-3 top-3 rounded-full bg-[#0B63CE] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg sm:right-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-[10px]">
            Ville choisie
          </span>
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <h3 className="text-[1.2rem] font-black tracking-[-0.035em] text-white sm:text-[1.35rem]">{city.label}</h3>
          <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-[#BFDBFE] sm:text-[10px] sm:tracking-[0.16em]">{city.tag}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1.5 pb-1 pt-3 sm:gap-4 sm:px-2 sm:pb-2 sm:pt-4">
        <p className="line-clamp-1 text-[12.5px] leading-5 text-slate-600 sm:line-clamp-2 sm:text-[12px]">{city.description}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[12px] text-[13px] font-black transition-colors sm:h-10 sm:w-10 sm:rounded-[14px] sm:text-[14px] ${selected ? "bg-[#0B63CE] text-white" : "bg-[#EEF6FF] text-[#0B63CE] group-hover:bg-[#0B63CE] group-hover:text-white"}`} aria-hidden="true">
          {selected ? "✓" : "→"}
        </span>
      </div>
    </button>
  );
}

export function CityIntentGrid() {
  const featuredCities = useMemo(
    () => FEATURED_CITY_SLUGS.map((slug) => CITIES.find((city) => city.slug === slug)).filter((city): city is CityConfig => Boolean(city)),
    [],
  );

  const [selectedSlug, setSelectedSlug] = useState(featuredCities[0]?.slug ?? "casablanca");
  const selectedCity = featuredCities.find((city) => city.slug === selectedSlug) ?? featuredCities[0];

  return (
    <section id="villes" className="bg-surface-muted py-12 sm:py-24 lg:py-28">
      <Container>
        <div className="mx-auto max-w-[1240px]">
          <div className="max-w-[760px]">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.22em] text-[#0B63CE] sm:text-[0.84rem] sm:tracking-[0.3em]">Villes et projets</p>
            <h2 className="mt-3 text-[2rem] font-extrabold leading-[1.03] tracking-[-0.04em] text-[#0B1F3A] sm:mt-4 sm:text-[3.2rem] lg:text-[4rem]">Explorez l&apos;immobilier selon votre projet</h2>
            <p className="mt-3 max-w-[680px] text-[0.95rem] leading-6 text-slate-600 sm:mt-4 sm:text-[1.05rem] sm:leading-7">Choisissez une ville, puis le type de recherche qui vous correspond.</p>
          </div>

          <div className="-mx-4 mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:mt-10 lg:grid-cols-3">
            {featuredCities.map((city) => (
              <div key={city.slug} className="w-[82vw] max-w-[315px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                <CityCard city={city} selected={city.slug === selectedCity?.slug} onSelect={() => setSelectedSlug(city.slug)} />
              </div>
            ))}
          </div>

          {selectedCity ? (
            <div className="mt-4 rounded-[1.55rem] border border-[#DCE8F5] bg-white p-4 shadow-[0_18px_44px_rgba(11,31,58,0.07)] sm:mt-9 sm:rounded-[2rem] sm:p-7">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Votre projet à</p>
                  <h3 className="mt-1 text-[1.45rem] font-extrabold tracking-[-0.035em] text-[#0B1F3A] sm:text-[2rem]">{selectedCity.label}</h3>
                </div>
                <p className="hidden text-[12px] text-slate-500 sm:block">Choisissez une intention pour afficher les résultats correspondants.</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3 lg:grid-cols-4">
                {INTENTS.map((intent) => (
                  <Link key={intent.key} href={buildIntentHref(selectedCity, intent.key)} className="group flex min-h-[92px] flex-col items-start rounded-[1.15rem] border border-[#DCE8F5] bg-[#F8FBFF] p-3.5 transition-[border-color,background-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-[#93C5FD] hover:bg-white hover:shadow-[0_16px_36px_rgba(11,99,206,0.10)] motion-reduce:transform-none sm:min-h-[112px] sm:flex-row sm:items-center sm:gap-4 sm:rounded-[1.35rem] sm:p-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-white text-[16px] font-black text-[#0B63CE] shadow-sm sm:h-11 sm:w-11 sm:rounded-[14px] sm:text-[18px]" aria-hidden="true">{intent.icon}</span>
                    <span className="mt-2 min-w-0 sm:mt-0">
                      <span className="block text-[13px] font-extrabold text-[#0B1F3A] sm:text-[14px]">{intent.label}</span>
                      <span className="mt-1 hidden text-[11.5px] leading-5 text-slate-500 sm:block">{intent.description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex justify-start sm:mt-8">
            <Link href="/immobilier" className="inline-flex items-center gap-2 rounded-full border border-[#60A5FA]/30 bg-white px-4 py-2.5 text-[0.88rem] font-semibold text-[#0B63CE] shadow-[0_18px_40px_rgba(11,99,206,0.08)] transition-colors duration-200 hover:border-[#60A5FA]/50 hover:bg-[#EEF6FF] sm:px-5 sm:py-3 sm:text-[0.95rem]">
              Voir toutes les villes et quartiers <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
