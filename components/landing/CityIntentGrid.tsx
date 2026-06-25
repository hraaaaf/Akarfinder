import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { CITIES, type CityConfig } from "@/lib/cities";

const COLLAGE_IMAGE = "/images/cities/immobilier-dans-les-grandes-villes-du-maroc.png";

type CityZone = {
  slug: CityConfig["slug"];
  left: string;
  top: string;
  width: string;
  height: string;
};

const collageZones: CityZone[] = [
  { slug: "casablanca", left: "6.6%", top: "15.6%", width: "20.6%", height: "45.2%" },
  { slug: "marrakech", left: "28.5%", top: "15.4%", width: "20.9%", height: "45.4%" },
  { slug: "rabat", left: "50.4%", top: "15.4%", width: "20.7%", height: "45.4%" },
  { slug: "tanger", left: "72.2%", top: "15.4%", width: "20.7%", height: "45.4%" },
  { slug: "agadir", left: "17.4%", top: "62.6%", width: "64.1%", height: "26.2%" },
];

function getCityAriaLabel(city: CityConfig) {
  return `Explorer les biens a ${city.label}`;
}

export function CityIntentGrid() {
  return (
    <section id="villes" className="bg-[#EFEBE0] py-20 sm:py-28">
      <Container>
        <div className="sr-only">
          <h2>L&apos;immobilier dans les grandes villes du Maroc.</h2>
          <p>
            Explorez Casablanca, Marrakech, Rabat, Tanger et Agadir
            depuis un visuel premium cliquable.
          </p>
        </div>

        <div className="hidden md:block">
          <div className="mx-auto max-w-[1240px]">
            <div className="relative overflow-hidden rounded-[2rem] shadow-[0_24px_80px_rgba(155,120,56,0.18)]">
              <Image
                src={COLLAGE_IMAGE}
                alt="Visuel premium des grandes villes du Maroc : Casablanca, Marrakech, Rabat, Tanger et Agadir."
                width={1448}
                height={1086}
                priority={false}
                className="h-auto w-full"
                sizes="(min-width: 1280px) 1240px, (min-width: 768px) 92vw, 100vw"
              />

              {collageZones.map((zone) => {
                const city = CITIES.find((item) => item.slug === zone.slug);
                if (!city) return null;

                return (
                  <Link
                    key={city.slug}
                    href={city.href}
                    aria-label={getCityAriaLabel(city)}
                    title={getCityAriaLabel(city)}
                    className="group absolute block cursor-pointer rounded-[1.6rem] transition focus-visible:rounded-[1.6rem]"
                    style={{
                      left: zone.left,
                      top: zone.top,
                      width: zone.width,
                      height: zone.height,
                    }}
                  >
                    <span className="absolute inset-0 rounded-[1.6rem] border border-transparent bg-transparent transition duration-300 group-hover:border-white/35 group-hover:bg-white/[0.04]" />
                    <span className="absolute inset-0 rounded-[1.6rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0),0_18px_28px_rgba(0,0,0,0)] transition duration-300 group-hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_18px_28px_rgba(0,0,0,0.18)]" />
                  </Link>
                );
              })}

              <Link
                href="/search"
                aria-label="Voir les biens analyses"
                title="Voir les biens analyses"
                className="group absolute left-1/2 top-[94.1%] block h-[6.1%] w-[21.8%] min-h-[46px] min-w-[210px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full max-[1180px]:min-w-[180px]"
              >
                <span className="absolute inset-0 rounded-full border border-transparent bg-transparent transition duration-300 group-hover:border-[#9B7838]/45 group-hover:bg-[#9B7838]/10" />
              </Link>
            </div>

            <ul className="sr-only">
              {CITIES.map((city) => (
                <li key={city.slug}>
                  <Link href={city.href}>{getCityAriaLabel(city)}</Link>
                </li>
              ))}
              <li>
                <Link href="/search">Voir les biens analyses</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="md:hidden">
          <div className="mb-12">
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#9B7838]">
              Villes principales
            </span>
            <h2 className="mt-4 text-[2rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#071B33]">
              L&apos;immobilier dans les grandes villes du Maroc.
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {CITIES.slice(0, 4).map((city) => (
              <CityCard key={city.slug} city={city} tall />
            ))}
            <div className="col-span-2">
              <CityCard city={CITIES[4]} tall={false} />
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full border border-[#9B7838]/50 bg-white px-8 py-3 text-[14px] font-bold text-[#9B7838] shadow-[0_2px_12px_rgba(155,120,56,0.12)] transition hover:border-[#9B7838] hover:bg-[#fef8ed] hover:shadow-[0_4px_20px_rgba(155,120,56,0.2)]"
            >
              Voir les biens analyses →
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

function CityCard({ city, tall }: { city: CityConfig; tall: boolean }) {
  return (
    <Link
      href={city.href}
      aria-label={getCityAriaLabel(city)}
      title={getCityAriaLabel(city)}
      className={`block w-full group relative overflow-hidden rounded-2xl ${tall ? "aspect-[3/4]" : "aspect-[16/7]"}`}
    >
      <div
        className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
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
          background: `linear-gradient(to top, rgba(0,0,0,0.88) 0%, ${city.overlayFrom} 45%, rgba(0,0,0,0.10) 100%)`,
        }}
      />

      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
        <h3 className="text-[1.2rem] font-extrabold leading-snug tracking-[-0.02em] text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] sm:text-[1.3rem]">
          {city.label}
        </h3>
        <span className="mt-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/65">
          {city.tag}
        </span>
        {city.description && (
          <p className="mt-1.5 text-[11.5px] leading-[1.45] text-white/55 line-clamp-2">
            {city.description}
          </p>
        )}
      </div>

      <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
        <span className="text-[13px] text-white">→</span>
      </div>
    </Link>
  );
}
