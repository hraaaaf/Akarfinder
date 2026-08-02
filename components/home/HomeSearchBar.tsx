"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { track } from "@/lib/tracking/track";
import { parseNaturalSearchQuery, parsedQueryToParams } from "@/lib/search/natural-query-parser";

const INTENT_CHIPS = [
  { label: "Acheter", type: "buy", property_type: undefined },
  { label: "Louer", type: "rent", property_type: undefined },
  { label: "Neuf", type: "new", property_type: undefined },
  { label: "Terrain", type: "buy", property_type: "Terrain" },
  { label: "Villa", type: "buy", property_type: "Villa" },
  { label: "Bureau", type: "buy", property_type: "Bureau" },
  { label: "Meuble", type: "rent", property_type: undefined },
] as const;

const EXAMPLES = [
  "Appartement neuf Rabat Agdal",
  "Villa Dar Bouazza avec piscine",
  "Terrain titre Marrakech",
  "Studio meuble Casablanca",
  "Bureau a louer Finance City",
] as const;

export function HomeSearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState("Acheter");
  const [intent, setIntent] = useState<{ type: string; property_type?: string }>({
    type: "buy",
  });

  const handleSearch = useCallback(
    (overrideQ?: string) => {
      const q = overrideQ ?? query;
      const parsed = parseNaturalSearchQuery(q);
      const isMeuble = activeChip === "Meuble" || parsed.furnished;
      if (isMeuble && !parsed.furnished) parsed.furnished = true;

      const params = parsedQueryToParams(
        parsed,
        intent.type as "buy" | "rent" | "new",
        intent.property_type
      );

      track({
        event_name: "hero_search_submit",
        source_page: "/",
        intent: parsed.intent ?? intent.type,
        metadata: {
          q: q.trim() || null,
          chip: activeChip,
          city: parsed.city ?? null,
          budget_max: parsed.budget_max ?? null,
        },
      });

      const qs = params.toString();
      router.push(`/search${qs ? `?${qs}` : ""}`);
    },
    [query, intent, activeChip, router]
  );

  const applyChip = (chip: (typeof INTENT_CHIPS)[number]) => {
    setActiveChip(chip.label);
    setIntent({ type: chip.type, property_type: chip.property_type });
    if (chip.label === "Meuble") {
      setQuery("meuble");
      inputRef.current?.focus();
    }
  };

  const applyExample = (example: string) => {
    setQuery(example);
    handleSearch(example);
  };

  return (
    <div className="w-full">
      <div className="flex min-h-[58px] items-stretch overflow-hidden rounded-2xl border border-white/35 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.22)] transition-[border-color,box-shadow] focus-within:border-[#60A5FA] focus-within:shadow-[0_16px_48px_rgba(15,23,42,0.28),0_0_0_3px_rgba(96,165,250,0.16)] sm:min-h-[66px]">
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 sm:px-6">
          <Search
            size={20}
            strokeWidth={2.1}
            className="shrink-0 text-[#0B63CE]"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ville, quartier, type de bien, budget..."
            aria-label="Rechercher un bien immobilier au Maroc"
            className="min-w-0 flex-1 bg-transparent py-4 text-[15px] font-medium text-[#0B1F3A] outline-none placeholder:text-slate-500 sm:text-[17px]"
          />
        </div>

        <button
          type="button"
          onClick={() => handleSearch()}
          aria-label="Lancer la recherche immobilière"
          className="m-1.5 flex min-w-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-4 text-[13px] font-extrabold text-white shadow-sm transition-[background-color,transform] hover:bg-[#084FA8] active:scale-[0.98] sm:min-w-0 sm:px-7 sm:text-[15px]"
        >
          <Search size={17} strokeWidth={2.4} aria-hidden="true" />
          <span className="hidden sm:inline">Rechercher</span>
        </button>
      </div>

      <div
        className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] sm:justify-center"
        role="group"
        aria-label="Affiner rapidement la recherche"
      >
        {INTENT_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            aria-pressed={activeChip === chip.label}
            onClick={() => applyChip(chip)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors sm:px-3.5 sm:text-[12px] ${
              activeChip === chip.label
                ? "border-white/70 bg-white text-[#0B3F80]"
                : "border-white/28 bg-black/10 text-white/88 hover:border-white/50 hover:bg-black/18 hover:text-white"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mt-2.5 hidden flex-wrap items-center justify-center gap-x-2 gap-y-1.5 lg:flex">
        <span className="text-[11px] font-medium text-white/60">Essayez :</span>
        {EXAMPLES.slice(0, 3).map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => applyExample(example)}
            className="text-[11px] text-white/72 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
