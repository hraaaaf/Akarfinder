import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { GeoResultPreview } from "@/components/geo/GeoResultPreview";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TerritoryMiniMap } from "@/components/map/TerritoryMiniMap";
import { Container } from "@/components/ui/Container";
import { getNeighborhoodBySlug as getCanonicalNeighborhoodBySlug } from "@/lib/map/canonical-neighborhood-data";
import { getCityBySlug, getAllCities } from "@/lib/seo-city-pages/city-seo-data";
import { generateCitySeoMetadata } from "@/lib/seo-city-pages/seo-metadata";
import { getNeighborhoodsByCity } from "@/lib/seo-neighborhood-pages/neighborhood-seo-data";
import { searchListings } from "@/lib/search";

type CityPageProps = { params: Promise<{ city: string }> };

export async function generateStaticParams() {
  return getAllCities().map((city) => ({ city: city.slug }));
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  const cityData = getCityBySlug(city);
  if (!cityData) return { title: "Not Found", robots: { index: false, follow: false } };
  const seo = generateCitySeoMetadata(cityData);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
    robots: { index: true, follow: true },
    openGraph: { title: seo.ogTitle, description: seo.ogDescription, type: "website", url: seo.canonical },
  };
}

function plural(value: number, singular: string, pluralForm: string) {
  return `${value} ${value === 1 ? singular : pluralForm}`;
}

