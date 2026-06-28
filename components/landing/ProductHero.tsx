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

      {/* Overlays deepblue — plus marqués sur mobile (texte sur image verticale),
          allégés sur desktop pour récupérer du wow visuel. Lisibilité préservée
          via text-shadow du titre/sous-titre + search card opaque. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#03101F]/72 via-[#071B33]/32 to-[#03101F]/80 sm:from-[#03101F]/52 sm:via-[#071B33]/14 sm:to-[#03101F]/64" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#03101F]/55 via-[#071B33]/10 to-transparent sm:from-[#03101F]/42 sm:via-transparent" />
      {/* Voile radial centré (desktop) — concentre le contraste derrière le texte
          tout en gardant les coins lumineux (bâtiment + coucher de soleil) = wow */}
      <div className="absolute inset-0 hidden sm:block" style={{ background: "radial-gradient(ellipse 62% 52% at 50% 44%, rgba(3,16,31,0.46) 0%, transparent 70%)" }} />

      {/* Content */}
      <Container className="relative z-10 w-full pb-12 pt-24 sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-44">
        <div className="mx-auto flex max-w-[820px] flex-col items-center text-center">

          {/* Eyebrow label */}
          <div className="mb-5 opacity-0 animate-[hero-label_0.6s_ease_0.2s_forwards]">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#C2A368] [text-shadow:0_1px_6px_rgba(0,0,0,0.6)] sm:text-[10.5px]">
              1er moteur de recherche immobilier au Maroc
            </span>
          </div>

          {/* Main title */}
          <h1 className="opacity-0 animate-[hero-title_0.8s_cubic-bezier(0.16,1,0.3,1)_0.35s_forwards] text-[1.92rem] font-extrabold leading-[1.04] tracking-[-0.035em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.8)] sm:text-5xl sm:leading-[1.05] sm:tracking-[-0.03em] lg:text-[4.25rem]">
            Tout l&apos;immobilier marocain.{" "}
            <br className="hidden sm:block" />
            Dans un seul endroit.
          </h1>

          {/* Subtitle — hidden on smallest mobile to reduce density */}
          <p className="opacity-0 animate-[hero-sub_0.7s_ease_0.6s_forwards] mt-4 hidden max-w-[640px] text-[1rem] leading-relaxed text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.55),0_2px_14px_rgba(0,0,0,0.6)] sm:mt-5 sm:block sm:text-[1.15rem]">
            Annonces analysées, doublons détectés et repères de fiabilité visibles pour comparer et contacter avec plus de confiance.
          </p>
          {/* Short version on mobile only */}
          <div className="opacity-0 animate-[hero-sub_0.7s_ease_0.6s_forwards] mt-3 max-w-[340px] rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-[2px] sm:hidden">
            <p className="text-[0.95rem] leading-relaxed text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
              Annonces analysées, doublons détectés et repères de fiabilité visibles pour comparer et contacter avec plus de confiance.
            </p>
          </div>
          {/* Search box */}
          <div className="opacity-0 animate-[hero-search_0.8s_cubic-bezier(0.16,1,0.3,1)_0.85s_forwards] mt-8 w-full max-w-[740px]">
            <SearchPanel />
          </div>

          {/* Secondary CTAs — desktop only */}
          <div className="opacity-0 animate-[hero-ctas_0.6s_ease_1.1s_forwards] mt-6 hidden flex-wrap items-center justify-center gap-3 sm:flex">
            <Link
              href="/onboarding"
              className="rounded-full border border-white/25 bg-white/8 px-6 py-2.5 text-[13px] font-semibold text-white/90 backdrop-blur-sm transition hover:border-white/40 hover:bg-white/15 hover:text-white"
            >
              Créer mon dossier acheteur
            </Link>
            <Link
              href="/map"
              className="rounded-full border border-[#C2A368]/45 bg-[#C2A368]/12 px-6 py-2.5 text-[13px] font-semibold text-[#C2A368] backdrop-blur-sm transition hover:border-[#C2A368]/70 hover:bg-[#C2A368]/22"
            >
              Voir la carte
            </Link>
          </div>
        </div>
      </Container>

      {/* Scroll indicator — desktop only */}
      <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 opacity-0 animate-[hero-scroll_0.5s_ease_1.5s_forwards] sm:flex">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Découvrir</span>
        <div className="h-9 w-px bg-gradient-to-b from-white/35 to-transparent" />
      </div>
    </section>
  );
}
