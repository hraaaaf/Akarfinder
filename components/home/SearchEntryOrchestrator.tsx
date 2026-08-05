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
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/28 bg-black/14 px-4 py-2 text-[12px] font-semibold text-white/92 backdrop-blur-sm transition-colors hover:border-white/50 hover:bg-black/22 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061027] sm:text-[13px]"
        >
          <Compass size={15} strokeWidth={2.2} aria-hidden="true" />
          Je ne sais pas encore quoi chercher
        </Link>
      </div>
    </div>
  );
}
