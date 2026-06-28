"use client";

// SEARCH-RELOOKING-1 — Card résultat dark premium dédiée /search.
// CLONE restylé de PhotoFirstListingCard (NON modifiée, partagée ailleurs).
// Même richesse data, thème dark deepblue/bronze. CTAs : Voir le bien, Voir la
// source, Comparer, Favori + contextuel (Simuler le crédit / Créer une alerte).
// Wording prudent : Indice AkarFinder, repères indicatifs, source visible.

import Image from "next/image";
import Link from "next/link";
import { MapPin, ArrowRight, Calculator, BellPlus } from "lucide-react";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import { getListingImageMode, getImageAttribution } from "@/lib/listings/image-policy";
import { getMarketReference, getListingObservedPriceComparison } from "@/lib/market/get-market-reference";
import { getListingProximity } from "@/lib/proximity/get-listing-proximity";
import { calculatePackageScore } from "@/lib/package-score/calculate-package-score";
import { track } from "@/lib/tracking/track";
import type { PackageScoreLabel } from "@/lib/package-score/types";
import type { Listing } from "@/lib/listings/types";

function PackageBadge({ label }: { label: PackageScoreLabel }) {
  const styles: Record<PackageScoreLabel, string> = {
    "Excellent package": "border-emerald-400/30 bg-emerald-400/15 text-emerald-300",
    "Bon package": "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    "Package correct": "border-amber-300/30 bg-amber-300/10 text-amber-200",
    "À analyser": "border-white/15 bg-white/5 text-white/55",
    "Données insuffisantes": "border-white/12 bg-white/5 text-white/40",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles[label]}`}>{label}</span>;
}

function getReliabilityLevel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function reliabilityStyle(level: "high" | "medium" | "low") {
  if (level === "high") return { label: "Fiabilité élevée", cls: "border-emerald-400/30 bg-emerald-400/12 text-emerald-300" };
  if (level === "medium") return { label: "À vérifier", cls: "border-amber-300/30 bg-amber-300/12 text-amber-200" };
  return { label: "Doublon possible", cls: "border-rose-400/30 bg-rose-400/12 text-rose-300" };
}

function getTransactionLabel(type: Listing["transaction_type"]) {
  if (type === "rent") return "Location";
  if (type === "new") return "Neuf";
  return "Achat";
}

export function SearchListingCardDark({ listing }: { listing: Listing }) {
  const reliabilityLevel = getReliabilityLevel(listing.reliability_score);
  const rel = reliabilityStyle(reliabilityLevel);
  const showReliability = listing.reliability_available !== false;
  const imageMode = getListingImageMode(listing);
  const attribution = getImageAttribution(listing);
  const transactionType = listing.transaction_type === "rent" ? "rent" : "buy";
  const proximityPoints = getListingProximity(listing.city, listing.neighborhood);
  const priceComparison = getListingObservedPriceComparison(
    listing.city, listing.neighborhood, listing.property_type, transactionType, listing.price_per_m2
  );
  const packageScore = calculatePackageScore(
    listing.reliability_score,
    listing.reliability_available !== false,
    listing.duplicate_score,
    proximityPoints,
    priceComparison
  );
  const hasPackage = packageScore.overall_label !== "Données insuffisantes";
  const marketRef = hasPackage ? null : getMarketReference(listing.city, listing.neighborhood, listing.property_type, transactionType, listing.price_per_m2);
  const isRent = listing.transaction_type === "rent";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_14px_40px_rgba(2,10,24,0.4)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-bronze-500/40 hover:shadow-[0_26px_56px_rgba(2,10,24,0.55)]">
      <Link
        href={`/listings/${listing.id}`}
        onClick={() => track({ event_name: "search_result_click", source_page: "/search", listing_id: listing.id, intent: transactionType, metadata: { city: listing.city } })}
        className="block"
        aria-label={`Voir le bien ${listing.title}`}
      >
        <div className="relative h-[210px] overflow-hidden">
          <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.04]">
            {imageMode !== "fallback_visual" ? (
              <Image src={listing.main_image_url!} alt={listing.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 420px" />
            ) : (
              <ListingVisual listing={listing} className="h-full w-full" />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#03101f]/80 via-transparent to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-deepblue/85 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-white ring-1 ring-white/15 backdrop-blur">
              {getTransactionLabel(listing.transaction_type)}
            </span>
            {listing.source_name ? (
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-extrabold text-deepblue backdrop-blur">
                {listing.source_name}
              </span>
            ) : null}
          </div>

          <span className="absolute bottom-3 left-3 rounded-full bg-gradient-to-r from-bronze-700 to-bronze-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white shadow-sm">
            {listing.property_type}
          </span>
          {imageMode === "fallback_visual" ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2 py-1 text-[9px] font-medium text-white/70 backdrop-blur-sm">Visuel illustratif</span>
          ) : attribution ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/40 px-2 py-1 text-[9px] font-medium text-white/70 backdrop-blur-sm">{attribution}</span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[1.6rem] font-extrabold leading-none tracking-[-0.04em] text-bronze-400">
              {formatPrice(listing.price, listing.currency)}
            </p>
            {listing.price_per_m2 > 0 ? (
              <p className="mt-1 text-[12px] font-bold text-white/45">
                {listing.price_per_m2.toLocaleString("fr-FR")} DH/m²
              </p>
            ) : null}
          </div>
          <FavoriteToggleButton listingId={listing.id} variant="icon" />
        </div>

        <Link href={`/listings/${listing.id}`} className="mt-3 block">
          <h2 className="line-clamp-1 text-[1.02rem] font-extrabold leading-snug text-white transition group-hover:text-bronze-300">
            {listing.title}
          </h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-white/55">
            <MapPin size={13} strokeWidth={2.2} className="shrink-0 text-bronze-500" aria-hidden="true" />
            <span className="truncate">{listing.neighborhood ? `${listing.city}, ${listing.neighborhood}` : listing.city}</span>
          </p>
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/8 pt-3 text-[13px] font-bold text-white/75">
          <span>{formatSurface(listing.surface_m2)}</span>
          {listing.bedrooms > 0 ? <span>{listing.bedrooms} ch.</span> : null}
          {listing.bathrooms > 0 ? <span>{listing.bathrooms} sdb</span> : null}
          <span className="text-white/25">·</span>
          <span className="text-white/45">{listing.freshness_label}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {showReliability ? (
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${rel.cls}`}>{rel.label}</span>
          ) : null}
          {listing.is_mre_friendly ? (
            <span className="rounded-full border border-blue-400/30 bg-blue-400/12 px-2.5 py-1 text-[11px] font-bold text-blue-300">MRE-friendly</span>
          ) : null}
          {listing.data_completeness_score != null ? (
            <span className="rounded-full border border-white/15 bg-white/6 px-2.5 py-1 text-[11px] font-bold text-white/70">
              Indice AkarFinder : {listing.data_completeness_score}/100
            </span>
          ) : null}
          {listing.duplicate_score != null && listing.duplicate_score >= 0.7 ? (
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-bold text-amber-200">Doublon possible</span>
          ) : null}
          {hasPackage ? (
            <PackageBadge label={packageScore.overall_label} />
          ) : marketRef && marketRef.confidence !== "faible" ? (
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
              marketRef.position === "coherent" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : marketRef.position === "high" ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
                : "border-blue-400/30 bg-blue-400/10 text-blue-300"
            }`}>
              {marketRef.position === "coherent" ? "Prix cohérent" : marketRef.position === "high" ? "Prix supérieur au repère" : "Prix inférieur au repère"}
            </span>
          ) : null}
        </div>

        {/* CTAs */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/listings/${listing.id}`}
            onClick={() => track({ event_name: "search_result_click", source_page: "/search", listing_id: listing.id, intent: transactionType })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.35)] transition hover:from-bronze-600 group-hover:gap-3"
          >
            Voir le bien
            <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
          </Link>
          {listing.listing_url ? (
            <a
              href={listing.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[12.5px] font-bold text-white/70 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
            >
              Voir la source
            </a>
          ) : null}
        </div>

        {/* CTA contextuel : crédit (achat) / alerte (location) */}
        <div className="mt-2 flex items-center gap-2">
          {isRent ? (
            <Link
              href="/louer#alerte"
              onClick={() => track({ event_name: "search_alert_click", source_page: "/search", listing_id: listing.id, intent: "rent", metadata: { city: listing.city } })}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-bronze-500/30 bg-bronze-500/10 px-3 py-2 text-[12px] font-extrabold text-bronze-300 transition hover:bg-bronze-500/20"
            >
              <BellPlus size={13} strokeWidth={2.4} aria-hidden="true" />
              Créer une alerte
            </Link>
          ) : (
            <Link
              href="/acheter#financement"
              onClick={() => track({ event_name: "search_credit_click", source_page: "/search", listing_id: listing.id, intent: "buy", metadata: { city: listing.city, price: listing.price } })}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-bronze-500/30 bg-bronze-500/10 px-3 py-2 text-[12px] font-extrabold text-bronze-300 transition hover:bg-bronze-500/20"
            >
              <Calculator size={13} strokeWidth={2.4} aria-hidden="true" />
              Simuler le crédit
            </Link>
          )}
          <CompareToggleButton listingId={listing.id} className="flex-1 justify-center" />
        </div>
      </div>
    </article>
  );
}
