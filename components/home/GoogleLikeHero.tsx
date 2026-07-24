import { Container } from "@/components/ui/Container";
import { SearchEntryOrchestrator } from "@/components/home/SearchEntryOrchestrator";

const HERO_DESKTOP = "/images/hero/akar-residence-sunset-desktop.webp";
const HERO_MOBILE = "/images/hero/akar-residence-sunset-mobile.webp";

export function GoogleLikeHero() {
  return (
    <section
      id="recherche"
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
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(3,16,31,0.58)] via-[rgba(3,16,31,0.38)] to-[rgba(6,27,51,0.18)] sm:hidden" />
        <div className="absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-[rgba(3,16,31,0.62)] via-[rgba(3,16,31,0.30)] to-transparent sm:hidden" />
        <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-[rgba(6,27,51,0.42)] to-transparent sm:hidden" />
        <div className="absolute inset-x-0 top-0 hidden h-[46%] bg-gradient-to-b from-[rgba(3,16,31,0.66)] via-[rgba(3,16,31,0.42)] to-transparent sm:block" />
        <div className="absolute inset-x-0 bottom-0 hidden h-[42%] bg-gradient-to-t from-[rgba(3,16,31,0.52)] to-transparent sm:block" />
        <div
          className="absolute inset-0 hidden sm:block"
          style={{
            background:
              "radial-gradient(ellipse 68% 56% at 50% 44%, rgba(3,16,31,0.52) 0%, transparent 72%)",
          }}
        />
        <div
          className="absolute inset-0 sm:hidden"
          style={{
            background:
              "radial-gradient(ellipse 92% 58% at 50% 40%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.03) 58%, transparent 76%)",
          }}
        />
        <div className="absolute inset-0 bg-[#061027]/10 sm:bg-[#061027]/14" />
      </div>

      <Container className="relative z-10 w-full px-5 pb-14 pt-[calc(env(safe-area-inset-top)+6rem)] sm:pb-24 sm:pt-36 lg:pb-28 lg:pt-44">
        <div className="mx-auto flex max-w-[920px] flex-col items-center text-center">
          <h1 className="max-w-[880px] text-[2.15rem] font-extrabold leading-[1.02] tracking-[-0.045em] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.30)] sm:text-[4rem] lg:text-[5rem]">
            1er moteur de recherche immobilier au Maroc
          </h1>

          <div className="mt-8 w-full sm:mt-10">
            <SearchEntryOrchestrator />
          </div>
        </div>
      </Container>
    </section>
  );
}
