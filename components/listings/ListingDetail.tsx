import Image from "next/image";
import Link from "next/link";
import { CompareBar } from "@/components/compare/CompareBar";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { DbProviderThumbnail } from "@/components/listings/DbProviderThumbnail";
import { ListingHistory } from "@/components/listings/ListingHistory";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { MarketReferenceBlock } from "@/components/listings/MarketReferenceBlock";
import { MobileAccordion } from "@/components/listings/MobileAccordion";
import { MreDecisionBlock } from "@/components/listings/MreDecisionBlock";
import { NeighborhoodAmenities } from "@/components/listings/NeighborhoodAmenities";
import { PackageScoreBlock } from "@/components/listings/PackageScoreBlock";
import { ProximityBlock } from "@/components/listings/ProximityBlock";
import { getListingProximity } from "@/lib/proximity/get-listing-proximity";
import { computeRealProximityProfile, inferProximityInput } from "@/lib/proximity/proximity-engine";
import { SimilarListings } from "@/components/listings/SimilarListings";
import { StickyWhatsAppBar } from "@/components/listings/StickyWhatsAppBar";
import { VisitRequestPanel } from "@/components/listings/VisitRequestPanel";
import { WhatsAppCTA } from "@/components/listings/WhatsAppCTA";
import { MreBadge } from "@/components/ui/MreBadge";
import { ReliabilityBadge } from "@/components/ui/ReliabilityBadge";
import {
  getListingEnrichment,
  getSimilarListings,
} from "@/lib/listings/enrichment";
import { mockListings } from "@/lib/listings/mock-listings";
import type { Listing } from "@/lib/listings/types";
import { getGeoPrecisionLabel } from "@/lib/geo/resolve-listing-geo";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import { getListingImageMode, getImageAttribution } from "@/lib/listings/image-policy";
import { canHaveInternalDetail, canShowContactActions } from "@/lib/listings/listing-boundary";
import { calculatePackageScore } from "@/lib/package-score/calculate-package-score";
import { getListingObservedPriceComparison } from "@/lib/market/get-market-reference";

function getReliabilityLevel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

type CharItem = { label: string; value: string };

