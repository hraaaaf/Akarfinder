import Link from "next/link";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { ReliabilityBadge } from "@/components/ui/ReliabilityBadge";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import type { Listing } from "@/lib/listings/types";

type SimilarListingsProps = {
  listings: Listing[];
  currentListing?: Listing;
};

function getReliabilityLevel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

type ComparativeBadge = { label: string; cls: string } | null;

function getComparativeBadge(item: Listing, current: Listing | undefined): ComparativeBadge {
  if (!current) return null;
  const currentPpm2 = current.price_per_m2 || 1;
  const itemPpm2 = item.price_per_m2 || 1;
  const reliabilityDiff = (item.reliability_score ?? 0) - (current.reliability_score ?? 0);
  if (itemPpm2 < currentPpm2 * 0.88) {
    return { label: "Prix plus bas", cls: "bg-[#f3ede0] text-bronze-700" };
  }
  if (reliabilityDiff > 8) {
    return { label: "Plus détaillé", cls: "bg-deepblue/8 text-deepblue" };
  }
  if (item.city === current.city) {
    return { label: "Même secteur", cls: "bg-[#f7f3ea] text-gray-600" };
  }
  return null;
}

export function SimilarListings({ listings, currentListing }: SimilarListingsProps) {
  if (listings.length === 0) return null;

  return (
    <div className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_8px_28px_rgba(7,27,51,0.06)]">
      <h2 className="text-[1.25rem] font-extrabold tracking-[-0.03em] text-deepblue">
        Biens similaires
      </h2>
      <p className="mt-1 text-[13.5px] text-gray-500">
        Même secteur, budget ou type de bien.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {listings.map((item) => {
          const level = getReliabilityLevel(item.reliability_score);
          const badge = getComparativeBadge(item, currentListing);
          const showReliability = item.reliability_available !== false;

          return (
            <Link
              key={item.id}
              href={`/listings/${item.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[#eadfca] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(7,27,51,0.12)]"
            >
              {/* Image */}
              <div className="relative h-36 overflow-hidden">
                <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.05]">
                  <ListingVisual listing={item} className="h-full w-full" />
                </div>
                <span className="absolute left-2.5 top-2.5 rounded-full bg-bronze-700/95 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white">
                  {item.property_type}
                </span>
                {badge ? (
                  <span
                    className={`absolute bottom-2.5 left-2.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                ) : null}
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-3.5">
                <p className="text-[15px] font-extrabold tracking-[-0.02em] text-deepblue">
                  {formatPrice(item.price, item.currency)}
                </p>
                {item.price_per_m2 != null && (
                  <p className="mt-0.5 text-[11.5px] font-bold text-bronze-700">
                    {item.price_per_m2.toLocaleString("fr-FR")} DH/m²
                  </p>
                )}
                <p className="mt-1 line-clamp-1 text-[12.5px] font-semibold text-gray-700">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[12px] text-gray-500">
                  {item.neighborhood ? `${item.city}, ${item.neighborhood}` : item.city} · {formatSurface(item.surface_m2)}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {showReliability ? (
                    <ReliabilityBadge level={level} label={level === "high" ? "Niveau d'information élevé" : level === "medium" ? "Niveau d'information moyen" : "Aperçu minimal"} />
                  ) : null}
                  {item.freshness_label ? (
                    <span className="rounded-full bg-[#f7f3ea] px-2 py-0.5 text-[10px] font-bold text-gray-500">
                      {item.freshness_label}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
