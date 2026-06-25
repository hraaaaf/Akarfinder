"use client";

import Link from "next/link";
import { Scale, Trash2 } from "lucide-react";
import {
  clearCompareIds,
  dispatchCompareUpdated,
} from "@/lib/compare/compare-storage";
import { MIN_COMPARE_LISTINGS } from "@/lib/compare/types";
import { useCompareSelection } from "@/components/compare/useCompareSelection";

type CompareBarProps = {
  mobileOffsetClassName?: string;
};

export function CompareBar({
  mobileOffsetClassName = "bottom-4",
}: CompareBarProps) {
  const { ids } = useCompareSelection();

  if (ids.length === 0) return null;

  const countLabel = `${ids.length} bien${ids.length > 1 ? "s" : ""} à comparer`;

  function handleClear() {
    if (typeof window === "undefined") return;
    const result = clearCompareIds(window.localStorage);
    if (result.ok) {
      dispatchCompareUpdated(result.ids);
    }
  }

  return (
    <div
      className={`fixed inset-x-4 z-30 mx-auto max-w-[780px] rounded-[1.35rem] border border-[#dcc89a] bg-[#071b33]/96 px-4 py-3 text-white shadow-[0_22px_48px_rgba(7,27,51,0.26)] backdrop-blur md:inset-x-6 md:bottom-6 ${mobileOffsetClassName}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.12em] text-bronze-400">
            <Scale size={16} strokeWidth={2.4} aria-hidden="true" />
            Comparateur AkarFinder
          </p>
          <p className="mt-1 text-[15px] font-extrabold text-white">{countLabel}</p>
          <p className="mt-1 text-[12px] text-white/70">
            {ids.length < MIN_COMPARE_LISTINGS
              ? "Ajoutez au moins 2 biens pour lancer la comparaison."
              : "Signaux indicatifs, prix observé et package score côte à côte."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/compare"
            aria-disabled={ids.length < MIN_COMPARE_LISTINGS}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-[13px] font-extrabold transition ${
              ids.length < MIN_COMPARE_LISTINGS
                ? "pointer-events-none bg-white/10 text-white/40"
                : "bg-[#c2a368] text-deepblue hover:bg-[#d1b57f]"
            }`}
          >
            Comparer
          </Link>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-[13px] font-extrabold text-white transition hover:bg-white/14"
          >
            <Trash2 size={15} strokeWidth={2.3} aria-hidden="true" />
            Vider
          </button>
        </div>
      </div>
    </div>
  );
}
