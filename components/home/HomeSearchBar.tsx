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
  { label: "Meublé", type: "rent", property_type: undefined },
] as const;

const EXAMPLES = [
  "Appartement neuf à Rabat Agdal",
  "Villa à Dar Bouazza avec piscine",
  "Terrain titré à Marrakech",
  "Studio meublé à Casablanca",
  "Bureau à louer à Finance City",
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
      const isFurnished = activeChip === "Meublé" || parsed.furnished;
      if (isFurnished && !parsed.furnished) parsed.furnished = true;

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
    if (chip.label === "Meublé") {
      setQuery("meublé");
      inputRef.current?.focus();
    }
  };

  const applyExample = (example: string) => {
    setQuery(example);
    handleSearch(example);
  };

  return (
    <form
      className="w-full"
      role="search"
      aria-label="Rechercher un bien immobilier"
      onSubmit={(event) => {
        event.preventDefault();
        handleSearch();
      }}
    >
      <div className="flex items-stretch overflow-hidden rounded-2xl border border-[#BFDBFE]/24 bg-white/92 shadow-[0_12px_34px_rgba(15,23,42,0.22)] backdrop-blur-md transition-all focus-within:border-[#60A5FA]/65 focus-within:shadow-[0_12px_44px_rgba(37,99,235,0.20),0_0_0_2px_rgba(96,165,250,0.22)] sm:bg-white/94 sm:shadow-[0_14px_50px_rgba(0,0,0,0.34)]">
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-0.5 sm:px-5 sm:py-1">
          <Search
            size={18}
            strokeWidth={2.2}
            className="shrink-0 text-[#0B63CE]/65"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ville, quartier, type de bien..."
            aria-label="Ville, quartier ou type de bien"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] font-semibold text-[#0B1F3A] outline-none placeholder:font-medium placeholder:text-slate-500 sm:py-4 sm:text-[16px]"
          />
        </div>

        <button
          type="submit"
          className="m-1.5 flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-[#0B63CE] to-[#084FA8] px-4 py-3 text-[13px] font-extrabold text-white shadow-[0_4px_20px_rgba(11,99,206,0.32)] transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B63CE] sm:px-7 sm:text-[15px]"
        >
          <Search size={15} strokeWidth={2.4} aria-hidden="true" />
          <span>Rechercher</span>
        </button>
      </div>

      <div
        className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none]"
        role="group"
        aria-label="Type de recherche"
      >
        {INTENT_CHIPS.map((chip) => {
          const isActive = activeChip === chip.label;
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => applyChip(chip)}
              aria-pressed={isActive}
              className={`min-h-10 shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061027] sm:px-4 sm:text-[12.5px] ${
                isActive
                  ? "border-[#0B63CE] bg-[#0B63CE] text-white shadow-[0_2px_8px_rgba(11,99,206,0.3)] hover:bg-[#084BA8]"
                  : "border-white/45 bg-white/92 text-[#061B33] hover:border-[#60A5FA] hover:bg-blue-50"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 hidden flex-wrap items-center justify-center gap-x-1.5 gap-y-2 sm:flex">
        <span className="text-[11px] font-semibold text-white/72">Exemples :</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => applyExample(example)}
            className="rounded-full border border-white/32 bg-black/8 px-3 py-1 text-[11px] text-white/88 transition hover:border-white/62 hover:bg-black/16 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85"
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  );
}