function PremiumCharacteristics({ listing }: { listing: Listing }) {
  const items: CharItem[] = [];

  if (listing.plot_surface_m2)
    items.push({ label: "Terrain", value: `${listing.plot_surface_m2} m²` });
  if (listing.built_surface_m2)
    items.push({ label: "Surface construite", value: `${listing.built_surface_m2} m²` });
  if (listing.garden_m2)
    items.push({ label: "Jardin", value: `${listing.garden_m2} m²` });
  if (listing.terrace_m2)
    items.push({ label: "Terrasse", value: `${listing.terrace_m2} m²` });
  if (listing.garage_spaces)
    items.push({ label: "Garage", value: `${listing.garage_spaces} place${listing.garage_spaces > 1 ? "s" : ""}` });
  if (listing.floors_count)
    items.push({ label: "Étages", value: String(listing.floors_count) });
  if (listing.condition)
    items.push({ label: "État", value: listing.condition });
  if (listing.property_age_range)
    items.push({ label: "Âge du bien", value: listing.property_age_range });
  if (listing.orientation)
    items.push({ label: "Orientation", value: listing.orientation });
  if (listing.floor_type)
    items.push({ label: "Type de sol", value: listing.floor_type });
  if (listing.has_pool) items.push({ label: "Piscine", value: "Oui" });
  if (listing.has_concierge) items.push({ label: "Concierge", value: "Oui" });
  if (listing.has_equipped_kitchen)
    items.push({ label: "Cuisine équipée", value: "Oui" });
  if (listing.has_moroccan_living_room)
    items.push({ label: "Salon marocain", value: "Oui" });
  if (listing.has_european_living_room)
    items.push({ label: "Salon européen", value: "Oui" });

  if (items.length === 0) return null;

  return (
    <div className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
      <h2 className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-deepblue">
        Caractéristiques
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-[#f7f3ea] px-3 py-2.5">
            <dt className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-gray-500">
              {label}
            </dt>
            <dd className="mt-1 text-[13.5px] font-extrabold text-deepblue">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {listing.premium_features && listing.premium_features.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-[#efe3cd] bg-[#fffaf0] p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a6a2f]">
            Atouts repérés
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {listing.premium_features.map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-[#e2cfab] bg-white px-3 py-1.5 text-[12px] font-semibold text-deepblue"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getTransactionLabel(type: Listing["transaction_type"]) {
  if (type === "rent") return "Location";
  if (type === "new") return "Neuf";
  return "Achat";
}

function getLocationLabel(listing: Listing) {
  return listing.neighborhood
    ? `${listing.city}, ${listing.neighborhood}`
    : listing.city;
}

export function ListingDetail({ listing }: { listing: Listing }) {
  const reliabilityLevel = getReliabilityLevel(listing.reliability_score);
  const enrichment = getListingEnrichment(listing);
  const similar = getSimilarListings(listing, mockListings, 3);
  const showReliability = listing.reliability_available !== false;
  const locationLabel = getLocationLabel(listing);
  const imageMode = getListingImageMode(listing);
  const attribution = getImageAttribution(listing);
  const internalDetailAllowed = canHaveInternalDetail(listing);
  const showContactActions = canShowContactActions(listing);

  const proximityPoints = getListingProximity(listing.city, listing.neighborhood);
  const proximityProfile = computeRealProximityProfile(inferProximityInput(listing));
  const priceComparison = getListingObservedPriceComparison(
    listing.city,
    listing.neighborhood,
    listing.property_type,
    listing.transaction_type === "rent" ? "rent" : "buy",
    listing.price_per_m2
  );
  const packageScore = calculatePackageScore(
    listing.reliability_score,
    listing.reliability_available !== false,
    listing.duplicate_score,
    proximityPoints,
    priceComparison
  );
  const reliabilityLabel =
    reliabilityLevel === "high"
      ? "Fiabilité élevée"
      : reliabilityLevel === "medium"
        ? "À vérifier"
        : "Doublon possible";

  return (
    <section className="pb-52 pt-5 lg:pb-16 lg:pt-6">
      <Link
        href="/search"
        className="inline-flex items-center gap-2 text-[13.5px] font-extrabold text-deepblue transition hover:gap-2.5"
      >
        <span aria-hidden="true">←</span> Retour aux résultats
      </Link>

      <div className="mt-4 grid gap-5 lg:mt-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6">
        {/* ── Left column ── */}
        <div className="space-y-4 lg:space-y-5">

          {/* Hero image */}
          <div className="relative h-[240px] overflow-hidden rounded-[1.6rem] shadow-[0_18px_54px_rgba(7,27,51,0.20)] sm:h-[440px]">
            {imageMode === "db_provider_thumbnail" ? (
              <DbProviderThumbnail
                listing={listing}
                thumbnailUrl={listing.thumbnail_url!}
                className="absolute inset-0 h-full w-full"
                imgClassName="absolute inset-0 h-full w-full object-cover"
              />
            ) : imageMode !== "fallback_visual" ? (
              <Image
                src={listing.main_image_url!}
                alt={listing.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 720px"
                priority
              />
            ) : (
              <ListingVisual
                listing={listing}
                className="absolute inset-0 h-full w-full"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/32" />

            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-deepblue shadow-[0_2px_12px_rgba(0,0,0,0.28)] ring-1 ring-black/8">
                {getTransactionLabel(listing.transaction_type)}
              </span>
              {listing.source_name ? (
                <span className="rounded-full bg-black/55 px-3 py-1.5 text-[12px] font-bold text-white shadow-[0_2px_10px_rgba(0,0,0,0.25)] backdrop-blur-sm">
                  {listing.source_name}
                </span>
              ) : null}
              {listing.is_mre_friendly ? <MreBadge /> : null}
            </div>

            {/* Type de bien — bas gauche, au-dessus du prix */}
            <span className="absolute bottom-[4.5rem] left-5 rounded-full bg-bronze-700/95 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_2px_10px_rgba(0,0,0,0.3)] sm:bottom-[5.5rem]">
              {listing.property_type}
            </span>

            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-[2rem] font-extrabold leading-none tracking-[-0.05em] text-white drop-shadow-md sm:text-[3rem]">
                {formatPrice(listing.price, listing.currency)}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[13px] font-bold text-white/90 sm:text-[17px]">
                <span>{locationLabel}</span>
                <span className="text-bronze-400">·</span>
                <span>{listing.price_per_m2.toLocaleString("fr-FR")} DH/m²</span>
              </p>
            </div>

            {imageMode === "fallback_visual" ? (
              <span className="absolute bottom-3.5 right-4 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/75 backdrop-blur-sm">
                Visuel illustratif
              </span>
            ) : attribution ? (
              <span className="absolute bottom-3.5 right-4 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/75 backdrop-blur-sm">
                {attribution}
              </span>
            ) : null}
          </div>

          {/* Title + compact trust summary */}
          <div className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_8px_28px_rgba(7,27,51,0.06)]">
            <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-[-0.04em] text-deepblue sm:text-[2.2rem]">
              {listing.title}
            </h1>
            <p className="mt-2 text-[13px] font-medium text-gray-500">
              {locationLabel} · {getTransactionLabel(listing.transaction_type)} · {listing.property_type}
            </p>
            {/* Compact trust row — visible on mobile where sidebar is hidden */}
            {showReliability ? (
              <div className="mt-3 flex items-center gap-2 lg:hidden">
                <ReliabilityBadge level={reliabilityLevel} label={reliabilityLabel} />
                {listing.data_completeness_score != null ? (
                  <span className="rounded-full border border-[#c7dff7] bg-[#f0f7ff] px-2.5 py-1 text-[11px] font-bold text-[#1a4a8a]">
                    Indice : {listing.data_completeness_score}/100
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 gap-2 rounded-[1.4rem] border border-[#eadfca] bg-[#fffdf8] p-3.5 shadow-[0_8px_28px_rgba(7,27,51,0.06)] sm:grid-cols-5 sm:gap-3 sm:p-4">
            {[
              ["Surface", formatSurface(listing.surface_m2)],
              ["Chambres", listing.bedrooms > 0 ? `${listing.bedrooms} ch.` : "—"],
              ["Salles de bain", listing.bathrooms > 0 ? `${listing.bathrooms} sdb` : "—"],
              ["Transaction", getTransactionLabel(listing.transaction_type)],
              ["Type", listing.property_type],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white p-3 ring-1 ring-[#f0e6d2]">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
                  {label}
                </p>
                <p className="mt-1.5 text-[0.95rem] font-extrabold text-deepblue">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Package Score */}
          <MobileAccordion title="Package AkarFinder">
            <PackageScoreBlock result={packageScore} />
          </MobileAccordion>

          {/* Onboarding CTA — mobile only (sidebar has its own) */}
          <div className="rounded-[1.4rem] border border-[#d8c8a3] bg-[#fffdf8] p-4 lg:hidden">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-bronze-700">
              Ce bien correspond à votre budget ?
            </p>
            <Link
              href={`/onboarding?listing=${listing.id}`}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] dark:bg-deepblue px-4 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-[#0d2a4d]"
            >
              Vérifier avec mon budget estimatif
            </Link>
            <div className="mt-3 space-y-2">
              <CompareToggleButton listingId={listing.id} variant="block" />
              <FavoriteToggleButton listingId={listing.id} variant="block" />
            </div>
          </div>

          {showContactActions ? (
            <div className="lg:hidden">
              <VisitRequestPanel listing={listing} compact />
            </div>
          ) : null}

          {!internalDetailAllowed ? (
            <div className="rounded-[1.4rem] border border-[#c7dff7] bg-[#f0f7ff] p-4 lg:hidden">
              <p className="text-[12px] font-bold leading-5 text-[#1a4a8a]">
                {listing.source_attribution_label ??
                  "Source publique indexée — aperçu limité, redirection vers le site original."}
              </p>
              {listing.listing_url ? (
                <a
                  href={listing.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-full items-center justify-center rounded-xl bg-[#0B63CE] dark:bg-deepblue px-4 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-[#0d2a4d]"
                >
                  Voir sur {listing.source_name ?? "la source"} →
                </a>
              ) : null}
            </div>
          ) : null}

          {/* Description */}
          <div className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
            <h2 className="text-[1.15rem] font-extrabold tracking-[-0.03em] text-deepblue">
              Description
            </h2>
            <p className="mt-3 text-[14.5px] leading-7 text-gray-600">
              {listing.description}
            </p>
          </div>

          <PremiumCharacteristics listing={listing} />

          {/* Secondary blocks — accordion on mobile */}
          <MobileAccordion title="Repère marché indicatif">
            <MarketReferenceBlock listing={listing} enrichment={enrichment} />
          </MobileAccordion>

          <MobileAccordion title="Quartier & proximité">
            <NeighborhoodAmenities enrichment={enrichment} />
          </MobileAccordion>

          {listing.city ? (
            <MobileAccordion title="Vie autour du bien">
              <ProximityBlock profile={proximityProfile} />
            </MobileAccordion>
          ) : null}

          <MobileAccordion title="Historique de l'annonce">
            <ListingHistory listing={listing} enrichment={enrichment} />
          </MobileAccordion>
        </div>

        {/* ── Sidebar — hidden on mobile (sticky bar + inline trust cover it) ── */}
        <aside className="hidden space-y-4 lg:block lg:sticky lg:top-6">
          {/* Contact card */}
          <div className="overflow-hidden rounded-[1.4rem] border border-[#eadfca] bg-white shadow-[0_14px_38px_rgba(7,27,51,0.12)]">
            <div className="bg-[#0B63CE] dark:bg-deepblue px-5 py-4 text-white">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-bronze-400">
                Contact
              </p>
              <p className="mt-1 text-[1.55rem] font-extrabold leading-none tracking-[-0.03em]">
                {formatPrice(listing.price, listing.currency)}
              </p>
              <p className="mt-1.5 text-[13px] font-semibold text-white/75">
                {locationLabel}
              </p>
            </div>
            <div className="space-y-2.5 p-5">
              {!internalDetailAllowed ? (
                <div className="rounded-xl border border-[#c7dff7] bg-[#f0f7ff] p-3.5">
                  <p className="text-[12px] font-bold leading-5 text-[#1a4a8a]">
                    {listing.source_attribution_label ??
                      "Source publique indexée — aperçu limité, redirection vers le site original."}
                  </p>
                </div>
              ) : null}
              {!internalDetailAllowed && listing.listing_url ? (
                <a
                  href={listing.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-xl bg-[#0B63CE] dark:bg-deepblue px-4 py-3.5 text-[14px] font-extrabold text-white transition hover:bg-[#0d2a4d]"
                >
                  Voir sur {listing.source_name ?? "la source"} →
                </a>
              ) : null}
              {showContactActions && listing.whatsapp ? (
                <WhatsAppCTA
                  phone={listing.whatsapp}
                  label="Contacter via WhatsApp"
                  size="md"
                  variant="primary"
                />
              ) : null}
              {showContactActions ? <VisitRequestPanel listing={listing} /> : null}
              {showContactActions ? (
                <button className="w-full rounded-xl border border-[#d8c8a3] bg-white px-4 py-3.5 text-[14px] font-extrabold text-deepblue transition hover:bg-[#f7f3ea]">
                  Demander plus d&apos;informations
                </button>
              ) : null}
              <Link
                href={`/onboarding?listing=${listing.id}`}
                className="flex w-full items-center justify-center rounded-xl border border-bronze-700/40 bg-[#fffdf8] px-4 py-3 text-[13.5px] font-extrabold text-bronze-700 transition hover:border-bronze-700/70 hover:bg-[#fef8ed]"
              >
                Vérifier si ce bien correspond à mon budget
              </Link>
              <CompareToggleButton listingId={listing.id} variant="block" />
              <FavoriteToggleButton listingId={listing.id} variant="block" />
              <button className="w-full rounded-xl px-4 py-2.5 text-[13px] font-bold text-gray-600 transition hover:bg-[#f7f3ea] hover:text-deepblue">
                Créer une alerte similaire
              </button>
              <p className="pt-1 text-[11px] leading-5 text-gray-500">
                {internalDetailAllowed
                  ? "Les coordonnées de contact sont transmises par la source d'origine. Vérifiez toujours l'annonce avant de vous déplacer."
                  : "Résultat web externe depuis une source publique tierce. AkarFinder ne gère ni le contact ni la visite — rendez-vous sur l'annonce d'origine."}
              </p>
            </div>
          </div>

          {/* Score de confiance AkarFinder */}
          <div className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">
              Score de confiance AkarFinder
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {showReliability ? (
                <ReliabilityBadge level={reliabilityLevel} label={reliabilityLabel} />
              ) : null}
              {listing.data_completeness_score != null ? (
                <span className="rounded-full border border-[#c7dff7] bg-[#f0f7ff] px-2.5 py-1 text-[12px] font-bold text-[#1a4a8a]">
                  Indice AkarFinder : {listing.data_completeness_score}/100
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-[13px] leading-6 text-gray-600">
              Calculé selon la complétude des données, la cohérence du prix et la présence de doublons.
            </p>
            {(listing.source_name || listing.listing_url) ? (
              <div className="mt-3 rounded-xl bg-[#f7f3ea] px-3 py-2.5 text-[12px] font-semibold leading-5 text-gray-500">
                {listing.source_name ? <p>Origine : {listing.source_name}.</p> : null}
                {listing.listing_url ? (
                  <a
                    href={listing.listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex text-deepblue underline underline-offset-2"
                  >
                    Voir l&apos;annonce source →
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <MreDecisionBlock listing={listing} enrichment={enrichment} />

          {/* Localisation */}
          <div className="relative overflow-hidden rounded-[1.4rem] bg-[#0B63CE] dark:bg-deepblue p-5 text-white shadow-[0_8px_28px_rgba(7,27,51,0.14)]">
            <Image
              src="/images/morocco-map-complete-premium.png"
              alt=""
              width={200}
              height={220}
              className="pointer-events-none absolute -right-4 bottom-0 h-[120%] w-auto object-contain opacity-30 mix-blend-screen"
            />
            <p className="relative text-[11px] font-extrabold uppercase tracking-[0.14em] text-bronze-400">
              Localisation
            </p>
            <p className="relative mt-1 text-[1.45rem] font-extrabold tracking-tight">
              {listing.city}
            </p>
            {listing.neighborhood ? (
              <p className="relative mt-1 text-[13.5px] font-bold text-white/85">
                {listing.neighborhood}
              </p>
            ) : null}
            <p className="relative mt-3 text-[11.5px] font-medium leading-5 text-white/60">
              {getGeoPrecisionLabel(listing.geo_precision)}
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-7">
        <SimilarListings listings={similar} currentListing={listing} />
      </div>

      {showContactActions ? <StickyWhatsAppBar listing={listing} /> : null}
      <CompareBar mobileOffsetClassName="bottom-24" />
    </section>
  );
}
