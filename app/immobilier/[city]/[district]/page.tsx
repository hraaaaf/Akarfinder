import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Info, MapPin, Search } from "lucide-react";
import { GeoResultPreview } from "@/components/geo/GeoResultPreview";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { isSeoEligibleGeoPair } from "@/lib/geo/geo-entity-registry";
import { searchListings } from "@/lib/search";
import { getAllNeighborhoods, getNeighborhoodBySlug } from "@/lib/seo-neighborhood-pages/neighborhood-seo-data";
import { generateNeighborhoodSeoMetadata } from "@/lib/seo-neighborhood-pages/seo-metadata";
import { isValidDistrictSlug } from "@/lib/seo-neighborhood-pages/types";
import { isValidCitySlug } from "@/lib/seo-city-pages/types";

type PageProps = { params: Promise<{ city: string; district: string }> };

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

export default async function DistrictPage({ params }: PageProps) {
  const { city, district } = await params;
  if (!isValidCitySlug(city) || !isValidDistrictSlug(district) || !isSeoEligibleGeoPair(city, district)) notFound();
  const n = getNeighborhoodBySlug(city, district);
  if (!n) notFound();

  const seo = generateNeighborhoodSeoMetadata(n);
  const cityParam = encodeURIComponent(n.cityDisplayName);
  const districtQuery = encodeURIComponent(n.displayName);
  const searchHref = `/search?city=${cityParam}&q=${districtQuery}`;
  const result = await searchListings({ city: n.cityDisplayName, q: n.displayName, limit: 6 }).catch(() => ({ listings: [] }));

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
    <main className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteHeader compact />

      <section className="border-b border-border/12 bg-surface py-10 dark:border-white/8 dark:bg-deepblue sm:py-14">
        <Container>
          <div className="text-[12px] font-bold text-muted-foreground"><Link href="/immobilier">Immobilier</Link> <span className="mx-2">/</span><Link href={`/immobilier/${n.citySlug}`}>{n.cityDisplayName}</Link> <span className="mx-2">/</span><span>{n.displayName}</span></div>
          <div className="mt-6 max-w-3xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-bronze-500">Quartier · {n.cityDisplayName}</p>
            <h1 className="mt-3 text-[2.35rem] font-extrabold leading-[1.04] tracking-[-0.05em] sm:text-[3.5rem]">Immobilier à {n.displayName}</h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-7 text-muted-foreground">{n.description}</p>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link href={`${searchHref}&transaction_type=buy`} className="rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13px] font-extrabold text-white">Acheter dans ce quartier</Link>
            <Link href={`${searchHref}&transaction_type=rent`} className="rounded-xl border border-border/20 px-5 py-3 text-[13px] font-extrabold">Louer</Link>
            <Link href={`/map?city=${cityParam}`} className="inline-flex items-center gap-2 rounded-xl border border-border/20 px-5 py-3 text-[13px] font-extrabold"><MapPin size={14} />Voir la ville sur la carte</Link>
          </div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-3xl border border-border/15 bg-card p-6 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-bronze-500">Repères quartier</p>
              <h2 className="mt-3 text-xl font-extrabold">Ce qui est documenté — et ce qui ne l’est pas</h2>
              {n.intelligence ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {n.intelligence.priceLabel ? <div className="rounded-xl bg-surface p-4"><p className="text-[10px] font-extrabold uppercase text-muted-foreground">Repère prix indicatif</p><p className="mt-1 font-extrabold">{n.intelligence.priceLabel}</p><p className="mt-1 text-[11px] text-muted-foreground">{n.intelligence.pricePeriod ?? "Période non précisée"}</p></div> : null}
                  {n.intelligence.confidence ? <div className="rounded-xl bg-surface p-4"><p className="text-[10px] font-extrabold uppercase text-muted-foreground">Confiance du repère</p><p className="mt-1 font-extrabold capitalize">{n.intelligence.confidence}</p><p className="mt-1 text-[11px] text-muted-foreground">Concerne le repère, pas une garantie sur un bien.</p></div> : null}
                </div>
              ) : <p className="mt-4 text-[13px] leading-6 text-muted-foreground">Aucun repère quartier spécifique n’est publié pour cette page. AkarFinder ne remplit pas les informations manquantes par estimation implicite.</p>}
              {n.intelligence?.lifestyleTags?.length ? <div className="mt-5 flex flex-wrap gap-2">{n.intelligence.lifestyleTags.slice(0, 5).map((tag) => <span key={tag} className="rounded-full border border-border/15 px-3 py-1.5 text-[11px] font-semibold">{tag}</span>)}</div> : null}
              <p className="mt-5 flex items-start gap-2 text-[11.5px] leading-5 text-muted-foreground"><Info size={14} className="mt-0.5 shrink-0 text-bronze-500" />Ces éléments proviennent du référentiel local disponible. Ils ne constituent ni une mesure live du marché, ni une recommandation d’achat.</p>
            </article>

            <article className="rounded-3xl border border-border/15 bg-card p-6 dark:border-white/10 dark:bg-white/[0.04]">
              <Search size={18} className="text-bronze-500" />
              <h2 className="mt-4 text-xl font-extrabold">Chercher dans {n.displayName}</h2>
              <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">Le quartier reste un contexte de recherche. Les résultats sont ensuite classés par pertinence et niveau d’information dans Search.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {n.propertyTypes.slice(0, 4).map((type) => <Link key={type} href={`${searchHref}&property_type=${encodeURIComponent(type)}`} className="rounded-full border border-border/15 px-3 py-2 text-[11.5px] font-bold capitalize">{type}</Link>)}
              </div>
              <Link href={searchHref} className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-bronze-500">Voir tous les résultats <ArrowRight size={13} /></Link>
            </article>
          </div>
        </Container>
      </section>

      <GeoResultPreview listings={result.listings} searchHref={searchHref} contextLabel={`${n.displayName}, ${n.cityDisplayName}`} />

      <section className="border-t border-border/12 bg-surface py-10 dark:border-white/8"><Container><p className="max-w-3xl text-[12.5px] leading-6 text-muted-foreground"><strong className="text-foreground">Page locale utile, pas fiche de vérité absolue.</strong> Les prix, disponibilités, caractéristiques et coordonnées doivent être confirmés sur la source originale ou auprès du professionnel concerné.</p></Container></section>
      <SiteFooter />
    </main>
  );
}
