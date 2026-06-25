// P10D — Prix moyen observé
// Uses real observed dataset when available; falls back to enrichment-derived values.
// NEVER claim official prices. Wording: "observé", "indicatif", "repère".

import type { Listing } from "@/lib/listings/types";
import type { ListingEnrichment } from "@/lib/listings/enrichment";
import { getMarketReference } from "@/lib/market/get-market-reference";
import type { MarketReference, MarketConfidence } from "@/lib/market/types";

type MarketReferenceBlockProps = {
  listing: Listing;
  enrichment: ListingEnrichment;
};

const CONFIDENCE_COLORS: Record<MarketConfidence, string> = {
  "élevée":  "bg-[#dcfce7] text-[#166534]",
  "moyenne": "bg-[#fef9c3] text-[#854d0e]",
  "faible":  "bg-[#fee2e2] text-[#991b1b]",
};

const BUY_POSITION = {
  coherent: { label: "Prix cohérent",                     cls: "bg-[#dcfce7] text-[#16a34a]" },
  high:     { label: "Prix supérieur au repère observé",  cls: "bg-[#fee2e2] text-[#dc2626]" },
  low:      { label: "Prix inférieur au repère observé",  cls: "bg-[#dbeafe] text-[#2563eb]" },
} as const;

const RENT_POSITION = {
  coherent: { label: "Loyer cohérent",   cls: "bg-[#dcfce7] text-[#16a34a]" },
  high:     { label: "Loyer élevé",      cls: "bg-[#fee2e2] text-[#dc2626]" },
  low:      { label: "Loyer attractif",  cls: "bg-[#dbeafe] text-[#2563eb]" },
} as const;

function PositionBadge({ position, isRent }: { position: "coherent" | "high" | "low"; isRent: boolean }) {
  const map = isRent ? RENT_POSITION : BUY_POSITION;
  const { label, cls } = map[position];
  return <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${cls}`}>{label}</span>;
}

// P10D real-data block
function RealDataBlock({ listing, market }: { listing: Listing; market: MarketReference }) {
  const isRent = listing.transaction_type === "rent";
  const unit = isRent ? "DH/m²/mois" : "DH/m²";
  const title = isRent ? "Repère loyer indicatif" : "Repère marché indicatif";
  const scopeLabel =
    market.scope === "neighborhood" && listing.neighborhood
      ? `${listing.neighborhood}, ${listing.city}`
      : listing.city;

  return (
    <div className="rounded-2xl border border-[#fde68a] bg-[#fefce8] p-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a16207]">
          {title}
        </p>
        <PositionBadge position={market.position} isRent={isRent} />
      </div>

      {/* Price range */}
      <p className="mt-3 text-[1.4rem] font-extrabold tracking-tight text-gray-900">
        {market.range_low.toLocaleString("fr-FR")}
        {" – "}
        {market.range_high.toLocaleString("fr-FR")}{" "}
        <span className="text-[1rem] font-bold text-gray-500">{unit}</span>
      </p>

      {/* Prix/m² observé label */}
      <p className="mt-0.5 text-[12.5px] font-semibold text-[#a16207]">
        Prix/m² observé — {scopeLabel}
      </p>

      {/* This listing vs market */}
      <div className="mt-3 rounded-xl border border-[#fde68a] bg-white px-4 py-3">
        <p className="text-[13px] text-gray-600">
          Ce bien est proposé à{" "}
          <span className="font-extrabold text-gray-900">
            {listing.price_per_m2.toLocaleString("fr-FR")} {unit}
          </span>
          {market.position_pct !== 0 && (
            <span className={`ml-1 text-[12px] font-bold ${market.position_pct > 0 ? "text-red-600" : "text-blue-600"}`}>
              ({market.position_pct > 0 ? "+" : ""}{market.position_pct}% vs médiane)
            </span>
          )}
        </p>
        <p className="mt-1 text-[12px] text-gray-400">
          Médiane observée : {market.median_price_per_m2.toLocaleString("fr-FR")} {unit}
        </p>
      </div>

      {/* Confidence + sample count row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${CONFIDENCE_COLORS[market.confidence]}`}>
          Confiance {market.confidence}
        </span>
        <span className="text-[11.5px] text-gray-400">
          ~{market.sample_count} annonces similaires analysées
        </span>
      </div>

      {/* Footer disclaimer */}
      <p className="mt-3 text-[11.5px] leading-5 text-gray-400">
        {market.period} — Données indicatives issues de l'analyse AkarFinder.
        Non officielles — à vérifier avant décision.
      </p>
    </div>
  );
}

// Fallback block using enrichment-derived values (pre-P10D behavior)
function FallbackBlock({ listing, enrichment }: { listing: Listing; enrichment: ListingEnrichment }) {
  const isRent = listing.transaction_type === "rent";
  const pos = (isRent ? RENT_POSITION : BUY_POSITION)[enrichment.marketPosition];
  const title = isRent ? "Repère loyer indicatif" : "Repère marché indicatif";
  const unit = isRent ? "DH/m²/mois" : "DH/m²";

  return (
    <div className="rounded-2xl border border-[#fde68a] bg-[#fefce8] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a16207]">{title}</p>
        <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${pos.cls}`}>{pos.label}</span>
      </div>
      <p className="mt-3 text-[1.4rem] font-extrabold tracking-tight text-gray-900">
        {enrichment.marketMinPerM2.toLocaleString("fr-FR")} –{" "}
        {enrichment.marketMaxPerM2.toLocaleString("fr-FR")}{" "}
        <span className="text-[1rem] font-bold text-gray-500">{unit}</span>
      </p>
      <p className="mt-0.5 text-[12.5px] font-medium text-gray-400">
        repère observé dans {listing.neighborhood} ({listing.city})
      </p>
      <p className="mt-2.5 text-[13.5px] text-gray-600">
        Ce bien est proposé à{" "}
        <span className="font-bold text-gray-900">
          {listing.price_per_m2.toLocaleString("fr-FR")} {unit}
        </span>.
      </p>
      <p className="mt-3 text-[12px] leading-5 text-gray-400">
        Indication basée sur les annonces comparables disponibles, non une estimation officielle.
      </p>
    </div>
  );
}

export function MarketReferenceBlock({ listing, enrichment }: MarketReferenceBlockProps) {
  const transactionType =
    listing.transaction_type === "rent" ? "rent" : "buy";

  const realData = getMarketReference(
    listing.city,
    listing.neighborhood,
    listing.property_type,
    transactionType,
    listing.price_per_m2
  );

  if (realData) {
    return <RealDataBlock listing={listing} market={realData} />;
  }

  return <FallbackBlock listing={listing} enrichment={enrichment} />;
}
