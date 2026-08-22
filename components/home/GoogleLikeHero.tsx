import { Container } from "@/components/ui/Container";
import { HomeIntelligencePanel } from "@/components/home/HomeIntelligencePanel";
import { SearchEntryOrchestrator } from "@/components/home/SearchEntryOrchestrator";

const HERO_DESKTOP = "/images/hero/akar-residence-sunset-desktop.webp";
const HERO_MOBILE = "/images/hero/akar-residence-sunset-mobile.webp";

export function GoogleLikeHero() {
  return (
    <section
      id="recherche"
      aria-labelledby="home-hero-title"
      className="overflow-hidden bg-[#F4F8FC] lg:bg-[#061027]"
    >
      <Container className="w-full px-5">
        <div
          data-home-hero-layout="hvr-1"
          className="mx-auto grid max-w-[1320px] gap-0 lg:grid-cols-[minmax(0,1.34fr)_minmax(330px,0.66fr)] lg:gap-8 xl:gap-10"
        >
          <div
            data-home-hero="p1-a1"
            className="relative min-w-0 py-8 text-center sm:py-9 lg:py-12 lg:text-left xl:py-14"
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2 overflow-hidden"
              aria-hidden="true"
            >
              <picture>
                <source media="(max-width: 639px)" srcSet={HERO_MOBILE} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={HERO_DESKTOP}
                  alt=""
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </picture>
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,16,31,0.78)_0%,rgba(3,16,31,0.56)_48%,rgba(3,16,31,0.34)_100%)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-[rgba(3,16,31,0.30)] via-transparent to-[rgba(3,16,31,0.43)]" />
              <div className="absolute inset-0 bg-[#061027]/10" />
            </div>

            <div className="relative z-10">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-blue-100 sm:text-[11px]">
                Immobilier · Maroc
              </p>

              <h1
                id="home-hero-title"
                className="mx-auto mt-3 max-w-[900px] text-[2.35rem] font-extrabold leading-[1.02] tracking-[-0.05em] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.38)] sm:text-[3.25rem] lg:mx-0 lg:mt-4 lg:text-[3.55rem] xl:text-[3.9rem]"
              >
                1er moteur de recherche immobilier au Maroc
              </h1>

              <p className="mx-auto mt-4 max-w-[760px] text-[14px] font-medium leading-6 text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.32)] sm:text-[16px] sm:leading-7 lg:mx-0">
                Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider.
              </p>

              <div className="mt-6 w-full sm:mt-7">
                <SearchEntryOrchestrator />
              </div>
            </div>
          </div>

          <div className="relative z-10 py-5 lg:flex lg:items-center lg:py-12 xl:py-14">
            <HomeIntelligencePanel />
          </div>
        </div>
      </Container>
    </section>
  );
}
