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
      <div className="flex items-stretch overflow-hidden rounded-2xl border border-[#BFDBFE]/20 bg-white/85 shadow-[0_12px_32px_rgba(15,23,42,0.18)] backdrop-blur-md transition-all focus-within:border-[#60A5FA]/55 focus-within:shadow-[0_12px_42px_rgba(37,99,235,0.18),0_0_0_1px_rgba(96,165,250,0.22)] sm:bg-white/30 sm:shadow-[0_12px_48px_rgba(0,0,0,0.45)] sm:focus-within:shadow-[0_12px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(96,165,250,0.22)]">
        <div className="flex flex-1 items-center gap-3 px-4 py-0.5 sm:px-5 sm:py-1">
          <Search
            size={18}
            strokeWidth={2.2}
            className="shrink-0 text-[#0B63CE]/55 sm:text-[#BFDBFE]/70"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Rechercher un bien..."
            aria-label="Recherche de bien immobilier au Maroc"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] font-medium text-[#0B1F3A] outline-none placeholder:text-slate-400 sm:py-4 sm:text-[16px] sm:text-white sm:placeholder:text-white/30"
          />
        </div>

        <button
          type="button"
          onClick={() => handleSearch()}
          aria-label="Lancer la recherche"
          className="m-1.5 flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B63CE] to-[#084FA8] px-4 py-3 text-[13px] font-extrabold text-white shadow-[0_4px_20px_rgba(11,99,206,0.32)] transition hover:brightness-110 active:scale-[0.97] sm:px-7 sm:text-[15px]"
        >
          <Search size={15} strokeWidth={2.4} aria-hidden="true" />
          <span className="hidden sm:inline">Rechercher</span>
        </button>
      </div>

      <div
        className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none]"
        role="group"
        aria-label="Type de recherche"
      >
        {INTENT_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => applyChip(chip)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition sm:px-4 sm:text-[12.5px] ${
              activeChip === chip.label
                ? "border-[#0B63CE] bg-[#0B63CE] text-white shadow-[0_2px_8px_rgba(11,99,206,0.3)] hover:bg-[#084BA8]"
                : "border-[#BFDBFE]/40 bg-white/88 text-[#061B33] hover:border-[#60A5FA] hover:bg-blue-50"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mt-3 hidden flex-wrap items-center gap-x-1.5 gap-y-2 sm:flex">
        <span className="text-[11px] font-semibold text-white/30">Exemples :</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => applyExample(example)}
            className="rounded-full border border-white/[0.08] px-3 py-1 text-[11px] text-white/42 transition hover:border-[#BFDBFE]/24 hover:text-white/72"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
