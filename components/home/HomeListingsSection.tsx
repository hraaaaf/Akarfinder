import Link from "next/link";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";

import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import { Container } from "@/components/ui/Container";
import { getListingImageMode } from "@/lib/listings/image-policy";
import type { Listing } from "@/lib/listings/types";
import { formatPrice } from "@/lib/listings/utils";
import { searchListings } from "@/lib/search";
import { isObservedExternalListing } from "@/lib/search/search-truth-tier";

const MAX_HOME_LISTINGS = 4;

async function loadHomeListings(): Promise<Listing[]> {
  try {
    const result = await searchListings({ limit: 8 });
    return result.listings
      .filter(
        (listing) =>
          listing.can_show_result !== false &&
          listing.production_allowed !== false,
      )
      .slice(0, MAX_HOME_LISTINGS);
  } catch (error) {
    console.error("[home:listings] Unable to load public listings:", error);
    return [];
  }
}

function locationLabel(listing: Listing) {
  const neighborhood = listing.neighborhood?.trim();
  return neighborhood ? `${neighborhood}, ${listing.city}` : listing.city;
}

function detailsLabel(listing: Listing) {
  const details = [listing.property_type];
  if (listing.surface_m2 > 0) details.push(`${listing.surface_m2} m²`);
  if (listing.bedrooms > 0) details.push(`${listing.bedrooms} ch.`);
  return details.join(" · ");
}

function listingDestination(listing: Listing) {
  const external = isObservedExternalListing(listing) && Boolean(listing.listing_url);
  return {
    href: external ? listing.listing_url! : `/listings/${listing.id}`,
    external,
  };
}

function ListingVisual({ listing }: { listing: Listing }) {
  const mode = getListingImageMode(listing);
  const showAuthorizedImage =
    (mode === "real_image" || mode === "preview_image") &&
    Boolean(listing.main_image_url);

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-[#EEF6FF]">
      {showAuthorizedImage ? (
        // Native img avoids introducing a new remote-image host allowlist in this UI-only lot.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={listing.main_image_url!}
          alt={listing.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025] motion-reduce:transform-none"
        />
      ) : (
        <div className="h-full w-full" data-home-listing-fallback>
          <PropertyTypeArtwork kind={listing.property_type} className="h-full w-full" decorative />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071B33]/45 via-transparent to-transparent" />
      {!showAuthorizedImage ? (
        <span className="absolute bottom-2 right-2 rounded-full bg-[#071B33]/78 px-2 py-1 text-[9px] font-semibold text-white/90 backdrop-blur-sm">
          Illustration
        </span>
      ) : null}
    </div>
  );
}

function HomeListingCard({ listing }: { listing: Listing }) {
  const destination = listingDestination(listing);
  const content = (
    <>
      <ListingVisual listing={listing} />
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <p data-home-listing-price className="min-w-0 truncate text-[1.12rem] font-black tracking-[-0.03em] text-[#0B1F3A] sm:text-[1.22rem]">
            {formatPrice(listing.price, listing.currency)}
          </p>
          {destination.external ? (
            <ExternalLink size={14} className="mt-1 shrink-0 text-[#0B63CE]" aria-hidden="true" />
          ) : null}
        </div>
        <p className="mt-1 truncate text-[11.5px] font-bold text-slate-600 sm:text-[12px]">
          {detailsLabel(listing)}
        </p>
        <p className="mt-2 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
          <MapPin size={12} className="shrink-0 text-[#0B63CE]" aria-hidden="true" />
          <span className="truncate">{locationLabel(listing)}</span>
        </p>
      </div>
    </>
  );

  const className =
    "group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.15rem] border border-[#DCE8F5] bg-white shadow-[0_10px_30px_rgba(11,31,58,0.07)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:shadow-[0_18px_42px_rgba(11,99,206,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 motion-reduce:transform-none";

  if (destination.external) {
    return (
      <a
        href={destination.href}
        target="_blank"
        rel="noreferrer"
        data-home-listing-card
        data-listing-id={listing.id}
        className={className}
        aria-label={`Voir la source originale : ${listing.title}`}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={destination.href}
      data-home-listing-card
      data-listing-id={listing.id}
      className={className}
      aria-label={`Voir le bien : ${listing.title}`}
    >
      {content}
    </Link>
  );
}

export async function HomeListingsSection() {
  const listings = await loadHomeListings();

  return (
    <section data-home-listings="hvr-3" className="bg-white py-10 sm:py-14 lg:py-16">
      <Container>
        <div className="mx-auto max-w-[1240px]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.2em] text-[#0B63CE]">À explorer</p>
              <h2 className="mt-2 text-[1.8rem] font-extrabold leading-[1.05] tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.35rem]">
                Biens à découvrir
              </h2>
              <p className="mt-2 max-w-[620px] text-[0.88rem] leading-6 text-slate-600 sm:text-[0.96rem]">
                Quelques biens actuellement visibles dans AkarFinder.
              </p>
            </div>
            <Link href="/search" className="hidden shrink-0 items-center gap-1.5 text-[12px] font-extrabold text-[#0B63CE] hover:underline sm:inline-flex">
              Voir tous les biens <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
            </Link>
          </div>

          {listings.length > 0 ? (
            <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
              {listings.map((listing) => (
                <div key={listing.id} className="w-[76vw] max-w-[300px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                  <HomeListingCard listing={listing} />
                </div>
              ))}
            </div>
          ) : (
            <div data-home-listings-empty className="mt-6 flex flex-col items-start gap-3 rounded-[1.15rem] border border-[#DCE8F5] bg-[#F8FBFF] p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] leading-5 text-slate-600">Les biens disponibles sont accessibles depuis la recherche.</p>
              <Link href="/search" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0B63CE] px-4 py-2 text-[12px] font-extrabold text-white">
                Ouvrir la recherche <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          )}

          <div className="mt-4 sm:hidden">
            <Link href="/search" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#60A5FA]/30 bg-white px-4 py-2.5 text-[0.84rem] font-semibold text-[#0B63CE] shadow-[0_12px_30px_rgba(11,99,206,0.08)]">
              Voir tous les biens <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
