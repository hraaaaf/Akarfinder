"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Listing } from "@/lib/listings/types";
import { formatShortPrice, getMapSearchHref, type MapFilters } from "@/lib/map/listing-map";
import { getMarketReference } from "@/lib/market/get-market-reference";

type MapSidePanelProps = {
  listings: Listing[];
  selectedId: string | null;
  filters: MapFilters;
  onSelect: (id: string) => void;
};

export function MapSidePanel({
  listings,
  selectedId,
  filters,
  onSelect,
}: MapSidePanelProps) {
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  // Scroll selected card into view when it changes
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedId]);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#eadfca] bg-white rounded-t-[1.5rem]">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-700">
            Annonces visibles
          </p>
          <h3 className="mt-0.5 text-[1.1rem] font-extrabold text-deepblue">
            {listings.length} résultat{listings.length !== 1 ? "s" : ""}
          </h3>
        </div>
        <Link
          href={getMapSearchHref(filters)}
          className="rounded-full bg-deepblue px-4 py-2 text-[12px] font-extrabold text-white transition hover:bg-[#0c2746]"
        >
          Voir la liste
        </Link>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-white rounded-b-[1.5rem]">
        {listings.length === 0 && (
          <p className="mt-6 text-center text-[14px] text-gray-400">
            Aucune annonce pour ces filtres.
          </p>
        )}
        {listings.map((listing) => {
          const active = listing.id === selectedId;
          return (
            <button
              key={listing.id}
              ref={active ? selectedRef : null}
              type="button"
              onClick={() => onSelect(listing.id)}
              className={
                active
                  ? "w-full rounded-2xl border border-bronze-500 bg-[#fff8e8] p-3 text-left ring-2 ring-bronze-300"
                  : "w-full rounded-2xl border border-[#f0e6d2] bg-[#fffdf8] p-3 text-left transition hover:border-[#d8c8a3] hover:bg-[#fbf7ee]"
              }
            >
              <div className="flex items-start gap-3">
                <div className="h-14 w-[60px] flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-deepblue to-[#0c2746]">
                  {listing.image_url && (
                    <img
                      src={listing.image_url}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-extrabold text-deepblue line-clamp-1">
                    {listing.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-gray-500 line-clamp-1">
                    {listing.neighborhood
                      ? `${listing.neighborhood} · `
                      : ""}
                    {listing.surface_m2} m²
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[14px] font-extrabold text-deepblue">
                      {formatShortPrice(listing.price)}
                    </span>
                    {listing.geo_precision !== "exact" && (
                      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                        Approx.
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#9B7838]">
                      {listing.price_per_m2.toLocaleString("fr-FR")} DH/m²
                    </span>
                    {(() => {
                      const txType = listing.transaction_type === "rent" ? "rent" : "buy";
                      const ref = getMarketReference(listing.city, listing.neighborhood, listing.property_type, txType, listing.price_per_m2);
                      if (!ref) return null;
                      return ref.position === "high"
                        ? <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">↑ Élevé</span>
                        : ref.position === "low"
                        ? <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">↓ Attractif</span>
                        : <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-700">✓ Cohérent</span>;
                    })()}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="rounded-full bg-[#f0f9ff] px-2 py-0.5 text-[10px] font-bold text-[#0369a1]">
                      {listing.reliability_score}/100
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {listing.reliability_label}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
