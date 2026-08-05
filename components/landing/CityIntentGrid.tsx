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

function CityCard({
  city,
  selected,
  onSelect,
}: {
  city: CityConfig;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={getCityAriaLabel(city)}
      aria-pressed={selected}
      className={`group relative block w-full overflow-hidden rounded-[2rem] border bg-white p-3 text-left shadow-[0_22px_60px_rgba(11,31,58,0.08)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_28px_70px_rgba(11,99,206,0.13)] motion-reduce:transform-none ${
        selected ? "border-[#0B63CE] ring-4 ring-[#0B63CE]/10" : "border-[#DCE8F5] hover:border-[#93C5FD]"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.55rem] bg-[#EEF6FF]">
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
        <div className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-[14px] border border-white/30 bg-white/90 text-[12px] font-black tracking-[-0.06em] text-[#0B63CE] shadow-[0_12px_28px_rgba(11,31,58,0.16)] backdrop-blur-sm">
          {city.label.slice(0, 2).toUpperCase()}
        </div>
        {selected ? (
          <span className="absolute right-4 top-4 rounded-full bg-[#0B63CE] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-lg">
            Ville choisie
          </span>
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-[1.35rem] font-black tracking-[-0.035em] text-white">{city.label}</h3>
          <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#BFDBFE]">{city.tag}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-2 pb-2 pt-4">
        <p className="line-clamp-2 text-[12px] leading-5 text-slate-600">{city.description}</p>
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] text-[14px] font-black transition-colors ${
            selected ? "bg-[#0B63CE] text-white" : "bg-[#EEF6FF] text-[#0B63CE] group-hover:bg-[#0B63CE] group-hover:text-white"
          }`}
          aria-hidden="true"
        >
          {selected ? "✓" : "→"}
        </span>
      </div>
    </button>
  );
}

export function CityIntentGrid() {
  const featuredCities = useMemo(
    () =>
      FEATURED_CITY_SLUGS.map((slug) => CITIES.find((city) => city.slug === slug)).filter(
        (city): city is CityConfig => Boolean(city),
      ),
    [],
  );

  const [selectedSlug, setSelectedSlug] = useState(featuredCities[0]?.slug ?? "casablanca");
  const selectedCity = featuredCities.find((city) => city.slug === selectedSlug) ?? featuredCities[0];

  return (
    <section id="villes" className="bg-surface-muted py-16 sm:py-24 lg:py-28">
      <Container>
        <div className="mx-auto max-w-[1240px]">
          <div className="max-w-[760px]">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#0B63CE] sm:text-[0.84rem] sm:tracking-[0.3em]">
              Villes et projets
            </p>
            <h2 className="mt-3 text-[2rem] font-extrabold leading-[1] tracking-[-0.04em] text-[#0B1F3A] sm:mt-4 sm:text-[3.2rem] lg:text-[4rem]">
              Explorez l&apos;immobilier selon votre projet
            </h2>
            <p className="mt-3 max-w-[680px] text-[0.92rem] leading-6 text-slate-600 sm:mt-4 sm:text-[1.05rem] sm:leading-7">
              Choisissez une ville, puis le type de recherche qui vous correspond.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3">
            {featuredCities.map((city) => (
              <CityCard
                key={city.slug}
                city={city}
                selected={city.slug === selectedCity?.slug}
                onSelect={() => setSelectedSlug(city.slug)}
              />
            ))}
          </div>

          {selectedCity ? (
            <div className="mt-7 rounded-[2rem] border border-[#DCE8F5] bg-white p-5 shadow-[0_22px_60px_rgba(11,31,58,0.07)] sm:mt-9 sm:p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-[#0B63CE]">Votre projet à</p>
                  <h3 className="mt-1 text-[1.55rem] font-extrabold tracking-[-0.035em] text-[#0B1F3A] sm:text-[2rem]">{selectedCity.label}</h3>
                </div>
                <p className="text-[12px] text-slate-500">Choisissez une intention pour afficher les résultats correspondants.</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {INTENTS.map((intent) => (
                  <Link
                    key={intent.key}
                    href={buildIntentHref(selectedCity, intent.key)}
                    className="group flex min-h-[112px] items-center gap-4 rounded-[1.35rem] border border-[#DCE8F5] bg-[#F8FBFF] p-4 transition-[border-color,background-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-[#93C5FD] hover:bg-white hover:shadow-[0_16px_36px_rgba(11,99,206,0.10)] motion-reduce:transform-none"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-white text-[18px] font-black text-[#0B63CE] shadow-sm" aria-hidden="true">
                      {intent.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-extrabold text-[#0B1F3A]">{intent.label}</span>
                      <span className="mt-1 block text-[11.5px] leading-5 text-slate-500">{intent.description}</span>
                    </span>
                    <span className="ml-auto text-[#0B63CE] transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex justify-start sm:mt-8">
            <Link
              href="/immobilier"
              className="inline-flex items-center gap-2 rounded-full border border-[#60A5FA]/30 bg-white px-5 py-3 text-[0.9rem] font-semibold text-[#0B63CE] shadow-[0_18px_40px_rgba(11,99,206,0.08)] transition-colors duration-200 hover:border-[#60A5FA]/50 hover:bg-[#EEF6FF] sm:text-[0.95rem]"
            >
              Voir toutes les villes et quartiers <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
