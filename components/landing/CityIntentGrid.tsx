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

function CityLink({ city }: { city: CityConfig }) {
  return (
    <Link
      href={buildCityHref(city)}
      aria-label={`Voir les biens à ${city.label}`}
      data-home-city={city.slug}
      className="group min-w-0 rounded-2xl border border-[#DCE8F5] bg-[#F9FCFF] p-3.5 transition hover:border-[#93C5FD] hover:bg-white hover:shadow-[0_12px_30px_rgba(11,99,206,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 sm:p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[13px] font-extrabold text-[#0B1F3A]">{city.label}</p>
        <ArrowRight size={14} className="shrink-0 text-[#0B63CE] transition group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
      <p className="mt-1.5 line-clamp-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">{city.tag}</p>
    </Link>
  );
}

export function CityIntentGrid() {
  return (
    <section id="villes" data-home-city-layout="compact-v1" className="bg-white py-10 sm:py-14 lg:py-16">
      <Container>
        <div className="mx-auto max-w-[1240px]">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.2em] text-[#0B63CE]">Explorer</p>
              <h2 className="mt-2 text-[1.8rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.35rem]">Villes populaires</h2>
              <p className="mt-2 max-w-[610px] text-[0.88rem] leading-6 text-slate-600 sm:text-[0.96rem]">Entrez par une ville, puis laissez le moteur faire le reste.</p>
            </div>
            <Link href="/immobilier" className="hidden text-[12px] font-extrabold text-[#0B63CE] hover:underline sm:inline-flex">Toutes les villes</Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {FEATURED_CITIES.map((city) => <CityLink key={city.slug} city={city} />)}
          </div>

          <div className="mt-4 sm:hidden">
            <Link href="/immobilier" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#60A5FA]/30 bg-white px-4 py-2.5 text-[0.84rem] font-semibold text-[#0B63CE] shadow-[0_12px_30px_rgba(11,99,206,0.08)]">
              Toutes les villes et quartiers <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
