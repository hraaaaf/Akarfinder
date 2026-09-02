"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { finderProjectionFromSearchParams } from "@/lib/search-profile-v2/listing-personalization";

export function SearchPersonalizationControl() {
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const projection = finderProjectionFromSearchParams(new URLSearchParams(window.location.search));
    setVisible(Boolean(projection));
    setEnabled(projection?.enabled ?? true);
  }, []);

  if (!visible) return null;

  function setPersonalization(nextEnabled: boolean) {
    const url = new URL(window.location.href);
    if (nextEnabled) url.searchParams.delete("personalized");
    else url.searchParams.set("personalized", "0");
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div className="mx-auto max-w-[1480px] px-4 pt-2 sm:px-6" data-search-personalization-control>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#CFE0F5] bg-[#F7FAFE] px-3 py-2.5 text-[#173A63] dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0B63CE] text-white">
            <Sparkles size={15} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold">Finder {enabled ? "personnalise le tri recommandé" : "est en pause"}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-white/55">Les filtres classiques restent inchangés.</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setPersonalization(!enabled)}
          className={`inline-flex min-h-9 items-center rounded-full border px-3 text-[11px] font-extrabold transition ${enabled ? "border-[#0B63CE] bg-[#EAF3FF] text-[#084FA8]" : "border-slate-200 bg-white text-slate-600 dark:bg-white/5 dark:text-white/70"}`}
        >
          {enabled ? "Personnalisation active" : "Activer la personnalisation"}
        </button>
      </div>
    </div>
  );
}
