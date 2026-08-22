import Link from "next/link";
import { Compass, MapPinned, SearchCheck, ShieldCheck } from "lucide-react";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";

export function SearchEntryOrchestrator() {
  return (
    <div className="w-full">
      <HomeSearchBar />

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10.5px] font-bold text-white/78 sm:text-[11px] lg:justify-start">
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
        <Link
          href="/compagnon"
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.07] px-3 py-1.5 text-white/92 transition hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60"
        >
          <Compass size={13} strokeWidth={2.1} aria-hidden="true" />
          Construire mon projet
        </Link>
      </div>
    </div>
  );
}
