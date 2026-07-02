import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import {
  getNeighborhoodCitiesForPages,
  getNeighborhoods,
} from "@/lib/map/neighborhood-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Explorer les quartiers | AkarFinder",
  description:
    "Comparez les quartiers marocains avec des repères prudents, des commodités et un accès direct à la recherche immobilière.",
};

export default function QuartiersPage() {
  const cities = getNeighborhoodCitiesForPages();
  const neighborhoods = getNeighborhoods();

  if (cities.length === 0 || neighborhoods.length === 0) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="dark" />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="max-w-3xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-bronze-500">
            Intelligence quartier
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">
            Explorer les quartiers
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
            Comparez les quartiers avec des repères indicatifs : proximité, commodités, contexte local et accès
            à la recherche immobilière.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/map" className="rounded-full bg-[#071B33] px-5 py-3 text-[13px] font-extrabold text-white">
              Voir sur la carte
            </Link>
            <Link href="/search" className="rounded-full border border-border/20 px-5 py-3 text-[13px] font-extrabold">
              Rechercher dans cette ville
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-8">
          {cities.map(({ city, citySlug, neighborhoods }) => (
            <section key={citySlug} className="rounded-3xl border border-border/15 bg-surface-muted p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-bronze-500">Ville</p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.03em]">{city}</h2>
                </div>
                <Link href={`/search?city=${encodeURIComponent(city)}`} className="text-[13px] font-bold text-bronze-700">
                  Rechercher dans cette ville
                </Link>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {neighborhoods.map((point) => (
                  <article key={point.id} className="rounded-2xl border border-border/15 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-500">{point.city}</p>
                    <h3 className="mt-1 text-[1.15rem] font-extrabold tracking-[-0.03em]">{point.neighborhood}</h3>
                    <p className="mt-3 text-[13px] font-bold text-foreground/80">
                      Repère prix: {point.priceSignal.label}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Confiance: {point.confidence} · {point.benchmark.period}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {point.lifestyleTags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full border border-border/15 px-2.5 py-1 text-[11px] font-semibold">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href={point.searchHref} className="text-[13px] font-extrabold text-bronze-700">
                        Explorer ce quartier
                      </Link>
                      <Link href="/map" className="text-[13px] font-bold text-foreground/70">
                        Retour carte
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
