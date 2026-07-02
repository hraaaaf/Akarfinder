import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { getNeighborhoodBySlug, getNeighborhoods } from "@/lib/map/neighborhood-data";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ citySlug: string; neighborhoodSlug: string }>;
};

export async function generateStaticParams() {
  return getNeighborhoods().map((point) => ({
    citySlug: point.citySlug,
    neighborhoodSlug: point.neighborhoodSlug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const point = getNeighborhoodBySlug(resolved.citySlug, resolved.neighborhoodSlug);
  if (!point) {
    return {
      title: "Quartier introuvable | AkarFinder",
      description: "Le quartier demandé n'est pas disponible.",
    };
  }
  return {
    title: `${point.neighborhood} ${point.city} — Repères quartier | AkarFinder`,
    description: `Repères indicatifs pour comprendre ${point.neighborhood} à ${point.city} : proximité, commodités et accès à la recherche immobilière.`,
  };
}

export default async function NeighborhoodPage({ params }: PageProps) {
  const resolved = await params;
  const point = getNeighborhoodBySlug(resolved.citySlug, resolved.neighborhoodSlug);
  if (!point) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="dark" />
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="rounded-3xl border border-border/15 bg-surface-muted p-6 sm:p-8">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-bronze-500">{point.city}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">{point.neighborhood}</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            Repères indicatifs pour comprendre le quartier avant de lancer une recherche sur les sources originales.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/15 bg-white p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-500">Repère prix</p>
              <p className="mt-2 text-[18px] font-extrabold">{point.priceSignal.label}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{point.benchmark.period}</p>
            </div>
            <div className="rounded-2xl border border-border/15 bg-white p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-500">Confiance</p>
              <p className="mt-2 text-[18px] font-extrabold">{point.confidence}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">confidence / dataConfidence / benchmarkConfidence</p>
            </div>
            <div className="rounded-2xl border border-border/15 bg-white p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-500">Transparence</p>
              <p className="mt-2 text-[18px] font-extrabold">First-party</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Repères prudents, sans annonces tiers.</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border/15 bg-white p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-500">Proximité / commodités</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {point.proximityHighlights.map((item) => (
                <span key={item} className="rounded-full border border-border/15 px-3 py-1 text-[12px] font-semibold">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border/15 bg-white p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-500">Lifestyle tags</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {point.lifestyleTags.map((tag) => (
                <span key={tag} className="rounded-full bg-surface-muted px-3 py-1 text-[12px] font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={point.searchHref} className="rounded-full bg-[#071B33] px-5 py-3 text-[13px] font-extrabold text-white">
              Rechercher dans ce quartier
            </Link>
            <Link href="/quartiers" className="rounded-full border border-border/20 px-5 py-3 text-[13px] font-extrabold">
              Retour quartiers
            </Link>
            <Link href="/map" className="rounded-full border border-border/20 px-5 py-3 text-[13px] font-extrabold">
              Retour carte
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-border/20 bg-surface/50 p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-500">Méthode / transparence</p>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
              Cette page utilise uniquement la donnée quartier first-party validée. Les repères restent indicatifs et
              doivent être confirmés dans la recherche immobilière.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
