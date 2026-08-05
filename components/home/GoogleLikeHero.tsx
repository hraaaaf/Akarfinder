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
              "radial-gradient(ellipse 70% 58% at 50% 43%, rgba(3,16,31,0.58) 0%, transparent 72%)",
          }}
        />
        <div className="absolute inset-0 bg-[#061027]/12" />
      </div>

      <Container className="relative z-10 w-full px-5 pb-14 pt-[calc(env(safe-area-inset-top)+6rem)] sm:pb-24 sm:pt-36 lg:pb-28 lg:pt-40">
        <div className="mx-auto flex max-w-[940px] flex-col items-center text-center">
          <p className="mb-4 inline-flex rounded-full border border-white/22 bg-black/12 px-3.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-[#BFDBFE] backdrop-blur-sm sm:mb-5 sm:text-[11.5px]">
            Recherche immobilière au Maroc
          </p>

          <h1
            id="home-hero-title"
            className="max-w-[900px] text-[2.2rem] font-extrabold leading-[1.02] tracking-[-0.045em] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.32)] sm:text-[3.8rem] lg:text-[4.7rem]"
          >
            Trouvez le bon bien, avec moins de bruit
          </h1>

          <p className="mt-4 max-w-[700px] text-[14px] font-medium leading-6 text-white/82 drop-shadow-[0_2px_12px_rgba(0,0,0,0.32)] sm:mt-5 sm:text-[17px] sm:leading-7">
            Recherchez plusieurs origines en un seul endroit, comparez les informations disponibles et gardez la source visible.
          </p>

          <div className="mt-7 w-full sm:mt-9">
            <SearchEntryOrchestrator />
          </div>
        </div>
      </Container>
    </section>
  );
}
