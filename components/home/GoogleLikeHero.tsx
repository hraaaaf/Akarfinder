import { Container } from "@/components/ui/Container";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";

export function GoogleLikeHero() {
  return (
    <section
      id="recherche"
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#061027]"
    >
      {/* Background ambient halos */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Top bronze halo */}
        <div className="absolute left-1/2 top-[-10%] h-[65%] w-[90%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(155,120,56,0.10)_0%,transparent_62%)]" />
        {/* Center focus shadow */}
        <div className="absolute inset-x-0 top-[25%] h-[50%] bg-[radial-gradient(ellipse_72%_60%_at_50%_50%,rgba(3,10,24,0.72)_0%,transparent_75%)]" />
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-[#040d1a] to-transparent" />
      </div>

      {/* Content */}
      <Container className="relative z-10 w-full px-5 pb-16 pt-28 sm:pb-24 sm:pt-36 lg:pb-28 lg:pt-44">
        <div className="mx-auto flex max-w-[860px] flex-col items-center text-center">

          {/* Eyebrow pill */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#C2A368]/22 bg-[#C2A368]/10 px-4 py-1.5 backdrop-blur-sm">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C2A368]"
              aria-hidden="true"
            />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#C2A368]">
              Moteur de recherche immobilier — Maroc
            </span>
          </div>

          {/* H1 */}
          <h1 className="text-[1.9rem] font-extrabold leading-[1.06] tracking-[-0.032em] text-white sm:text-[3.4rem] sm:leading-[1.04] lg:text-[4.1rem]">
            Le moteur de recherche{" "}
            <span className="bg-gradient-to-r from-[#C2A368] via-[#e0c06a] to-[#C2A368] bg-clip-text text-transparent">
              immobilier intelligent
            </span>{" "}
            au Maroc
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-[600px] text-[0.98rem] leading-relaxed text-white/48 sm:mt-6 sm:text-[1.1rem]">
            Recherchez, comparez et explorez des biens observés avec sources
            visibles, aperçus limités et signaux de fiabilité.
          </p>

          {/* Search bar — the centerpiece */}
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
        <span className="text-[9.5px] font-bold uppercase tracking-[0.15em] text-white/25">
          Explorer
        </span>
        <div className="h-8 w-px bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </section>
  );
}
