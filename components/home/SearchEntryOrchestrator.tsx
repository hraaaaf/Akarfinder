import Link from "next/link";
import { Compass, FolderOpen } from "lucide-react";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";

export function SearchEntryOrchestrator() {
  return (
    <div className="w-full">
      <div className="rounded-3xl border border-white/20 bg-black/12 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-md sm:p-4">
        <p className="mb-3 text-[12px] font-extrabold text-white/90 sm:text-[13px]">
          Je sais ce que je cherche
        </p>
        <HomeSearchBar />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2.5 sm:mt-5">
        <Link
          href="/compagnon"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/24 bg-black/10 px-4 py-2 text-[11.5px] font-semibold text-white/90 backdrop-blur-sm transition-colors hover:border-white/45 hover:bg-black/18 hover:text-white sm:text-[12.5px]"
        >
          <Compass size={14} strokeWidth={2.2} aria-hidden="true" />
          Aidez-moi à définir mon projet
        </Link>
        <Link
          href="/mon-projet"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/24 bg-black/10 px-4 py-2 text-[11.5px] font-semibold text-white/90 backdrop-blur-sm transition-colors hover:border-white/45 hover:bg-black/18 hover:text-white sm:text-[12.5px]"
        >
          <FolderOpen size={14} strokeWidth={2.2} aria-hidden="true" />
          Reprendre Mon Projet
        </Link>
      </div>
    </div>
  );
}
