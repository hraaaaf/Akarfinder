import Link from "next/link";
import { Compass, Search } from "lucide-react";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";

export function SearchEntryOrchestrator() {
  return (
    <div className="w-full">
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/20 bg-white/12 p-1.5 backdrop-blur-md sm:mb-4">
        <div className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 text-center text-[12px] font-extrabold text-[#0B1F3A] shadow-sm sm:text-[13px]">
          <Search size={15} strokeWidth={2.4} aria-hidden="true" />
          <span>Je sais ce que je cherche</span>
        </div>
        <Link
          href="/compagnon"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-center text-[12px] font-extrabold text-white transition hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-[#93C5FD] sm:text-[13px]"
        >
          <Compass size={15} strokeWidth={2.4} aria-hidden="true" />
          <span>Aidez-moi à trouver</span>
        </Link>
      </div>

      <HomeSearchBar />

      <div className="mt-3 flex justify-center sm:mt-4">
        <Link
          href="/compagnon"
          className="rounded-full border border-white/25 bg-black/10 px-4 py-2 text-[11px] font-semibold text-white/90 backdrop-blur transition hover:border-white/50 hover:bg-black/20 hover:text-white sm:text-[12px]"
        >
          Pas encore sûr ? Construire mon projet avec le Compagnon AkarFinder
        </Link>
      </div>
    </div>
  );
}
