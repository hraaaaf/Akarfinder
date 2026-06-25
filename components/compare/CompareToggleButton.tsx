"use client";

import { useEffect, useState } from "react";
import { Check, Scale, X } from "lucide-react";
import {
  addCompareId,
  dispatchCompareUpdated,
  isListingCompared,
  readCompareIds,
  removeCompareId,
} from "@/lib/compare/compare-storage";
import { MAX_COMPARE_LISTINGS } from "@/lib/compare/types";

type CompareToggleButtonProps = {
  listingId: string;
  variant?: "inline" | "block";
  className?: string;
};

export function CompareToggleButton({
  listingId,
  variant = "inline",
  className = "",
}: CompareToggleButtonProps) {
  const [isCompared, setIsCompared] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    function sync() {
      const storage = window.localStorage;
      const ids = readCompareIds(storage);
      setIsCompared(ids.includes(listingId));
      setIsFull(ids.length >= MAX_COMPARE_LISTINGS && !ids.includes(listingId));
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("akarfinder:compare-updated", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("akarfinder:compare-updated", sync);
    };
  }, [listingId]);

  function handleToggle() {
    if (typeof window === "undefined") return;

    const storage = window.localStorage;
    const result = isListingCompared(listingId, storage)
      ? removeCompareId(listingId, storage)
      : addCompareId(listingId, storage);

    if (!result.ok) {
      setFeedback(`Comparateur plein (${MAX_COMPARE_LISTINGS} biens max)`);
      setIsFull(true);
      return;
    }

    dispatchCompareUpdated(result.ids);
    setIsCompared(result.ids.includes(listingId));
    setIsFull(result.ids.length >= MAX_COMPARE_LISTINGS && !result.ids.includes(listingId));
    setFeedback(result.status === "removed" ? "Retiré du comparateur" : "Ajouté au comparateur");
  }

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
            ? "Retirer ce bien du comparateur"
            : "Ajouter ce bien au comparateur"
        }
        className={`${buttonClasses} ${
          isCompared
            ? "border-[#c8b07d] bg-[#fff7e6] text-[#8a6a2f] hover:bg-[#fff1d0]"
            : isFull
              ? "cursor-not-allowed border-[#eadfca] bg-[#faf8f2] text-gray-400"
              : "border-[#eadfca] bg-white text-deepblue hover:border-[#d8c8a3] hover:bg-[#f7f3ea]"
        } ${className}`}
        disabled={isFull && !isCompared}
      >
        {isCompared ? (
          <Check size={16} strokeWidth={2.4} aria-hidden="true" />
        ) : isFull ? (
          <X size={16} strokeWidth={2.4} aria-hidden="true" />
        ) : (
          <Scale size={16} strokeWidth={2.4} aria-hidden="true" />
        )}
        {isCompared ? "Ajouté au comparateur" : isFull ? "Comparateur plein" : "Comparer"}
      </button>
      {feedback ? (
        <p className="text-[11px] font-semibold text-gray-500">{feedback}</p>
      ) : null}
    </div>
  );
}
