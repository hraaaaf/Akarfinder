import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { NeighborhoodMiniMap } from "@/components/map/NeighborhoodMiniMap";
import { NeighborhoodShareButton } from "@/components/map/NeighborhoodShareButton";
import { NeighborhoodContextPanel } from "@/components/neighborhood-context/NeighborhoodContextPanel";
import { readCityMarketIntelligenceMetrics } from "@/lib/map/city-market-intelligence-live";
import type { CityMarketMetricRow } from "@/lib/map/city-market-intelligence";
import { getNeighborhoodBySlug, getNeighborhoods } from "@/lib/map/neighborhood-data";
import { getNeighborhoodContextReadModelBySlugs } from "@/lib/neighborhood-context/read-model";
import "./p0-polish.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ citySlug: string; neighborhoodSlug: string }>;
};

function reliabilityLabel(value: CityMarketMetricRow["priceReliability"] | undefined): string {
  if (value === "strong") return "Forte";
  if (value === "moderate") return "Modérée";
  if (value === "limited") return "Limitée";
  return "Insuffisante";
}

function freshnessLabel(value: CityMarketMetricRow["freshnessStatus"] | undefined): string {
  if (value === "fresh_confirmed") return "Fraîcheur confirmée";
  if (value === "mixed") return "Fraîcheur mixte";
  if (value === "unconfirmed") return "Fraîcheur non confirmée";
  return "Fraîcheur indisponible";
}

function priceLabel(metric: CityMarketMetricRow | null): string {
  if (!metric?.runtimeResolved || metric.medianPricePerM2Mad == null) return "Données insuffisantes";
  return `${Math.round(metric.medianPricePerM2Mad).toLocaleString("fr-FR")} DH/m²`;
}

function densityLabel(metric: CityMarketMetricRow | null): string {
  if (!metric?.runtimeResolved || metric.observedListingDensityPerKm2 == null) return "Données insuffisantes";
  return `${metric.observedListingDensityPerKm2.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ann./km²`;
}

function listingsLabel(metric: CityMarketMetricRow | null): string {
  if (!metric?.runtimeResolved || metric.listingCount == null) return "Données insuffisantes";
  return `${metric.listingCount.toLocaleString("fr-FR")} annonce${metric.listingCount === 1 ? "" : "s"}`;
}

async function readSaleMetric(citySlug: string, neighborhoodSlug: string): Promise<CityMarketMetricRow | null> {
  try {
    const rows = await readCityMarketIntelligenceMetrics(citySlug);
    return rows.find(
      (row) => row.districtSlug === neighborhoodSlug && row.transactionType === "sale",
    ) ?? null;
  } catch (error) {
    console.error("[NeighborhoodPage:market-intelligence]", error);
    return null;
  }
}

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
    title: `${point.neighborhood} ${point.city} — Intelligence quartier | AkarFinder`,
    description: `Prix, volume, densité et repères de confiance observés pour ${point.neighborhood} à ${point.city}, sans interpolation lorsque les données sont insuffisantes.`,
  };
}

