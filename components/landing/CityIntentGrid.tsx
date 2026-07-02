import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { CITIES, type CityConfig } from "@/lib/cities";

const FEATURED_CITY_SLUGS = ["casablanca", "marrakech", "rabat", "tanger", "agadir"] as const;

function getCityAriaLabel(city: CityConfig) {
  return `Explorer les biens a ${city.label}`;
}

function CityCard({ city, tall }: { city: CityConfig; tall: boolean }) {
  return (
    <Link
      href={city.href}
      aria-label={getCityAriaLabel(city)}
      title={getCityAriaLabel(city)}
      className={`group relative block w-full overflow-hidden rounded-[1.65rem] border border-[#DDE7F2] bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:shadow-[0_26px_70px_rgba(11,99,206,0.12)] ${tall ? "aspect-[0.78/1]" : "aspect-[16/7]"}`}
    >
      <div
        className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]"
        style={
          city.image
            ? {
                backgroundImage: `url(${city.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center center",
              }
            : undefined
        }
      >
        {!city.image && (
          <div className={`absolute inset-0 bg-gradient-to-br ${city.gradient}`} />
        )}
      </div>

      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, rgba(3,10,24,0.84) 0%, ${city.overlayFrom} 46%, rgba(3,10,24,0.12) 100%)`,
        }}
      />

      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
        <h3 className="text-[1.2rem] font-extrabold leading-snug tracking-[-0.02em] text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)] sm:text-[1.3rem]">
          {city.label}
        </h3>
        <span className="mt-1 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#BFDBFE]">
          {city.tag}
        </span>
        {city.description && (
          <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-[1.45] text-white/72">
            {city.description}
          </p>
        )}
      </div>

      <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-[#0B63CE]/88 text-white shadow-[0_18px_30px_rgba(11,99,206,0.28)] backdrop-blur-sm transition duration-300 group-hover:scale-105">
        <span className="text-[13px]" aria-hidden="true">
          →
        </span>
      </div>
    </Link>
  );
}

export function CityIntentGrid() {
  const featuredCities = FEATURED_CITY_SLUGS
    .map((slug) => CITIES.find((city) => city.slug === slug))
    .filter((city): city is CityConfig => Boolean(city));

  const topRowCities = featuredCities.slice(0, 4);
  const bottomCity = featuredCities[4] ?? null;

  return (
    <section id="villes" className="bg-surface-muted py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-[1240px]">
          <div className="max-w-[760px]">
            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.3em] text-[#0B63CE] sm:text-[0.84rem]">
              Villes principales
            </p>
            <h2 className="mt-4 text-[2.35rem] font-extrabold leading-[0.96] tracking-[-0.04em] text-[#0B1F3A] sm:text-[3.2rem] lg:text-[4rem]">
              L&apos;immobilier dans les grandes villes du Maroc.
            </h2>
            <p className="mt-4 max-w-[680px] text-[1rem] leading-7 text-slate-600 sm:text-[1.05rem]">
              Explorez Casablanca, Marrakech, Rabat, Tanger et Agadir avec des reperes
              plus clairs, des ambiances locales assumees et un acces direct vers la recherche.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:hidden">
            {featuredCities.map((city) => (
              <CityCard key={city.slug} city={city} tall={false} />
            ))}
          </div>

          <div className="mt-10 hidden gap-4 md:grid md:grid-cols-4">
            {topRowCities.map((city) => (
              <CityCard key={city.slug} city={city} tall />
            ))}
            {bottomCity ? (
              <div className="md:col-span-4">
                <CityCard city={bottomCity} tall={false} />
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex justify-start">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full border border-[#60A5FA]/30 bg-white px-5 py-3 text-[0.95rem] font-semibold text-[#0B63CE] shadow-[0_18px_40px_rgba(11,99,206,0.08)] transition hover:border-[#60A5FA]/50 hover:bg-[#EEF6FF]"
            >
              Rechercher sur ces villes
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
              <Link href="/search">Rechercher sur ces villes</Link>
            </li>
          </ul>
        </div>
      </Container>
    </section>
  );
}
