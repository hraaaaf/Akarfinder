import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { CITIES, type CityConfig } from "@/lib/cities";

const FEATURED_CITY_SLUGS = ["casablanca", "rabat", "marrakech", "fes", "tanger", "agadir"] as const;

function getCityAriaLabel(city: CityConfig) {
  return `Explorer les biens à ${city.label}`;
}

function CityCard({ city }: { city: CityConfig }) {
  return (
    <Link
      href={city.href}
      aria-label={getCityAriaLabel(city)}
      title={getCityAriaLabel(city)}
      className="group relative block overflow-hidden rounded-[1.65rem] border border-[#DDE7F2] bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.07)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:shadow-[0_26px_68px_rgba(11,99,206,0.12)] motion-reduce:transform-none sm:p-6"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-[#F4F8FC]">
        <Image
          src={city.mark}
          alt={city.alt}
          fill
          className="object-contain p-4 transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transform-none"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[1.18rem] font-extrabold tracking-[-0.025em] text-[#0B1F3A] sm:text-[1.28rem]">
            {city.label}
          </h3>
          <span className="mt-1 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#0B63CE]">
            {city.tag}
          </span>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#BFDBFE] bg-[#EEF6FF] text-[13px] font-bold text-[#0B63CE] transition-colors group-hover:border-[#60A5FA] group-hover:bg-[#0B63CE] group-hover:text-white" aria-hidden="true">
          →
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-slate-600">
        {city.description}
      </p>
    </Link>
  );
}

export function CityIntentGrid() {
  const featuredCities = FEATURED_CITY_SLUGS
    .map((slug) => CITIES.find((city) => city.slug === slug))
    .filter((city): city is CityConfig => Boolean(city));

  return (
    <section id="villes" className="bg-surface-muted py-16 sm:py-24 lg:py-28">
      <Container>
        <div className="mx-auto max-w-[1240px]">
          <div className="max-w-[760px]">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#0B63CE] sm:text-[0.84rem] sm:tracking-[0.3em]">
              Villes principales
            </p>
            <h2 className="mt-3 text-[2rem] font-extrabold leading-[1] tracking-[-0.04em] text-[#0B1F3A] sm:mt-4 sm:text-[3.2rem] lg:text-[4rem]">
              L&apos;immobilier dans les grandes villes du Maroc.
            </h2>
            <p className="mt-3 max-w-[680px] text-[0.92rem] leading-6 text-slate-600 sm:mt-4 sm:text-[1.05rem] sm:leading-7">
              Six repères visuels AkarFinder, un langage unique, puis un accès direct au moteur de recherche.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3">
            {featuredCities.map((city) => (
              <CityCard key={city.slug} city={city} />
            ))}
          </div>

          <div className="mt-6 flex justify-start sm:mt-8">
            <Link
              href="/immobilier"
              className="inline-flex items-center gap-2 rounded-full border border-[#60A5FA]/30 bg-white px-5 py-3 text-[0.9rem] font-semibold text-[#0B63CE] shadow-[0_18px_40px_rgba(11,99,206,0.08)] transition-colors duration-200 hover:border-[#60A5FA]/50 hover:bg-[#EEF6FF] sm:text-[0.95rem]"
            >
              Voir toutes les villes et quartiers
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <ul className="sr-only">
            {featuredCities.map((city) => (
              <li key={city.slug}>
                <Link href={city.href}>{getCityAriaLabel(city)}</Link>
              </li>
            ))}
            <li>
              <Link href="/immobilier">Voir toutes les villes et quartiers</Link>
            </li>
          </ul>
        </div>
      </Container>
    </section>
  );
}
