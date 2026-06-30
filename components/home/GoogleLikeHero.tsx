import { Container } from "@/components/ui/Container";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";

const HERO_DESKTOP = "/images/hero/akar-residence-sunset-desktop.webp";
const HERO_MOBILE  = "/images/hero/akar-residence-sunset-mobile.webp";

export function GoogleLikeHero() {
  return (
    <section
      id="recherche"
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#061027]"
    >
      {/* ── Photo premium background — art-directed ── */}
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

      {/* ── Overlays — lisibilité sans tuer la photo ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Top dark pour header */}
        <div className="absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-[#03101F]/80 via-[#061027]/40 to-transparent" />
        {/* Bottom vignette */}
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-[#040d1a]/90 to-transparent" />
        {/* Voile radial centré — concentre lisibilité derrière titre+search */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 75% 58% at 50% 42%, rgba(3,10,24,0.72) 0%, transparent 72%)",
          }}
        />
        {/* Halo bronze subtil — cohérence brand */}
        <div className="absolute left-1/2 top-[-8%] h-[55%] w-[80%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(155,120,56,0.08)_0%,transparent_60%)]" />
        {/* Léger voile global — évite que la photo brûle le texte */}
        <div className="absolute inset-0 bg-[#061027]/38" />
      </div>

      {/* ── Content ── */}
      <Container className="relative z-10 w-full px-5 pb-16 pt-28 sm:pb-24 sm:pt-36 lg:pb-28 lg:pt-44">
        <div className="mx-auto flex max-w-[860px] flex-col items-center text-center">

          {/* Eyebrow pill */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#C2A368]/22 bg-[#C2A368]/10 px-4 py-1.5 backdrop-blur-sm">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C2A368]"
              aria-hidden="true"
            />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#C2A368] [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
              Moteur de recherche immobilier — Maroc
            </span>
          </div>

          {/* H1 */}
          <h1 className="text-[1.9rem] font-extrabold leading-[1.06] tracking-[-0.032em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.8)] sm:text-[3.4rem] sm:leading-[1.04] lg:text-[4.1rem]">
            Le moteur de recherche{" "}
            <span className="bg-gradient-to-r from-[#C2A368] via-[#e0c06a] to-[#C2A368] bg-clip-text text-transparent">
              immobilier intelligent
            </span>{" "}
            au Maroc
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-[600px] text-[0.98rem] leading-relaxed text-white/70 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] sm:mt-6 sm:text-[1.1rem]">
            Recherchez, comparez et explorez des biens observés avec sources
            visibles, aperçus limités et signaux de fiabilité.
          </p>

          {/* Search bar — centrepiece */}
          <div className="mt-9 w-full sm:mt-11">
            <HomeSearchBar />
          </div>
        </div>
      </Container>

      {/* Scroll indicator — desktop only */}
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
