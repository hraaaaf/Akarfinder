"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { track } from "@/lib/tracking/track";
import { parseNaturalSearchQuery, parsedQueryToParams } from "@/lib/search/natural-query-parser";

const CHIPS = [
  { label: "Acheter", kind: "intent", type: "buy" },
  { label: "Louer", kind: "intent", type: "rent" },
  { label: "Neuf", kind: "intent", type: "new" },
  { label: "Villa", kind: "property", property_type: "Villa" },
  { label: "Terrain", kind: "property", property_type: "Terrain" },
  { label: "Bureau", kind: "property", property_type: "Bureau" },
  { label: "Meublé", kind: "furnished" },
] as const;

const EXAMPLES = [
  "Appartement à Agdal",
  "Villa avec piscine à Bouskoura",
  "Studio meublé à Maârif",
] as const;

export function HomeSearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<"buy" | "rent" | "new">("buy");
  const [propertyType, setPropertyType] = useState<string | undefined>();
  const [furnished, setFurnished] = useState(false);

  const handleSearch = useCallback(
    (overrideQ?: string) => {
      const q = overrideQ ?? query;
      const parsed = parseNaturalSearchQuery(q);
      if (furnished && !parsed.furnished) parsed.furnished = true;

      const params = parsedQueryToParams(parsed, intent, propertyType);

      track({
        event_name: "hero_search_submit",
        source_page: "/",
        intent: parsed.intent ?? intent,
        metadata: {
          q: q.trim() || null,
          property_type: propertyType ?? null,
          furnished,
          city: parsed.city ?? null,
          budget_max: parsed.budget_max ?? null,
        },
      });

      const qs = params.toString();
      router.push(`/search${qs ? `?${qs}` : ""}`);
    },
    [query, intent, propertyType, furnished, router]
  );

  const applyChip = (chip: (typeof CHIPS)[number]) => {
    if (chip.kind === "intent") {
      setIntent(chip.type);
      return;
    }

    if (chip.kind === "property") {
      setPropertyType((current) => (current === chip.property_type ? undefined : chip.property_type));
      return;
    }

    setFurnished((current) => !current);
    setIntent("rent");
    inputRef.current?.focus();
  };

  const isChipActive = (chip: (typeof CHIPS)[number]) => {
    if (chip.kind === "intent") return intent === chip.type;
    if (chip.kind === "property") return propertyType === chip.property_type;
    return furnished;
  };

  const applyExample = (example: string) => {
    setQuery(example);
    handleSearch(example);
  };

  return (
    <form
      className="w-full"
      role="search"
      aria-label="Recherche immobilière"
      onSubmit={(event) => {
        event.preventDefault();
        handleSearch();
      }}
    >
      <div className="flex items-stretch overflow-hidden rounded-2xl border border-[#BFDBFE]/20 bg-white/85 shadow-[0_12px_32px_rgba(15,23,42,0.18)] backdrop-blur-md transition-all focus-within:border-[#60A5FA]/55 focus-within:shadow-[0_12px_42px_rgba(37,99,235,0.18),0_0_0_1px_rgba(96,165,250,0.22)] sm:bg-white/30 sm:shadow-[0_12px_48px_rgba(0,0,0,0.45)] sm:focus-within:shadow-[0_12px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(96,165,250,0.22)]">
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-0.5 sm:px-5 sm:py-1">
          <Search
            size={18}
            strokeWidth={2.2}
            className="shrink-0 text-[#0B63CE]/55 sm:text-[#BFDBFE]/70"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex. appartement à Agdal, villa à Bouskoura…"
            aria-label="Ville, quartier ou type de bien"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[14px] font-medium text-[#0B1F3A] outline-none placeholder:text-slate-400 sm:py-4 sm:text-[16px] sm:text-[#061B33] sm:placeholder:text-slate-500"
          />
        </div>

        <button
          type="submit"
          className="m-1.5 flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#0B63CE] to-[#084FA8] px-3 py-3 text-[12px] font-extrabold text-white shadow-[0_4px_20px_rgba(11,99,206,0.32)] transition hover:brightness-110 active:scale-[0.97] sm:gap-2 sm:px-7 sm:text-[15px]"
        >
          <Search size={15} strokeWidth={2.4} aria-hidden="true" />
          <span>Rechercher</span>
        </button>
      </div>

      <div
        className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none]"
        role="group"
        aria-label="Affiner la recherche"
      >
        {CHIPS.map((chip) => {
          const active = isChipActive(chip);
          return (
            <button
              key={chip.label}
              type="button"
              aria-pressed={active}
              onClick={() => applyChip(chip)}
              className={`min-h-11 shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-bold transition sm:px-4 sm:text-[12.5px] ${
                active
                  ? "border-[#0B63CE] bg-[#0B63CE] text-white shadow-[0_2px_8px_rgba(11,99,206,0.3)] hover:bg-[#084BA8]"
                  : "border-[#BFDBFE]/40 bg-white/88 text-[#061B33] hover:border-[#60A5FA] hover:bg-blue-50"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 hidden flex-wrap items-center justify-center gap-x-1.5 gap-y-2 sm:flex">
        <span className="text-[11px] font-semibold text-white/70">Exemples :</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => applyExample(example)}
            className="rounded-full border border-white/30 px-3 py-1.5 text-[11px] text-white/85 transition hover:border-white/60 hover:text-white"
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  );
}
