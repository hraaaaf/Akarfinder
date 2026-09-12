import { MapPinned, SearchCheck, ShieldCheck } from "lucide-react";

import { HomeSearchBar } from "@/components/home/HomeSearchBar";

export function SearchEntryOrchestrator() {
  return (
    <div className="w-full">
      <HomeSearchBar />

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10.5px] font-bold text-white/78 sm:text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <SearchCheck size={14} strokeWidth={2.1} aria-hidden="true" />
          Recherche multi-critères
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPinned size={14} strokeWidth={2.1} aria-hidden="true" />
          Carte du marché
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={14} strokeWidth={2.1} aria-hidden="true" />
          Sources affichées quand disponibles
        </span>
      </div>
    </div>
  );
}
