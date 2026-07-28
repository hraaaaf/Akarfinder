"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Scale, X } from "lucide-react";
import { useOptionalPropertySelection } from "@/components/search/PropertySelectionProvider";
import {
  addCompareId,
  dispatchCompareUpdated,
  isListingCompared,
  readCompareIds,
  removeCompareId,
} from "@/lib/compare/compare-storage";
import type { Listing } from "@/lib/listings/types";
import { MAX_COMPARE_LISTINGS } from "@/lib/compare/types";
import { getCanonicalPropertyId } from "@/lib/ux/property-selection";

type CompareToggleButtonProps = {
  listing?: Listing;
  listingId?: string;
  variant?: "inline" | "block";
  className?: string;
};

export function CompareToggleButton({
  listing,
  listingId,
  variant = "inline",
  className = "",
}: CompareToggleButtonProps) {
  const propertySelection = useOptionalPropertySelection();
  const visibleListings = propertySelection?.visibleListings ?? [];
  const resolvedListingId = listing?.id ?? listingId ?? "";
  const [isCompared, setIsCompared] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [canonicalDuplicate, setCanonicalDuplicate] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const canonicalId = listing ? getCanonicalPropertyId(listing) : `listing:${resolvedListingId}`;

  const visibleById = useMemo(
    () => new Map(visibleListings.map((candidate) => [candidate.id, candidate])),
    [visibleListings],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !resolvedListingId) return;

    function sync() {
      const storage = window.localStorage;
      const ids = readCompareIds(storage);
      const compared = ids.includes(resolvedListingId);
      const duplicate = listing
        ? ids.some((id) => {
            if (id === resolvedListingId) return false;
            const candidate = visibleById.get(id);
            return candidate ? getCanonicalPropertyId(candidate) === canonicalId : false;
          })
        : false;
      setIsCompared(compared);
      setCanonicalDuplicate(duplicate);
      setIsFull(ids.length >= MAX_COMPARE_LISTINGS && !compared);
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("akarfinder:compare-updated", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("akarfinder:compare-updated", sync);
    };
  }, [canonicalId, listing, resolvedListingId, visibleById]);

  function handleToggle() {
    if (typeof window === "undefined" || !resolvedListingId) return;

    if (!isCompared && canonicalDuplicate) {
      setFeedback("Cette propriété est déjà représentée dans le comparateur");
      return;
    }

    const storage = window.localStorage;
    const result = isListingCompared(resolvedListingId, storage)
      ? removeCompareId(resolvedListingId, storage)
      : addCompareId(resolvedListingId, storage);

    if (!result.ok) {
      setFeedback(`Comparateur plein (${MAX_COMPARE_LISTINGS} biens max)`);
      setIsFull(true);
      return;
    }

    dispatchCompareUpdated(result.ids);
    setIsCompared(result.ids.includes(resolvedListingId));
    setIsFull(result.ids.length >= MAX_COMPARE_LISTINGS && !result.ids.includes(resolvedListingId));
    setFeedback(result.status === "removed" ? "Retiré du comparateur" : "Ajouté au comparateur");
  }

  const blocked = !resolvedListingId || ((isFull || canonicalDuplicate) && !isCompared);
  const buttonClasses =
    variant === "block"
      ? "flex w-full items-center justify-center gap-2 rounded-xl border border-[#d8c8a3] px-4 py-3 text-[13.5px] font-extrabold transition"
      : "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-extrabold transition";

  return (
    <div className={variant === "block" ? "space-y-1.5" : "space-y-1"}>
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={isCompared}
        aria-label={
          isCompared
            ? "Retirer cette propriété du comparateur"
            : canonicalDuplicate
              ? "Cette propriété est déjà représentée dans le comparateur"
              : "Ajouter cette propriété au comparateur"
        }
        className={`${buttonClasses} ${
          isCompared
            ? "border-[#c8b07d] bg-[#fff7e6] text-[#8a6a2f] hover:bg-[#fff1d0]"
            : blocked
              ? "cursor-not-allowed border-[#eadfca] bg-[#faf8f2] text-gray-400"
              : "border-[#eadfca] bg-white text-deepblue hover:border-[#d8c8a3] hover:bg-[#f7f3ea]"
        } ${className}`}
        disabled={blocked}
      >
        {isCompared ? (
          <Check size={16} strokeWidth={2.4} aria-hidden="true" />
        ) : blocked ? (
          <X size={16} strokeWidth={2.4} aria-hidden="true" />
        ) : (
          <Scale size={16} strokeWidth={2.4} aria-hidden="true" />
        )}
        {isCompared
          ? "Ajouté au comparateur"
          : canonicalDuplicate
            ? "Propriété déjà ajoutée"
            : isFull
              ? "Comparateur plein"
              : "Comparer"}
      </button>
      {feedback ? <p className="text-[11px] font-semibold text-gray-500">{feedback}</p> : null}
    </div>
  );
}
