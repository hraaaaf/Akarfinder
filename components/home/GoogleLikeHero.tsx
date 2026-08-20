import { Container } from "@/components/ui/Container";
import { SearchEntryOrchestrator } from "@/components/home/SearchEntryOrchestrator";

const HERO_DESKTOP = "/images/hero/akar-residence-sunset-desktop.webp";
const HERO_MOBILE = "/images/hero/akar-residence-sunset-mobile.webp";

export function GoogleLikeHero() {
  return (
    <section
      id="recherche"
      aria-labelledby="home-hero-title"
      data-home-hero="p1-a1"
      className="relative flex min-h-[78dvh] items-center justify-center overflow-hidden bg-[#061027] sm:min-h-[78vh] lg:min-h-[700px]"
    >
      <picture>
        <source media="(max-width: 639px)" srcSet={HERO_MOBILE} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_DESKTOP}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </picture>

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(3,16,31,0.65)] via-[rgba(3,16,31,0.43)] to-[rgba(6,27,51,0.28)] sm:hidden" />
        <div className="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-[rgba(3,16,31,0.68)] via-[rgba(3,16,31,0.36)] to-transparent sm:hidden" />
        <div className="absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-t from-[rgba(6,27,51,0.5)] to-transparent sm:hidden" />
        <div className="absolute inset-x-0 top-0 hidden h-[50%] bg-gradient-to-b from-[rgba(3,16,31,0.7)] via-[rgba(3,16,31,0.46)] to-transparent sm:block" />
        <div className="absolute inset-x-0 bottom-0 hidden h-[44%] bg-gradient-to-t from-[rgba(3,16,31,0.58)] to-transparent sm:block" />
        <div
          className="absolute inset-0 hidden sm:block"
          style={{
            background:
              "radial-gradient(ellipse 66% 54% at 50% 43%, rgba(3,16,31,0.64) 0%, rgba(3,16,31,0.3) 56%, transparent 75%)",
          }}
        />
        <div
          className="absolute inset-0 sm:hidden"
          style={{
            background:
              "radial-gradient(ellipse 92% 58% at 50% 39%, rgba(3,16,31,0.32) 0%, rgba(3,16,31,0.1) 58%, transparent 77%)",
          }}
        />
        <div className="absolute inset-0 bg-[#061027]/15 sm:bg-[#061027]/20" />
      </div>

      <Container className="relative z-10 w-full px-5 pb-12 pt-[calc(env(safe-area-inset-top)+5.5rem)] sm:pb-16 sm:pt-28 lg:pb-20 lg:pt-28">
        <div className="mx-auto flex max-w-[940px] flex-col items-center text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-blue-100 sm:text-[11px]">
            Immobilier · Maroc
          </p>

          <h1
            id="home-hero-title"
            className="mt-4 max-w-[860px] text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.05em] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.42)] sm:text-[4rem] lg:text-[5rem]"
          >
            1er moteur de recherche immobilier au Maroc
          </h1>

          <p className="mt-4 max-w-[720px] text-[14px] font-medium leading-6 text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.36)] sm:mt-5 sm:text-[17px] sm:leading-7">
            Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider.
          </p>

          <div className="mt-7 w-full sm:mt-8">
            <SearchEntryOrchestrator />
          </div>
        </div>
      </Container>
    </section>
  );
}