export default async function CityPage({ params }: CityPageProps) {
  const { city } = await params;
  const cityData = getCityBySlug(city);
  if (!cityData) notFound();

  const neighborhoods = getNeighborhoodsByCity(city);
  const result = await searchListings({ city: cityData.displayName, limit: 6 }).catch(() => ({ listings: [] }));
  const cityParam = encodeURIComponent(cityData.displayName);
  const searchHref = `/search?city=${cityParam}`;
  const mapHref = `/map?city=${cityParam}`;

  const mapPoints = neighborhoods
    .map((neighborhood) => getCanonicalNeighborhoodBySlug(cityData.displayName, neighborhood.slug))
    .filter((point) => point !== null);
  const marketNeighborhoodCount = neighborhoods.filter((neighborhood) => Boolean(neighborhood.intelligence?.priceLabel)).length;
  const lifestyleSignals = new Set(neighborhoods.flatMap((neighborhood) => neighborhood.intelligence?.lifestyleTags ?? []));
  const cityCenter = mapPoints.length > 0
    ? {
        lat: mapPoints.reduce((sum, point) => sum + point.lat, 0) / mapPoints.length,
        lng: mapPoints.reduce((sum, point) => sum + point.lng, 0) / mapPoints.length,
      }
    : null;

  return (
    <main data-p6-experience="ville" className="min-h-screen bg-white text-[#0B2545]">
      <SiteHeader compact />
      <div data-p6-surface="active">
        <section data-p6-stage="territoire" className="border-b border-slate-200 bg-white py-9 sm:py-12 lg:py-14">
          <Container>
            <Link href="/immobilier" className="text-[12px] font-bold text-slate-500">Immobilier au Maroc →</Link>
            <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,0.86fr)_minmax(420px,1.14fr)] lg:items-center">
              <div className="min-w-0">
                <p className="text-[10.5px] font-black uppercase tracking-[0.18em] text-brand-primary">{cityData.displayName} · ville</p>
                <h1 className="mt-2 text-[2.25rem] font-black leading-[1.02] tracking-[-0.05em] text-[#0B2545] sm:text-[3.35rem]">{cityData.displayName}, en données utiles</h1>
                <p className="mt-3 max-w-xl text-[13.5px] font-medium leading-6 text-slate-500">Quartiers documentés, repères locaux et biens accessibles réunis avant d’ouvrir Search.</p>

                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  <article data-p6-summary="market" className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/55 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Marché</p>
                    <p className="mt-1.5 text-[15px] font-black text-[#0B2545]">{marketNeighborhoodCount > 0 ? plural(marketNeighborhoodCount, "quartier", "quartiers") : "Non publié"}</p>
                    <p className="mt-1 text-[9.5px] font-semibold leading-4 text-slate-500">{marketNeighborhoodCount > 0 ? "avec repère documenté" : "aucune moyenne implicite"}</p>
                  </article>
                  <article data-p6-summary="living" className="min-w-0 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Vie locale</p>
                    <p className="mt-1.5 text-[15px] font-black text-[#0B2545]">{lifestyleSignals.size > 0 ? plural(lifestyleSignals.size, "signal", "signaux") : "Non publiée"}</p>
                    <p className="mt-1 text-[9.5px] font-semibold leading-4 text-slate-500">issus des quartiers documentés</p>
                  </article>
                  <article data-p6-summary="territory" className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Territoire</p>
                    <p className="mt-1.5 text-[15px] font-black text-[#0B2545]">{plural(neighborhoods.length, "quartier", "quartiers")}</p>
                    <p className="mt-1 text-[9.5px] font-semibold leading-4 text-slate-500">éligibles à l’exploration</p>
                  </article>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={searchHref} className="inline-flex min-h-11 items-center rounded-xl bg-brand-primary px-5 py-3 text-[12.5px] font-extrabold text-white hover:bg-brand-primary-hover">Rechercher à {cityData.displayName}</Link>
                  <Link href={mapHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12.5px] font-extrabold text-[#0B2545] hover:border-blue-200"><MapPin size={14} />Carte</Link>
                </div>
              </div>

              {cityCenter ? (
                <TerritoryMiniMap lat={cityCenter.lat} lng={cityCenter.lng} label={cityData.displayName} contextLabel={`${neighborhoods.length} quartiers contrôlés`} mapHref={mapHref} badge="Repère ville" zoom={11.5} />
              ) : (
                <div data-p6-territory-map className="grid h-[250px] place-items-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center sm:h-[300px] lg:h-[340px]">
                  <div><MapPin className="mx-auto text-brand-primary" /><p className="mt-3 text-sm font-extrabold">Repère cartographique non disponible</p><p className="mt-1 text-[11px] text-slate-500">Aucune position n’est inventée pour cette ville.</p></div>
                </div>
              )}
            </div>
          </Container>
        </section>

        <div data-p6-stage="biens">
          <GeoResultPreview listings={result.listings} searchHref={searchHref} contextLabel={cityData.displayName} accent="brand" />
        </div>

        <section data-p6-stage="decision" className="border-t border-slate-200 bg-slate-50/70 py-9 sm:py-11">
          <Container>
            <div className="rounded-[22px] border border-slate-200 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-primary">Décision</p>
                <h2 className="mt-1.5 text-xl font-black tracking-[-0.03em] text-[#0B2545]">Poursuivre dans {cityData.displayName}</h2>
                <p className="mt-1.5 text-[12px] leading-5 text-slate-500">Choisissez une intention. Search conserve les règles de vérité et de publication existantes.</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
                <Link href={`${searchHref}&transaction_type=buy`} className="rounded-xl bg-brand-primary px-4 py-3 text-[12px] font-extrabold text-white">Acheter</Link>
                <Link href={`${searchHref}&transaction_type=rent`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12px] font-extrabold">Louer</Link>
                <Link href={`${searchHref}&transaction_type=new`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12px] font-extrabold">Neuf</Link>
              </div>
            </div>
          </Container>
        </section>

        {neighborhoods.length > 0 ? (
          <section className="py-10 lg:py-12">
            <Container>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-primary">Territoires</p><h2 className="mt-1.5 text-[1.5rem] font-black tracking-[-0.04em]">Explorer par quartier</h2></div>
                <Link href={mapHref} className="text-[12.5px] font-extrabold text-brand-primary">Voir sur la carte →</Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {neighborhoods.map((neighborhood) => (
                  <Link key={neighborhood.slug} href={`/immobilier/${neighborhood.citySlug}/${neighborhood.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm motion-reduce:transition-none">
                    <p className="text-[9.5px] font-black uppercase tracking-[0.13em] text-slate-400">Quartier</p>
                    <div className="mt-1 flex items-center justify-between gap-3"><h3 className="text-[15px] font-black text-[#0B2545]">{neighborhood.displayName}</h3><ArrowRight size={14} className="text-brand-primary transition group-hover:translate-x-0.5 motion-reduce:transition-none" /></div>
                    <p className="mt-2 text-[10.5px] font-semibold text-slate-500">{neighborhood.intelligence?.priceLabel ? "Repère marché disponible" : "Exploration locale disponible"}</p>
                  </Link>
                ))}
              </div>
            </Container>
          </section>
        ) : null}

        <section className="border-t border-slate-200 bg-slate-50 py-8">
          <Container><div className="flex items-start gap-3"><Search size={17} className="mt-0.5 text-brand-primary" /><p className="max-w-3xl text-[11.5px] leading-5 text-slate-500"><strong className="text-[#0B2545]">Index utile, pas garantie de couverture.</strong> Les résultats accessibles dépendent des règles de publication AkarFinder et doivent être vérifiés sur leur source originale lorsque nécessaire.</p></div></Container>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
