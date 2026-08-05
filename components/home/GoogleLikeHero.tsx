import { Container } from "@/components/ui/Container";
import { SearchEntryOrchestrator } from "@/components/home/SearchEntryOrchestrator";

const HERO_DESKTOP = "/images/hero/akar-residence-sunset-desktop.webp";
const HERO_MOBILE = "/images/hero/akar-residence-sunset-mobile.webp";

export function GoogleLikeHero() {
  return (
    <section
      id="recherche"
      aria-labelledby="home-hero-title"
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#061027]"
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
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(3,16,31,0.64)] via-[rgba(3,16,31,0.42)] to-[rgba(6,27,51,0.24)] sm:hidden" />
        <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-[rgba(3,16,31,0.68)] via-[rgba(3,16,31,0.34)] to-transparent sm:hidden" />
        <div className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-[rgba(6,27,51,0.50)] to-transparent sm:hidden" />
        <div className="absolute inset-x-0 top-0 hidden h-[50%] bg-gradient-to-b from-[rgba(3,16,31,0.70)] via-[rgba(3,16,31,0.44)] to-transparent sm:block" />
        <div className="absolute inset-x-0 bottom-0 hidden h-[44%] bg-gradient-to-t from-[rgba(3,16,31,0.56)] to-transparent sm:block" />
        <div
          className="absolute inset-0 hidden sm:block"
          style={{
            background:
              "radial-gradient(ellipse 66% 54% at 50% 42%, rgba(3,16,31,0.62) 0%, rgba(3,16,31,0.30) 54%, transparent 74%)",
          }}
        />
        <div className="absolute inset-0 bg-[#061027]/12" />
      </div>

      <Container className="relative z-10 w-full px-5 pb-14 pt-[calc(env(safe-area-inset-top)+6rem)] sm:pb-24 sm:pt-36 lg:pb-28 lg:pt-40">
        <div className="mx-auto flex max-w-[940px] flex-col items-center text-center">
          <h1
            id="home-hero-title"
            className="max-w-[820px] text-[2.15rem] font-extrabold leading-[1.02] tracking-[-0.045em] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.42)] sm:text-[4rem] lg:text-[4.8rem]"
          >
            1er moteur de recherche immobilier au Maroc
          </h1>
          <p className="sr-only">
            Moteur de recherche immobilier. Comprenez le quartier et consultez les sources originales.
          </p>

          <div className="mt-8 w-full sm:mt-10">
            <SearchEntryOrchestrator />
          </div>
        </div>
      </Container>
    </section>
  );
}
