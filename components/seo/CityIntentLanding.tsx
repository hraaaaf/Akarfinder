import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";

import { GeoResultPreview } from "@/components/geo/GeoResultPreview";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import type { Listing } from "@/lib/listings/types";
import type { SearchIntent } from "@/lib/seo-city-pages/types";

type Props = {
  cityDisplayName: string;
  citySlug: string;
  intent: SearchIntent;
  listingCount: number;
  sourceCount: number;
  eligible: boolean;
  listings: Listing[];
};

const intentCopy = {
  acheter: {
    eyebrow: "Achat immobilier",
    title: "Acheter",
    transactionType: "buy",
    action: "acheter",
    alternate: "louer" as const,
    alternateLabel: "Louer",
  },
  louer: {
    eyebrow: "Location immobilière",
    title: "Louer",
    transactionType: "rent",
    action: "louer",
    alternate: "acheter" as const,
    alternateLabel: "Acheter",
  },
} as const;

export function CityIntentLanding({
  cityDisplayName,
  citySlug,
  intent,
  listingCount,
  sourceCount,
  eligible,
  listings,
}: Props) {
  const copy = intentCopy[intent];
  const cityParam = encodeURIComponent(cityDisplayName);
  const searchHref = `/search?city=${cityParam}&transaction_type=${copy.transactionType}`;
  const mapHref = `/map?city=${cityParam}&transaction_type=${copy.transactionType}`;
  const cityHref = `/immobilier/${citySlug}`;
  const alternateHref = `/immobilier/${citySlug}/${copy.alternate}`;

  return (
    <main data-seo4-experience="city-intent" className="min-h-screen bg-white text-[#0B2545]">
      <SiteHeader compact />

      <section data-seo4-stage="intent-hero" className="border-b border-slate-200 bg-white py-8 sm:py-10 lg:py-12">
        <Container>
          <Link href={cityHref} className="text-[12px] font-bold text-slate-500">
            Immobilier {cityDisplayName} →
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-end">
            <div className="min-w-0">
              <p className="text-[10.5px] font-black uppercase tracking-[0.18em] text-brand-primary">
                {cityDisplayName} · {copy.eyebrow}
              </p>
              <h1 className="mt-2 text-[2.2rem] font-black leading-[1.02] tracking-[-0.05em] text-[#0B2545] sm:text-[3.25rem]">
                {copy.title} à {cityDisplayName}
              </h1>
              <p className="mt-3 max-w-2xl text-[13.5px] font-medium leading-6 text-slate-500">
                Explorez les offres actuellement publiables observées par AkarFinder, comparez plusieurs sources et vérifiez les détails sur la source originale.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={searchHref}
                  className="inline-flex min-h-11 items-center rounded-xl bg-brand-primary px-5 py-3 text-[12.5px] font-extrabold text-white hover:bg-brand-primary-hover"
                >
                  Voir les biens à {copy.action}
                </Link>
                <Link
                  href={mapHref}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12.5px] font-extrabold text-[#0B2545] hover:border-blue-200"
                >
                  <MapPin size={14} /> Carte
                </Link>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-primary">Preuve de couverture</p>
              </div>
              <p className="mt-2 text-[11.5px] leading-5 text-slate-500">
                Comptage limité aux représentations fraîches et publiables. Ce n’est pas une mesure exhaustive du marché local.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                <article className="rounded-2xl border border-blue-100 bg-white p-3.5">
                  <p className="text-[8.5px] font-black uppercase tracking-[0.12em] text-slate-500">Offres</p>
                  <p className="mt-1.5 text-[18px] font-black text-[#0B2545]">{listingCount}</p>
                  <p className="mt-0.5 text-[9px] font-semibold leading-4 text-slate-500">strictes</p>
                </article>
                <article className="rounded-2xl border border-cyan-100 bg-white p-3.5">
                  <p className="text-[8.5px] font-black uppercase tracking-[0.12em] text-slate-500">Sources</p>
                  <p className="mt-1.5 text-[18px] font-black text-[#0B2545]">{sourceCount}</p>
                  <p className="mt-0.5 text-[9px] font-semibold leading-4 text-slate-500">distinctes</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
                  <p className="text-[8.5px] font-black uppercase tracking-[0.12em] text-slate-500">Publication</p>
                  <p className="mt-1.5 text-[13px] font-black text-[#0B2545]">{eligible ? "Éligible" : "Limitée"}</p>
                  <p className="mt-0.5 text-[9px] font-semibold leading-4 text-slate-500">gate 20/3</p>
                </article>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <GeoResultPreview
        listings={listings}
        searchHref={searchHref}
        contextLabel={`${copy.title} à ${cityDisplayName}`}
        accent="brand"
      />

      <section data-seo4-stage="decision" className="border-t border-slate-200 bg-slate-50/70 py-8 sm:py-10">
        <Container>
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-primary">Continuer</p>
              <h2 className="mt-1.5 text-xl font-black tracking-[-0.03em] text-[#0B2545]">Affiner votre recherche</h2>
              <p className="mt-1.5 max-w-xl text-[12px] leading-5 text-slate-500">
                Passez au moteur pour le budget, le type de bien et les autres filtres. Les variantes de filtres restent hors index SEO.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
              <Link href={searchHref} className="rounded-xl bg-brand-primary px-4 py-3 text-[12px] font-extrabold text-white">
                Ouvrir Search <ArrowRight size={13} className="ml-1 inline" />
              </Link>
              <Link href={alternateHref} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12px] font-extrabold">
                {copy.alternateLabel}
              </Link>
              <Link href={cityHref} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12px] font-extrabold">
                Vue ville
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-8">
        <Container>
          <p className="max-w-3xl text-[11.5px] leading-5 text-slate-500">
            <strong className="text-[#0B2545]">Index utile, pas garantie de couverture.</strong> Les offres accessibles dépendent des règles de publication AkarFinder et doivent être vérifiées sur leur source originale lorsque nécessaire.
          </p>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
