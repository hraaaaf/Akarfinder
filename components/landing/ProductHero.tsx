import Image from "next/image";
import Link from "next/link";
import { SearchPanel } from "@/components/landing/SearchPanel";
import { Container } from "@/components/ui/Container";

const heroImage = "/images/hero/casablanca-golden-hour-hero.webp";

export function ProductHero() {
  return (
    <section
      id="recherche"
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#071B33]"
    >
      {/* Background image */}
      <Image
        src={heroImage}
        alt=""
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 object-cover object-[center_right]"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/65" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent" />

      {/* Content */}
      <Container className="relative z-10 w-full pb-12 pt-28 sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-44">
        <div className="mx-auto flex max-w-[820px] flex-col items-center text-center">

          {/* Eyebrow label */}
          <div className="mb-5 opacity-0 animate-[hero-label_0.6s_ease_0.2s_forwards]">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#C2A368] [text-shadow:0_1px_6px_rgba(0,0,0,0.6)] sm:text-[10.5px]">
              Moteur de recherche immobilier au Maroc
            </span>
          </div>

          {/* Main title */}
          <h1 className="opacity-0 animate-[hero-title_0.8s_cubic-bezier(0.16,1,0.3,1)_0.35s_forwards] text-[2.1rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.85)] sm:text-5xl lg:text-[4.25rem]">
            Trouvez votre bien avec&nbsp;plus&nbsp;de&nbsp;confiance.
          </h1>

          {/* Subtitle — hidden on smallest mobile to reduce density */}
          <p className="opacity-0 animate-[hero-sub_0.7s_ease_0.6s_forwards] mt-4 hidden max-w-[640px] text-[1rem] leading-relaxed text-white/82 sm:mt-5 sm:block sm:text-[1.15rem]">
            AkarFinder centralise les annonces, repère les doublons et compare les signaux de marché pour vous aider à décider avant de contacter.
          </p>
          {/* Short version on mobile only */}
          <p className="opacity-0 animate-[hero-sub_0.7s_ease_0.6s_forwards] mt-3 max-w-[340px] text-[0.95rem] leading-relaxed text-white/80 sm:hidden">
            Comparez les annonces. Repérez les doublons. Décidez mieux.
          </p>

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
