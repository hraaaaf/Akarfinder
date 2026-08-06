import Link from "next/link";
import { Compass } from "lucide-react";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";

export function SearchEntryOrchestrator() {
  return (
    <div className="w-full">
      <HomeSearchBar />

      <div className="mt-4 flex justify-center sm:mt-5">
        <Link
          href="/compagnon"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/34 bg-black/18 px-4 py-2.5 text-[12px] font-bold text-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-sm transition-colors hover:border-white/55 hover:bg-black/26 hover:text-white sm:px-5 sm:text-[13px]"
        >
          <Compass size={15} strokeWidth={2.2} aria-hidden="true" />
          Pas encore sûr de vos critères ? Construisez votre projet
        </Link>
      </div>
    </div>
  );
}
