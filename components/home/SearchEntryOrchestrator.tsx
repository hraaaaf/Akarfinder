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
          className="inline-flex items-center gap-1.5 rounded-full border border-white/24 bg-black/10 px-4 py-2 text-[11.5px] font-semibold text-white/90 backdrop-blur-sm transition-colors hover:border-white/45 hover:bg-black/18 hover:text-white sm:text-[12.5px]"
        >
          <Compass size={14} strokeWidth={2.2} aria-hidden="true" />
          Vous hésitez sur votre projet ? Lancer le Compagnon
        </Link>
      </div>
    </div>
  );
}
