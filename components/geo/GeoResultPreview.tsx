import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { Listing } from "@/lib/listings/types";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import { getSearchTruthPresentation, isObservedExternalListing } from "@/lib/search/search-truth-tier";

type Props = {
  listings: Listing[];
  searchHref: string;
  contextLabel: string;
};

export function GeoResultPreview({ listings, searchHref, contextLabel }: Props) {
  return (
    <section className="border-t border-border/12 py-12 dark:border-white/8 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-bronze-500">Aperçu du moteur</p>
            <h2 className="mt-2 text-[1.65rem] font-extrabold tracking-[-0.04em] text-foreground">Résultats actuellement accessibles · {contextLabel}</h2>
            <p className="mt-2 max-w-2xl text-[12.5px] leading-5 text-muted-foreground">Cet aperçu reflète uniquement les résultats actuellement chargés et publiables. Il ne mesure pas le volume total du marché local.</p>
          </div>
          <Link href={searchHref} className="inline-flex items-center gap-2 text-[13px] font-extrabold text-bronze-500">Voir dans le moteur <ArrowRight size={13} aria-hidden="true" /></Link>
        </div>

        {listings.length ? (
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listings.slice(0, 6).map((listing) => {
              const observed = isObservedExternalListing(listing);
              const truth = getSearchTruthPresentation(listing);
              const href = observed && listing.listing_url ? listing.listing_url : `/listings/${listing.id}`;
              return (
                <article key={listing.id} className="rounded-2xl border border-border/15 bg-card p-5 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-border/15 px-2.5 py-1 text-[10px] font-extrabold text-muted-foreground">{truth.label}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><MapPin size={11} aria-hidden="true" />{listing.city}</span>
                  </div>
                  <h3 className="mt-4 line-clamp-2 text-[14px] font-extrabold leading-5 text-foreground">{listing.title}</h3>
                  <p className="mt-2 text-xl font-extrabold tracking-[-0.03em] text-bronze-500">{formatPrice(listing.price, listing.currency)}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-[11.5px] font-semibold text-muted-foreground">
                    {listing.neighborhood ? <span>{listing.neighborhood}</span> : null}
                    {listing.surface_m2 > 0 ? <span>{formatSurface(listing.surface_m2)}</span> : null}
                    {listing.property_type ? <span>{listing.property_type}</span> : null}
                  </div>
                  <Link href={href} target={observed ? "_blank" : undefined} rel={observed ? "noopener noreferrer" : undefined} className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-bronze-500">{observed ? "Voir la source originale" : "Voir la fiche"}<ArrowRight size={13} aria-hidden="true" /></Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-dashed border-border/20 bg-surface/60 p-6 text-[13px] leading-6 text-muted-foreground">Aucun aperçu structuré n’est disponible pour cette zone dans le lot chargé. Utilisez le moteur pour élargir la recherche et consulter les offres observées sur leurs sources originales.</div>
        )}
      </div>
    </section>
  );
}
