"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { track } from "@/lib/tracking/track";
import { parseNaturalSearchQuery, parsedQueryToParams } from "@/lib/search/natural-query-parser";

const INTENT_CHIPS = [
  { label: "Acheter",  type: "buy",  property_type: undefined },
  { label: "Louer",   type: "rent", property_type: undefined },
  { label: "Neuf",    type: "new",  property_type: undefined },
  { label: "Terrain", type: "buy",  property_type: "Terrain" },
  { label: "Villa",   type: "buy",  property_type: "Villa"   },
  { label: "Bureau",  type: "buy",  property_type: "Bureau"  },
  { label: "Meublé",  type: "rent", property_type: undefined },
] as const;

const EXAMPLES = [
  "Appartement neuf Rabat Agdal",
  "Villa Dar Bouazza avec piscine",
  "Terrain titré Marrakech",
  "Studio meublé Casablanca",
  "Bureau à louer Finance City",
];

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

      // Chip property_type (Villa, Terrain, Bureau) wins over parser.
      // Chip type acts as fallback when parser didn't detect an intent.
      // "Meublé" chip adds furnished=true even if parser misses the accent.
      const isMeuble = activeChip === "Meublé" || parsed.furnished;
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
    if (chip.label === "Meublé") {
      setQuery("meublé");
      inputRef.current?.focus();
    }
  };

  // Clicking an example fills the input AND triggers the search immediately.
  const applyExample = (ex: string) => {
    setQuery(ex);
    handleSearch(ex);
  };

  return (
    <div className="w-full">
      {/* ── Search input row ── */}
      <div className="flex items-stretch overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.06] shadow-[0_12px_48px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all focus-within:border-[#C2A368]/45 focus-within:shadow-[0_12px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(194,163,104,0.18)]">
        {/* Input */}
        <div className="flex flex-1 items-center gap-3 px-4 py-1 sm:px-5">
          <Search
            size={18}
            strokeWidth={2.2}
            className="shrink-0 text-[#C2A368]/60"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Appartement meublé à Casablanca Maarif moins de 8 000 DH…"
            aria-label="Recherche de bien immobilier au Maroc"
            className="min-w-0 flex-1 bg-transparent py-4 text-[15px] font-medium text-white outline-none placeholder:text-white/25 sm:text-[16px]"
          />
        </div>

        {/* CTA button */}
        <button
          type="button"
          onClick={() => handleSearch()}
          aria-label="Lancer la recherche"
          className="m-1.5 flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-[#C2A368] to-[#8f6a2a] px-5 py-3 text-[14px] font-extrabold text-white shadow-[0_4px_20px_rgba(155,120,56,0.45)] transition hover:brightness-110 active:scale-[0.97] sm:px-7 sm:text-[15px]"
        >
          <Search size={15} strokeWidth={2.4} aria-hidden="true" />
          <span className="hidden sm:inline">Rechercher</span>
        </button>
      </div>

      {/* ── Intent chips ── */}
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
            className={`shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-bold transition ${
              activeChip === chip.label
                ? "border-[#C2A368]/55 bg-[#C2A368]/15 text-[#C2A368]"
                : "border-white/12 bg-white/[0.04] text-white/55 hover:border-white/22 hover:text-white/80"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Example searches ── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        <span className="text-[11px] font-semibold text-white/28">Exemples :</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => applyExample(ex)}
            className="rounded-full border border-white/[0.08] px-3 py-1 text-[11px] text-white/38 transition hover:border-white/18 hover:text-white/65"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
