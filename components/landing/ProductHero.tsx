import Link from "next/link";
import { SearchPanel } from "@/components/landing/SearchPanel";
import { Container } from "@/components/ui/Container";

// HERO-IMAGE-REPLACE-1 — art-direction : image verticale sur mobile,
// horizontale sur desktop. <picture> ne télécharge que la source qui matche.
const HERO_DESKTOP = "/images/hero/akar-residence-sunset-desktop.webp";
const HERO_MOBILE = "/images/hero/akar-residence-sunset-mobile.webp";

export function ProductHero() {
  return (
    <section
      id="recherche"
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#071B33]"
    >
      {/* Background image — art-directed (mobile vertical / desktop horizontal) */}
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

      {/* Overlays CLAIR blanc/bleu — photo visible, texte lisible */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/28 to-[rgba(248,250,252,0.15)] sm:from-white/45 sm:via-white/32 sm:to-[rgba(248,250,252,0.18)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/22 via-transparent to-transparent sm:from-white/28 sm:via-transparent" />
      {/* Voile radial bleu très léger au centre (desktop) */}
      <div className="absolute inset-0 hidden sm:block" style={{ background: "radial-gradient(ellipse 65% 55% at 50% 45%, rgba(11,99,206,0.12) 0%, transparent 72%)" }} />

      {/* Content */}
      <Container className="relative z-10 w-full pb-8 pt-16 sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-44">
        <div className="mx-auto flex max-w-[820px] flex-col items-center text-center">

          {/* Eyebrow label */}
          <div className="mb-3 opacity-0 animate-[hero-label_0.6s_ease_0.2s_forwards] sm:mb-5">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE] drop-shadow-[0_1px_3px_rgba(0,0,0,0.2)] sm:text-[10.5px] sm:text-blue-600">
              <span className="sm:hidden">Le moteur immobilier du Maroc</span>
              <span className="hidden sm:inline">Trouvez, comparez et analysez les biens au Maroc</span>
            </span>
          </div>

          {/* Main title */}
          <h1 className="opacity-0 animate-[hero-title_0.8s_cubic-bezier(0.16,1,0.3,1)_0.35s_forwards] text-[1.92rem] font-extrabold leading-[1.04] tracking-[-0.035em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] sm:text-5xl sm:leading-[1.05] sm:tracking-[-0.03em] lg:text-[4.25rem]">
            Le 1er moteur de recherche immobilier au Maroc
          </h1>

          {/* Subtitle — desktop only */}
          <p className="opacity-0 animate-[hero-sub_0.7s_ease_0.6s_forwards] mt-4 hidden max-w-[640px] text-[1rem] leading-relaxed text-white/90 font-medium drop-shadow-[0_1px_6px_rgba(0,0,0,0.2)] sm:mt-5 sm:block sm:text-[1.15rem]">
            Comparez les annonces, les prix et les signaux de fiabilité avant de contacter.
          </p>
          {/* Short version on mobile only */}
          <p className="opacity-0 animate-[hero-sub_0.7s_ease_0.6s_forwards] mt-2.5 max-w-[320px] text-[0.9rem] leading-relaxed text-white/90 font-medium drop-shadow-[0_1px_6px_rgba(0,0,0,0.2)] sm:hidden sm:mt-5">
            Comparez les annonces, les prix et les signaux de fiabilité avant de contacter.
          </p>
          {/* Search box */}
          <div className="opacity-0 animate-[hero-search_0.8s_cubic-bezier(0.16,1,0.3,1)_0.85s_forwards] mt-5 w-full max-w-[740px] sm:mt-8">
            <SearchPanel />
          </div>

          {/* Secondary CTAs — desktop only */}
          <div className="opacity-0 animate-[hero-ctas_0.6s_ease_1.1s_forwards] mt-6 hidden flex-wrap items-center justify-center gap-3 sm:flex">
            <Link
              href="/onboarding"
              className="rounded-full border border-[#0B63CE]/50 bg-[#0B63CE]/12 px-6 py-2.5 text-[13px] font-semibold text-[#0B63CE] backdrop-blur-sm transition hover:border-[#0B63CE]/80 hover:bg-[#0B63CE]/22"
            >
              Créer mon dossier acheteur
            </Link>
            <Link
              href="/map"
              className="rounded-full border border-[#071B33]/40 bg-[#071B33]/8 px-6 py-2.5 text-[13px] font-semibold text-[#071B33] backdrop-blur-sm transition hover:border-[#071B33]/60 hover:bg-[#071B33]/15"
            >
              Voir la carte
            </Link>
          </div>
        </div>
      </Container>

      {/* Scroll indicator — desktop only */}
      <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 opacity-0 animate-[hero-scroll_0.5s_ease_1.5s_forwards] sm:flex">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#071B33]/60">Découvrir</span>
        <div className="h-9 w-px bg-gradient-to-b from-[#0B63CE]/50 to-transparent" />
      </div>
    </section>
  );
}
