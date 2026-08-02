import { Container } from "@/components/ui/Container";
import { SearchEntryOrchestrator } from "@/components/home/SearchEntryOrchestrator";

const HERO_DESKTOP = "/images/hero/akar-residence-sunset-desktop.webp";
const HERO_MOBILE = "/images/hero/akar-residence-sunset-mobile.webp";

export function GoogleLikeHero() {
  return (
    <section id="recherche" className="relative flex min-h-[68dvh] items-center overflow-hidden bg-[#061027] sm:min-h-[72dvh]">
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

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,16,31,0.82)_0%,rgba(3,16,31,0.58)_48%,rgba(3,16,31,0.22)_100%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#061027]/55 via-transparent to-[#061027]/25" aria-hidden="true" />

      <Container className="relative z-10 w-full px-5 pb-12 pt-[calc(env(safe-area-inset-top)+7rem)] sm:pb-16 sm:pt-36">
        <div className="max-w-[860px]">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-blue-200 sm:text-[12px]">
            Moteur de recherche immobilier multi-sources
          </p>
          <h1 className="mt-4 max-w-[820px] text-[2.45rem] font-extrabold leading-[1.01] tracking-[-0.05em] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.30)] sm:text-[4.25rem] lg:text-[5rem]">
            1er moteur de recherche immobilier au Maroc
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] font-medium leading-6 text-white/82 sm:text-[17px] sm:leading-7">
            Toutes les annonces dans une seule recherche. Comprenez le quartier, filtrez les résultats et consultez les sources originales.
          </p>

          <div className="mt-7 w-full max-w-[860px] sm:mt-9">
            <SearchEntryOrchestrator />
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11.5px] font-bold text-white/78 sm:text-[12.5px]">
            <span>Plusieurs sources</span>
            <span>Doublons regroupés</span>
            <span>Source originale accessible</span>
          </div>
        </div>
      </Container>
    </section>
  );
}