export default async function NeighborhoodPage({ params }: PageProps) {
  const resolved = await params;
  const point = getNeighborhoodBySlug(resolved.citySlug, resolved.neighborhoodSlug);
  if (!point) notFound();

  const saleMetric = await readSaleMetric(point.citySlug, point.neighborhoodSlug);
  const contextModel = getNeighborhoodContextReadModelBySlugs(point.citySlug, point.neighborhoodSlug);
  const marketResolved = Boolean(saleMetric?.runtimeResolved);
  const areaLabel = saleMetric?.areaKm2 != null
    ? `${saleMetric.areaKm2.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km²`
    : "Surface non certifiée";
  const mapHref = `/map?city=${encodeURIComponent(point.citySlug)}&district=${encodeURIComponent(point.neighborhoodSlug)}&layer=listings`;

  return (
    <main data-p0-neighborhood-page className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="dark" />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <article data-p0-neighborhood-shell className="overflow-hidden rounded-[28px] border border-border/20 bg-surface-muted shadow-[0_24px_70px_rgba(15,35,66,0.08)]">
          <header className="border-b border-border/15 bg-[linear-gradient(145deg,rgba(11,99,206,0.10),rgba(255,255,255,0.76))] p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <Link
                href="/quartiers"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border/30 bg-white/85 px-3 py-2 text-[11px] font-extrabold text-foreground shadow-sm transition hover:border-brand-primary/30 hover:text-brand-primary"
                aria-label="Retour à tous les quartiers"
                data-akarfinder-neighborhood-back
              >
                <ArrowLeft size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Tous les quartiers</span>
                <span className="sm:hidden">Retour</span>
              </Link>
              <NeighborhoodShareButton title={`${point.neighborhood}, ${point.city} — AkarFinder`} />
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-primary">Intelligence quartier · {point.city}</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] sm:text-5xl">{point.neighborhood}</h1>
                <p className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
                  Lecture immobilière observée à partir du stock AkarFinder et repères quartier certifiés. Aucune valeur n’est interpolée lorsque la preuve manque.
                </p>
              </div>
              <div className="rounded-full border border-border/25 bg-white/80 px-3 py-2 text-[10px] font-extrabold text-muted-foreground shadow-sm">
                {marketResolved ? freshnessLabel(saleMetric?.freshnessStatus) : "Données marché indisponibles"}
              </div>
            </div>
          </header>

          <div className="p-5 sm:p-8">
            <NeighborhoodMiniMap
              lat={point.lat}
              lng={point.lng}
              label={point.neighborhood}
              city={point.city}
              mapHref={mapHref}
            />

            <section aria-label="Indicateurs marché" className="mt-4 grid gap-3 sm:grid-cols-3" data-akarfinder-neighborhood-market-kpis>
              <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary-soft/45 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-brand-primary">Prix médian / m²</p>
                <p className="mt-2 text-[20px] font-extrabold tracking-[-0.025em]">{priceLabel(saleMetric)}</p>
                <p className="mt-1 text-[10px] font-semibold text-muted-foreground">Vente · n prix={saleMetric?.pricePerM2SampleCount ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-border/20 bg-white p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-brand-primary">Densité observée</p>
                <p className="mt-2 text-[20px] font-extrabold tracking-[-0.025em]">{densityLabel(saleMetric)}</p>
                <p className="mt-1 text-[10px] font-semibold text-muted-foreground">{areaLabel}</p>
              </div>
              <div className="rounded-2xl border border-border/20 bg-white p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-brand-primary">Volume d’annonces</p>
                <p className="mt-2 text-[20px] font-extrabold tracking-[-0.025em]">{listingsLabel(saleMetric)}</p>
                <p className="mt-1 text-[10px] font-semibold text-muted-foreground">Stock observé dédupliqué · vente</p>
              </div>
            </section>

            <section className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Qualité des données" data-akarfinder-neighborhood-data-quality>
              <div className="rounded-2xl border border-border/20 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-brand-primary">Confiance des données</p>
                    <p className="mt-2 text-[18px] font-extrabold">{reliabilityLabel(saleMetric?.priceReliability)}</p>
                  </div>
                  <span className="rounded-full bg-surface-muted px-3 py-1.5 text-[9.5px] font-extrabold text-muted-foreground">
                    {freshnessLabel(saleMetric?.freshnessStatus)}
                  </span>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                  La confiance dépend du nombre d’observations prix, de leur fraîcheur et de la diversité des sources observées.
                </p>
              </div>

              <div className="rounded-2xl border border-border/20 bg-white p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-brand-primary">Tendance 6 mois</p>
                <p className="mt-2 text-[18px] font-extrabold text-muted-foreground">Indisponible</p>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  Historique insuffisant pour publier une tendance fiable. AkarFinder n’extrapole pas une courbe à partir d’un snapshot courant.
                </p>
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-border/20 bg-white p-4" aria-label="Catégories dominantes" data-akarfinder-neighborhood-dominant-categories>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-brand-primary">Catégories dominantes</p>
              <p className="mt-2 text-[13px] font-bold text-muted-foreground">Données insuffisantes pour une classification certifiée.</p>
              <p className="mt-1 text-[10.5px] leading-5 text-muted-foreground">La répartition appartement / villa / terrain sera affichée uniquement lorsqu’un échantillon structuré suffisant existe.</p>
            </section>

            <div className="mt-4">
              <NeighborhoodContextPanel model={contextModel} city={point.city} neighborhood={point.neighborhood} />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Link href={point.searchHref} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-5 py-3 text-[13px] font-extrabold text-white shadow-accent hover:bg-brand-primary-hover">
                Rechercher dans ce quartier
              </Link>
              <Link href={mapHref} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border-strong bg-white px-5 py-3 text-[12px] font-extrabold">
                Voir sur la carte
              </Link>
              <Link href="/quartiers" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border-strong bg-white px-5 py-3 text-[12px] font-extrabold">
                Tous les quartiers
              </Link>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-border/25 bg-white/60 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-brand-primary">Méthode / transparence</p>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                Prix, volume et densité proviennent de l’agrégateur marché. Les repères `Vivre ici` proviennent exclusivement du read-model NCI avec identité, provenance et fraîcheur conservées. Chaque couche reste fail-closed lorsque sa preuve manque.
              </p>
            </div>
          </div>
        </article>
      </section>

      <SiteFooter />
    </main>
  );
}
