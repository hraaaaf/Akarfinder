import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { GeoResultPreview } from "@/components/geo/GeoResultPreview";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TerritoryMiniMap } from "@/components/map/TerritoryMiniMap";
import { NeighborhoodContextPanel } from "@/components/neighborhood-context/NeighborhoodContextPanel";
import { Container } from "@/components/ui/Container";
import { isSeoEligibleGeoPair } from "@/lib/geo/geo-entity-registry";
import { getNeighborhoodBySlug as getCanonicalNeighborhoodBySlug } from "@/lib/map/canonical-neighborhood-data";
import { buildMapHref, buildMapSearchHref, parseMapNavigationState } from "@/lib/map/map-navigation-state";
import { neighborhoodCoverageLabel } from "@/lib/neighborhood-context/presentation";
import { getNeighborhoodContextReadModelBySlugs } from "@/lib/neighborhood-context/read-model";
import { searchListings } from "@/lib/search";
import { getAllNeighborhoods, getNeighborhoodBySlug } from "@/lib/seo-neighborhood-pages/neighborhood-seo-data";
import { generateNeighborhoodSeoMetadata } from "@/lib/seo-neighborhood-pages/seo-metadata";
import { isValidDistrictSlug } from "@/lib/seo-neighborhood-pages/types";
import { isValidCitySlug } from "@/lib/seo-city-pages/types";
import "./p0-polish.css";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ city: string; district: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function withSearchParam(href: string, key: string, value: string): string {
  const [pathname, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set(key, value);
  return `${pathname}?${params.toString()}`;
}

export async function generateStaticParams() {
  return getAllNeighborhoods()
    .filter((n) => isSeoEligibleGeoPair(n.citySlug, n.slug))
    .map((n) => ({ city: n.citySlug, district: n.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, district } = await params;
  if (!isValidCitySlug(city) || !isValidDistrictSlug(district) || !isSeoEligibleGeoPair(city, district)) {
    return { title: "Not Found", robots: { index: false, follow: false } };
  }
  const n = getNeighborhoodBySlug(city, district);
  if (!n) return { title: "Not Found", robots: { index: false, follow: false } };
  const seo = generateNeighborhoodSeoMetadata(n);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
    robots: { index: true, follow: true },
    openGraph: { title: seo.ogTitle, description: seo.ogDescription, type: "website", url: seo.canonical },
  };
}

export default async function DistrictPage({ params, searchParams }: PageProps) {
  const { city, district } = await params;
  if (!isValidCitySlug(city) || !isValidDistrictSlug(district) || !isSeoEligibleGeoPair(city, district)) notFound();
  const n = getNeighborhoodBySlug(city, district);
  if (!n) notFound();

  const seo = generateNeighborhoodSeoMetadata(n);
  const continuityParams = searchParams ? await searchParams : {};
  const navigationState = parseMapNavigationState({ ...continuityParams, city: n.citySlug, district: n.slug });
  const searchHref = buildMapSearchHref(navigationState);
  const mapHref = buildMapHref(navigationState);
  const result = await searchListings({ city: n.cityDisplayName, district: n.displayName, limit: 6 }).catch(() => ({ listings: [] }));
  const mapPoint = getCanonicalNeighborhoodBySlug(n.cityDisplayName, n.displayName);
  const contextModel = getNeighborhoodContextReadModelBySlugs(n.citySlug, n.slug);
  const anchorCount = contextModel?.anchor_count ?? 0;
  const coverageStatus = contextModel?.coverage_status ?? "unavailable";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Immobilier", item: "https://akarfinder.vercel.app/immobilier" },
      { "@type": "ListItem", position: 2, name: n.cityDisplayName, item: `https://akarfinder.vercel.app/immobilier/${n.citySlug}` },
      { "@type": "ListItem", position: 3, name: n.displayName, item: seo.canonical },
    ],
  };

  return (
    <main data-p6-experience="quartier" className="min-h-screen bg-white text-[#0B2545]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteHeader compact />
      <div data-p6-surface="active">
        <section data-p6-stage="territoire" className="border-b border-slate-200 bg-white py-9 sm:py-12 lg:py-14">
          <Container>
            <div className="text-[11.5px] font-bold text-slate-500"><Link href="/immobilier">Immobilier</Link><span className="mx-2">/</span><Link href={`/immobilier/${n.citySlug}`}>{n.cityDisplayName}</Link><span className="mx-2">/</span><span>{n.displayName}</span></div>

            <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,0.86fr)_minmax(420px,1.14fr)] lg:items-center">
              <div className="min-w-0">
                <p className="text-[10.5px] font-black uppercase tracking-[0.18em] text-brand-primary">{n.cityDisplayName} · quartier</p>
                <h1 className="mt-2 text-[2.25rem] font-black leading-[1.02] tracking-[-0.05em] text-[#0B2545] sm:text-[3.35rem]">{n.displayName}, en données utiles</h1>
                <p className="mt-3 max-w-xl text-[13.5px] font-medium leading-6 text-slate-500">Repère marché, vie locale vérifiée et biens accessibles réunis avant d’ouvrir Search.</p>

                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  <article data-p6-summary="market" className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/55 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Marché</p>
                    <p className="mt-1.5 break-words text-[14px] font-black text-[#0B2545]">{n.intelligence?.priceLabel ?? "Repère non publié"}</p>
                    <p className="mt-1 text-[9.5px] font-semibold leading-4 text-slate-500">{n.intelligence?.pricePeriod ?? "Aucune estimation implicite"}</p>
                  </article>
                  <article data-p6-summary="living" className="min-w-0 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Vie locale</p>
                    <p className="mt-1.5 text-[14px] font-black text-[#0B2545]">{anchorCount} repère{anchorCount > 1 ? "s" : ""}</p>
                    <p className="mt-1 text-[9.5px] font-semibold leading-4 text-slate-500">issus du read-model NCI</p>
                  </article>
                  <article data-p6-summary="confidence" className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Couverture</p>
                    <p className="mt-1.5 text-[14px] font-black text-[#0B2545]">{neighborhoodCoverageLabel(coverageStatus)}</p>
                    <p className="mt-1 text-[9.5px] font-semibold leading-4 text-slate-500">aucun complément inventé</p>
                  </article>
                </div>

                {n.propertyTypes.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {n.propertyTypes.slice(0, 4).map((type) => (
                      <Link key={type} href={withSearchParam(searchHref, "property_type", type)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[10.5px] font-extrabold capitalize text-[#0B2545] hover:border-blue-200">{type}</Link>
                    ))}
                  </div>
                ) : null}
              </div>

              {mapPoint ? (
                <TerritoryMiniMap lat={mapPoint.lat} lng={mapPoint.lng} label={n.displayName} contextLabel={n.cityDisplayName} mapHref={mapHref} badge="Repère quartier" zoom={13.2} />
              ) : (
                <div data-p6-territory-map className="grid h-[250px] place-items-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center sm:h-[300px] lg:h-[340px]">
                  <div><MapPin className="mx-auto text-brand-primary" /><p className="mt-3 text-sm font-extrabold">Repère cartographique non disponible</p><p className="mt-1 text-[11px] text-slate-500">Aucune position n’est inventée pour ce quartier.</p></div>
                </div>
              )}
            </div>

            <div data-p6-stage="vie-locale-detail" className="mt-6">
              <NeighborhoodContextPanel model={contextModel} city={n.cityDisplayName} neighborhood={n.displayName} />
            </div>
          </Container>
        </section>

        <div data-p6-stage="biens">
          <GeoResultPreview listings={result.listings} searchHref={searchHref} contextLabel={`${n.displayName}, ${n.cityDisplayName}`} accent="brand" />
        </div>

        <section data-p6-stage="decision" className="border-t border-slate-200 bg-slate-50/70 py-9 sm:py-11">
          <Container>
            <div className="rounded-[22px] border border-slate-200 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-primary">Décision</p>
                <h2 className="mt-1.5 text-xl font-black tracking-[-0.03em] text-[#0B2545]">Explorer {n.displayName}</h2>
                <p className="mt-1.5 text-[12px] leading-5 text-slate-500">Le quartier reste un contexte de recherche. Les détails d’un bien doivent être confirmés sur leur source.</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
                <Link href={withSearchParam(searchHref, "transaction_type", "buy")} className="rounded-xl bg-brand-primary px-4 py-3 text-[12px] font-extrabold text-white">Acheter</Link>
                <Link href={withSearchParam(searchHref, "transaction_type", "rent")} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12px] font-extrabold">Louer</Link>
                <Link href={mapHref} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12px] font-extrabold"><MapPin size={13} />Carte</Link>
              </div>
            </div>
          </Container>
        </section>

        <section className="border-t border-slate-200 bg-slate-50 py-8">
          <Container><p className="max-w-3xl text-[11.5px] leading-5 text-slate-500"><strong className="text-[#0B2545]">Page locale utile, pas fiche de vérité absolue.</strong> Prix, disponibilités, caractéristiques et coordonnées doivent être confirmés sur la source originale ou auprès du professionnel concerné.</p></Container>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
