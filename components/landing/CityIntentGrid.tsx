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
      className="group relative block overflow-hidden rounded-[2rem] border border-[#DCE8F5] bg-white p-3 shadow-[0_22px_60px_rgba(11,31,58,0.08)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:shadow-[0_28px_70px_rgba(11,99,206,0.13)] motion-reduce:transform-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.55rem] bg-[#EEF6FF]">
        {city.image ? (
          <Image
            src={city.image}
            alt={city.alt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transform-none"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${city.gradient}`} />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,19,38,0.76)_0%,rgba(5,19,38,0.08)_62%)]" />
        <div className="absolute left-4 top-4 h-10 w-10 rounded-[14px] border border-white/30 bg-white/90 shadow-[0_12px_28px_rgba(11,31,58,0.16)] backdrop-blur-sm">
          <span className="grid h-full w-full place-items-center text-[12px] font-black tracking-[-0.06em] text-[#0B63CE]">
            {city.label.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-[1.35rem] font-black tracking-[-0.035em] text-white">{city.label}</h3>
          <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#BFDBFE]">{city.tag}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-2 pb-2 pt-4">
        <p className="line-clamp-2 text-[12px] leading-5 text-slate-600">{city.description}</p>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#EEF6FF] text-[14px] font-black text-[#0B63CE] transition-colors group-hover:bg-[#0B63CE] group-hover:text-white" aria-hidden="true">→</span>
      </div>
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
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#0B63CE] sm:text-[0.84rem] sm:tracking-[0.3em]">Villes principales</p>
            <h2 className="mt-3 text-[2rem] font-extrabold leading-[1] tracking-[-0.04em] text-[#0B1F3A] sm:mt-4 sm:text-[3.2rem] lg:text-[4rem]">L&apos;immobilier dans les grandes villes du Maroc.</h2>
            <p className="mt-3 max-w-[680px] text-[0.92rem] leading-6 text-slate-600 sm:mt-4 sm:text-[1.05rem] sm:leading-7">Des villes représentées par des images réelles, encadrées par le langage graphique AkarFinder. Aucun monument approximatif.</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3">
            {featuredCities.map((city) => <CityCard key={city.slug} city={city} />)}
          </div>

          <div className="mt-6 flex justify-start sm:mt-8">
            <Link href="/immobilier" className="inline-flex items-center gap-2 rounded-full border border-[#60A5FA]/30 bg-white px-5 py-3 text-[0.9rem] font-semibold text-[#0B63CE] shadow-[0_18px_40px_rgba(11,99,206,0.08)] transition-colors duration-200 hover:border-[#60A5FA]/50 hover:bg-[#EEF6FF] sm:text-[0.95rem]">
              Voir toutes les villes et quartiers <span aria-hidden="true">→</span>
            </Link>
          </div>

          <ul className="sr-only">
            {featuredCities.map((city) => <li key={city.slug}><Link href={city.href}>{getCityAriaLabel(city)}</Link></li>)}
            <li><Link href="/immobilier">Voir toutes les villes et quartiers</Link></li>
          </ul>
        </div>
      </Container>
    </section>
  );
}
