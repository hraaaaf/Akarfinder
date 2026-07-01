import { Container } from "@/components/ui/Container";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";

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
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(3,16,31,0.55)] via-[rgba(3,16,31,0.35)] to-[rgba(6,27,51,0.15)] sm:hidden" />
        <div className="absolute inset-x-0 top-0 h-[34%] bg-gradient-to-b from-[rgba(3,16,31,0.55)] via-[rgba(3,16,31,0.25)] to-transparent sm:hidden" />
        <div className="absolute inset-x-0 bottom-0 h-[26%] bg-gradient-to-t from-[rgba(6,27,51,0.35)] to-transparent sm:hidden" />
        <div className="absolute inset-x-0 top-0 hidden h-[40%] bg-gradient-to-b from-[rgba(3,16,31,0.60)] via-[rgba(3,16,31,0.40)] to-transparent sm:block" />
        <div className="absolute inset-x-0 bottom-0 hidden h-[40%] bg-gradient-to-t from-[rgba(3,16,31,0.50)] to-transparent sm:block" />
        <div
          className="absolute inset-0 hidden sm:block"
          style={{
            background:
              "radial-gradient(ellipse 65% 52% at 50% 43%, rgba(3,16,31,0.50) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 sm:hidden"
          style={{
            background:
              "radial-gradient(ellipse 88% 54% at 50% 37%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 58%, transparent 74%)",
          }}
        />
        <div className="absolute left-1/2 top-[-8%] hidden h-[55%] w-[80%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.16)_0%,transparent_60%)] sm:block" />
        <div className="absolute left-1/2 top-[-4%] h-[42%] w-[95%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(96,165,250,0.16)_0%,transparent_66%)] sm:hidden" />
        <div className="absolute inset-0 bg-[#061027]/8 sm:bg-[#061027]/12" />
      </div>

      <Container className="relative z-10 w-full px-5 pb-12 pt-[calc(env(safe-area-inset-top)+5.5rem)] sm:pb-24 sm:pt-36 lg:pb-28 lg:pt-44">
        <div className="mx-auto flex max-w-[860px] flex-col items-center text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#60A5FA]/28 bg-[rgba(255,255,255,0.68)] px-3.5 py-1.5 backdrop-blur-md sm:mb-7 sm:bg-[#0B63CE]/14 sm:px-4">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#60A5FA]"
              aria-hidden="true"
            />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE] sm:tracking-[0.22em] sm:text-white">
              Trouvez, comparez et analysez les biens au Maroc
            </span>
          </div>

          <h1 className="text-[1.78rem] font-extrabold leading-[1.04] tracking-[-0.038em] text-[#071B33] sm:text-[3.4rem] sm:leading-[1.04] sm:text-white lg:text-[4.1rem]">
            Le{" "}
            <span className="bg-gradient-to-r from-[#0B63CE] via-[#60A5FA] to-[#0B63CE] bg-clip-text text-transparent">
              1er moteur de recherche immobilier
            </span>{" "}
            au Maroc
          </h1>

          <p className="mt-4 max-w-[560px] text-[0.95rem] leading-relaxed text-[#334155] drop-shadow-[0_1px_6px_rgba(0,0,0,0.2)] sm:mt-6 sm:text-[1.1rem] sm:text-white sm:drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <span className="sm:hidden">
              Comparez les annonces, les prix et les signaux de fiabilite avant de
              contacter.
            </span>
            <span className="hidden sm:inline">
              Recherchez, comparez et explorez des biens observes avec sources visibles,
              apercus limites et signaux de fiabilite.
            </span>
          </p>

          <div className="mt-6 w-full sm:mt-11">
            <HomeSearchBar />
          </div>
        </div>
      </Container>

      <div
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
        aria-hidden="true"
      >
        <span className="text-[9.5px] font-bold uppercase tracking-[0.15em] text-white/35">
          Explorer
        </span>
        <div className="h-8 w-px bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </section>
  );
}
