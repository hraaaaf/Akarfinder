import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { GeoResultPreview } from "@/components/geo/GeoResultPreview";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
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

export default async function CityPage({ params }: CityPageProps) {
  const { city } = await params;
  const cityData = getCityBySlug(city);
  if (!cityData) notFound();

  const neighborhoods = getNeighborhoodsByCity(city);
  const result = await searchListings({ city: cityData.displayName, limit: 6 }).catch(() => ({ listings: [] }));
  const cityParam = encodeURIComponent(cityData.displayName);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />
      <section className="border-b border-border/12 bg-surface py-12 dark:border-white/8 dark:bg-deepblue sm:py-16">
        <Container>
          <Link href="/immobilier" className="text-[12px] font-bold text-muted-foreground">Immobilier au Maroc →</Link>
          <div className="mt-5 max-w-3xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-bronze-500">Hub local · {cityData.displayName}</p>
            <h1 className="mt-3 text-[2.4rem] font-extrabold leading-[1.04] tracking-[-0.05em] sm:text-[3.6rem]">Immobilier à {cityData.displayName}</h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-7 text-muted-foreground">{cityData.description} Cette page relie les quartiers canoniques, les repères locaux et le moteur Search sans prétendre représenter tout le marché.</p>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <Link href={`/search?city=${cityParam}&transaction_type=buy`} className="rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13px] font-extrabold text-white">Acheter à {cityData.displayName}</Link>
            <Link href={`/search?city=${cityParam}&transaction_type=rent`} className="rounded-xl border border-border/20 px-5 py-3 text-[13px] font-extrabold">Louer</Link>
            <Link href={`/search?city=${cityParam}&transaction_type=new`} className="rounded-xl border border-border/20 px-5 py-3 text-[13px] font-extrabold">Neuf</Link>
            <Link href={`/map?city=${cityParam}`} className="inline-flex items-center gap-2 rounded-xl border border-border/20 px-5 py-3 text-[13px] font-extrabold"><MapPin size={14} />Carte</Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["Appartement", "Villa", "Studio"].map((type) => (
              <Link key={type} href={`/search?city=${cityParam}&property_type=${encodeURIComponent(type)}`} className="rounded-full border border-border/15 bg-card px-4 py-2 text-[12px] font-bold dark:border-white/10 dark:bg-white/[0.04]">{type}</Link>
            ))}
            <Link href={`/search?city=${cityParam}`} className="inline-flex items-center gap-1 rounded-full border border-bronze-500/35 bg-bronze-500/10 px-4 py-2 text-[12px] font-extrabold text-bronze-500">Tous les résultats <ArrowRight size={12} /></Link>
          </div>
        </Container>
      </section>

      {neighborhoods.length > 0 ? (
        <section className="py-12 lg:py-16">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-bronze-500">Quartiers éligibles</p><h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.04em]">Explorer {cityData.displayName} par quartier</h2></div>
              <Link href={`/map?city=${cityParam}`} className="text-[13px] font-extrabold text-bronze-500">Voir sur la carte →</Link>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {neighborhoods.map((n) => (
                <Link key={n.slug} href={`/immobilier/${n.citySlug}/${n.slug}`} className="rounded-2xl border border-border/15 bg-card p-5 transition hover:border-bronze-500/40 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-500">Quartier</p>
                  <h3 className="mt-2 text-lg font-extrabold">{n.displayName}</h3>
                  <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{n.description}</p>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <GeoResultPreview listings={result.listings} searchHref={`/search?city=${cityParam}`} contextLabel={cityData.displayName} />

      <section className="border-t border-border/12 bg-surface py-10 dark:border-white/8"><Container><div className="flex items-start gap-3"><Search size={18} className="mt-1 text-bronze-500" /><p className="max-w-3xl text-[12.5px] leading-6 text-muted-foreground"><strong className="text-foreground">À lire comme un index, pas comme une garantie de couverture.</strong> AkarFinder affiche les résultats accessibles selon ses règles de publication et renvoie à la source originale lorsque nécessaire.</p></div></Container></section>
      <SiteFooter />
    </main>
  );
}
