"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { Listing } from "@/lib/listings/types";
import { formatShortPrice } from "@/lib/map/listing-map";
import { getMarketReference } from "@/lib/market/get-market-reference";

// WhatsApp brand SVG — kept as-is (brand icon, not in Lucide)
function WhatsAppIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type MapBottomSheetProps = {
  listing: Listing | null;
  onDismiss?: () => void;
};

export function MapBottomSheet({ listing, onDismiss }: MapBottomSheetProps) {
  const [expanded, setExpanded] = useState(false);

  if (!listing) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 rounded-t-[1.5rem] border-t border-[#eadfca] bg-white shadow-[0_-8px_32px_rgba(7,27,51,0.16)] transition-all duration-300 lg:hidden ${
        expanded ? "max-h-[80vh] overflow-y-auto" : "max-h-[140px] overflow-hidden"
      }`}
    >
      {/* Drag handle */}
      <div
        className="flex cursor-pointer items-center justify-center py-3"
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        aria-label={expanded ? "Réduire" : "Voir plus"}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded((prev) => !prev); }}
      >
        <div className="h-1 w-10 rounded-full bg-gray-300" />
      </div>

      <div
        className="flex cursor-pointer items-center justify-between px-4 pb-3"
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        tabIndex={-1}
        aria-label={expanded ? "Réduire le panneau" : "Voir les détails"}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded((prev) => !prev); }}
      >
        <div>
          <span className="text-[1.2rem] font-extrabold text-deepblue">
            {formatShortPrice(listing.price)}
          </span>
          <span className="ml-2 rounded-full bg-[#f0e6d2] px-2 py-0.5 text-[11px] font-extrabold text-bronze-700">
            {listing.city}
          </span>
          {listing.geo_precision !== "exact" && (
            <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Position approximative
            </span>
          )}
        </div>
        {expanded
          ? <ChevronDown size={20} className="text-gray-400" aria-hidden="true" />
          : <ChevronUp   size={20} className="text-gray-400" aria-hidden="true" />
        }
      </div>

      {expanded && (
        <div className="border-t border-[#f0e6d2] px-4 pb-6 pt-4">
          <div className="flex items-start gap-3">
            <div className="h-16 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-deepblue to-[#0c2746]">
              {listing.image_url && (
                <img src={listing.image_url} alt={listing.title} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-extrabold leading-5 text-deepblue line-clamp-2">{listing.title}</p>
              <p className="mt-1 text-[12px] text-gray-500">
                {listing.neighborhood && `${listing.neighborhood} · `}
                {listing.surface_m2} m²
                {listing.bedrooms ? ` · ${listing.bedrooms} ch.` : ""}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-[#f0f9ff] px-2.5 py-1 text-[11px] font-bold text-[#0369a1]">
              Fiabilité {listing.reliability_score}/100
            </span>
            <span className="rounded-full bg-[#f0fdf4] px-2.5 py-1 text-[11px] font-bold text-[#166534]">
              {listing.property_type}
            </span>
          </div>

          {/* Prix/m² + repère marché */}
          {(() => {
            const txType = listing.transaction_type === "rent" ? "rent" : "buy";
            const unit = txType === "rent" ? "DH/m²/mois" : "DH/m²";
            const ref = getMarketReference(listing.city, listing.neighborhood, listing.property_type, txType, listing.price_per_m2);
            const positionBadge = ref
              ? ref.position === "high"
                ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">↑ Prix élevé</span>
                : ref.position === "low"
                ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">↓ Prix attractif</span>
                : <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">✓ Prix cohérent</span>
              : null;
            return (
              <div className="mt-3 rounded-xl border border-[#fde68a] bg-[#fefce8] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a16207]">
                    Repère marché indicatif
                  </p>
                  {positionBadge}
                </div>
                <p className="mt-1.5 text-[13px] font-extrabold text-gray-900">
                  {listing.price_per_m2.toLocaleString("fr-FR")}{" "}
                  <span className="font-semibold text-gray-500">{unit}</span>
                  {ref && (
                    <span className={`ml-2 text-[11px] font-bold ${ref.position_pct > 0 ? "text-red-500" : ref.position_pct < 0 ? "text-blue-500" : "text-green-600"}`}>
                      ({ref.position_pct > 0 ? "+" : ""}{ref.position_pct}% médiane)
                    </span>
                  )}
                </p>
                {ref && (
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Repère {listing.city} : {ref.range_low.toLocaleString("fr-FR")} – {ref.range_high.toLocaleString("fr-FR")} {unit}
                  </p>
                )}
                {!ref && (
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Données de référence non disponibles pour cette zone.
                  </p>
                )}
              </div>
            );
          })()}

          <div className="mt-4 flex gap-2">
            <Link
              href={`/listings/${listing.id}`}
              className="flex-1 rounded-xl bg-deepblue py-3 text-center text-[13px] font-extrabold text-white"
            >
              Voir le bien
            </Link>
            {listing.whatsapp && (
              <a
                href={`https://wa.me/${listing.whatsapp.replace(/\D/g, "")}?text=Bonjour, je suis intéressé par ce bien sur AkarFinder.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-3 text-[13px] font-extrabold text-white"
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
            )}
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="mt-3 w-full rounded-xl border border-[#eadfca] py-2.5 text-[13px] font-semibold text-gray-500"
            >
              Fermer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
