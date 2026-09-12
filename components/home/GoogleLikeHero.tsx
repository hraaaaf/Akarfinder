import { SearchEntryOrchestrator } from "@/components/home/SearchEntryOrchestrator";
import { Container } from "@/components/ui/Container";

const HERO_DESKTOP = "/images/hero/akar-residence-sunset-desktop.webp";
const HERO_MOBILE = "/images/hero/akar-residence-sunset-mobile.webp";

export function GoogleLikeHero() {
  return (
    <section
      id="recherche"
      data-home-hero-mode="search-only-v1"
      aria-labelledby="home-hero-title"
      className="relative isolate overflow-hidden bg-[#07162B] text-white"
    >
      <div className="pointer-events-none absolute inset-0 -z-20" aria-hidden="true">
        <picture>
          <source media="(max-width: 639px)" srcSet={HERO_MOBILE} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_DESKTOP}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        </picture>
      </div>
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,16,31,0.80)_0%,rgba(3,16,31,0.58)_54%,rgba(3,16,31,0.36)_100%)]"
        aria-hidden="true"
      />

      <Container>
        <div
          data-home-hero-layout="home-v1"
          className="mx-auto flex min-h-[500px] max-w-[1050px] flex-col items-center justify-center py-12 text-center sm:min-h-[540px] sm:py-16 lg:min-h-[560px]"
        >
          <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-blue-100 sm:text-[11px]">
            Immobilier · Maroc
          </p>

          <h1
            id="home-hero-title"
            className="mt-4 max-w-[980px] text-[2.45rem] font-extrabold leading-[1.01] tracking-[-0.055em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.34)] sm:text-[3.6rem] lg:text-[4.3rem]"
          >
            1er moteur de recherche immobilier au Maroc
          </h1>

          <p className="mt-4 max-w-[720px] text-[14px] font-medium leading-6 text-white/90 sm:text-[16px] sm:leading-7">
            Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider.
          </p>

          <div className="mt-7 w-full max-w-[880px] sm:mt-8">
            <SearchEntryOrchestrator />
          </div>
        </div>
      </Container>
    </section>
  );
}
