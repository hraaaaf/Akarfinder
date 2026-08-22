import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { CITIES, type CityConfig } from "@/lib/cities";

const FEATURED_CITY_SLUGS = ["casablanca", "rabat", "marrakech", "tanger", "agadir", "fes"] as const;

const FEATURED_CITIES = FEATURED_CITY_SLUGS.map((slug) => CITIES.find((city) => city.slug === slug)).filter(
  (city): city is CityConfig => Boolean(city),
);

function buildCityHref(city: CityConfig): string {
  const params = new URLSearchParams({ city: city.label });
  return `/search?${params.toString()}`;
}

function CityCard({ city }: { city: CityConfig }) {
  return (
    <Link
      href={buildCityHref(city)}
      aria-label={`Voir les biens à ${city.label}`}
      data-hvr2-city-card={city.slug}
      className="group block overflow-hidden rounded-[1.35rem] border border-[#DCE8F5] bg-white p-2 text-left shadow-[0_12px_34px_rgba(11,31,58,0.07)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:shadow-[0_22px_52px_rgba(11,99,206,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 motion-reduce:transform-none sm:rounded-[1.5rem] sm:p-2.5"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.05rem] bg-[#EEF6FF] sm:rounded-[1.15rem]">
        {city.image ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.035] motion-reduce:transform-none"
            style={{ backgroundImage: `url(${city.image})` }}
          />
        ) : (
          <div aria-hidden="true" className={`absolute inset-0 bg-gradient-to-br ${city.gradient}`} />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,19,38,0.88)_0%,rgba(5,19,38,0.14)_58%,rgba(5,19,38,0.02)_100%)]" />

        <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
          <h3 className="text-[1.1rem] font-black tracking-[-0.035em] text-white sm:text-[1.18rem]">{city.label}</h3>
          <span className="mt-1 block line-clamp-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#D7E9FF] sm:text-[9.5px]">
            {city.tag}
          </span>
        </div>
      </div>

      <div className="flex min-h-11 items-center justify-between gap-2 px-1.5 pb-1 pt-2.5 sm:px-2 sm:pt-3">
        <span className="text-[11.5px] font-extrabold text-[#0B1F3A] sm:text-[12px]">Voir les biens</span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#EEF6FF] text-[#0B63CE] transition-colors group-hover:bg-[#0B63CE] group-hover:text-white" aria-hidden="true">
          <ArrowRight size={14} strokeWidth={2.3} />
        </span>
      </div>
    </Link>
  );
}

export function CityIntentGrid() {
  return (
    <section id="villes" data-hvr2-city-grid="direct" className="bg-surface-muted py-10 sm:py-14 lg:py-16">
      <Container>
        <div className="mx-auto max-w-[1240px]">
          <div className="flex items-end justify-between gap-5">
            <div className="max-w-[720px]">
              <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.2em] text-[#0B63CE]">Destinations</p>
              <h2 className="mt-2 text-[1.9rem] font-extrabold leading-[1.04] tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.55rem] lg:text-[3rem]">
                Explorer le Maroc
              </h2>
              <p className="mt-2.5 max-w-[660px] text-[0.9rem] leading-6 text-slate-600 sm:text-[0.98rem]">
                Choisissez une ville pour voir directement les biens disponibles, puis affinez votre recherche dans les résultats.
              </p>
            </div>

            <Link
              href="/immobilier"
              className="hidden shrink-0 items-center gap-1.5 text-[12px] font-extrabold text-[#0B63CE] hover:underline sm:inline-flex"
            >
              Voir toutes les villes <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
            </Link>
          </div>

          <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3.5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6 lg:gap-3">
            {FEATURED_CITIES.map((city) => (
              <div key={city.slug} className="w-[66vw] max-w-[245px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                <CityCard city={city} />
              </div>
            ))}
          </div>

          <div className="mt-4 sm:hidden">
            <Link
              href="/immobilier"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#60A5FA]/30 bg-white px-4 py-2.5 text-[0.84rem] font-semibold text-[#0B63CE] shadow-[0_12px_30px_rgba(11,99,206,0.08)]"
            >
              Voir toutes les villes et quartiers <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
