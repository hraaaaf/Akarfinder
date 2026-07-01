"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { track } from "@/lib/tracking/track";

const TRANSACTION_TYPES = [
  { value: "buy",  label: "Acheter" },
  { value: "rent", label: "Louer"   },
  { value: "new",  label: "Neuf"    },
] as const;

const PROPERTY_TYPES = [
  "Appartement",
  "Villa",
  "Terrain",
  "Bureau",
  "Studio",
] as const;

const QUICK_CHIPS = [
  { label: "Appartement Casablanca", city: "Casablanca", type: "buy", pt: "Appartement" },
  { label: "Villa Marrakech",         city: "Marrakech",  type: "buy", pt: "Villa"       },
  { label: "Location Rabat",          city: "Rabat",      type: "rent", pt: ""           },
  { label: "Terrain Agadir",          city: "Agadir",     type: "buy", pt: "Terrain"     },
];


export function SearchPanel() {
  const [txType, setTxType]   = useState<"buy" | "rent" | "new">("buy");
  const [propType, setPropType] = useState("Appartement");
  const [location, setLocation] = useState("");

  const searchHref = useMemo(() => {
    const params = new URLSearchParams();
    if (txType !== "buy") params.set("type", txType);
    if (propType !== "Appartement") params.set("property_type", propType);
    if (location.trim()) params.set("q", location.trim());
    const query = params.toString();
    return query ? `/search?${query}` : "/search";
  }, [txType, propType, location]);

  const applyChip = (chip: (typeof QUICK_CHIPS)[number]) => {
    setTxType(chip.type as "buy" | "rent" | "new");
    if (chip.pt) setPropType(chip.pt);
    setLocation(chip.city);
  };

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-white/[0.95] shadow-[0_20px_60px_-8px_rgba(11,99,206,0.25),0_4px_12px_-4px_rgba(11,99,206,0.15)] ring-1 ring-white/60 backdrop-blur-sm supports-[backdrop-filter]:bg-white/[0.93]">

      {/* Hairline bleu — fusion premium avec le hero blanc/bleu */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#0B63CE]/40 to-transparent" />

      {/* ── Tab strip ── */}
      <div className="flex border-b border-blue-100">
        {TRANSACTION_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTxType(t.value)}
            className={`flex-1 py-3 text-[13.5px] font-bold tracking-[-0.01em] transition ${
              txType === t.value
                ? "border-b-2 border-[#0B63CE] bg-white text-[#0B63CE]"
                : "bg-blue-50 text-gray-600 hover:bg-white hover:text-[#0B63CE]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Main search row ── */}
      <div className="flex items-stretch gap-0 p-3 sm:gap-2 sm:p-4">

        {/* Location input */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50/50 px-3.5 focus-within:border-[#0B63CE] focus-within:ring-2 focus-within:ring-[#0B63CE]/15 sm:px-4">
          <span className="shrink-0 text-[#0B63CE]"><SearchIcon /></span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ville, quartier, adresse…"
            aria-label="Recherche par lieu"
            className="min-w-0 flex-1 bg-transparent py-3 text-[14.5px] font-medium text-[#071B33] outline-none placeholder:text-gray-500"
          />
        </div>

        {/* Property type select */}
        <select
          value={propType}
          onChange={(e) => setPropType(e.target.value)}
          aria-label="Type de bien"
          className="hidden shrink-0 cursor-pointer appearance-none rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-[13.5px] font-bold text-[#071B33] outline-none transition hover:border-[#0B63CE] focus:border-[#0B63CE] sm:block"
        >
          {PROPERTY_TYPES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* CTA */}
        <Link
          href={searchHref}
          onClick={() =>
            track({
              event_name: "hero_search_submit",
              source_page: "/",
              intent: txType,
              metadata: { q: location.trim() || null, property_type: propType },
            })
          }
          className="ml-1.5 flex shrink-0 items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-[14px] font-extrabold text-white shadow-[0_6px_20px_rgba(11,99,206,0.36),inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:bg-[#084BA8] hover:shadow-[0_10px_28px_rgba(11,99,206,0.45)] active:scale-[0.98] sm:px-7 sm:text-[15px]"
        >
          <SearchIcon />
          <span className="hidden sm:inline">Rechercher</span>
        </Link>
      </div>

      {/* ── Quick chips — desktop only ── */}
      <div className="hidden items-center gap-2 border-t border-blue-100 px-4 py-2.5 sm:flex">
        <span className="shrink-0 text-[11.5px] font-semibold text-gray-500">Ex :</span>
        <div className="flex flex-nowrap gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => applyChip(chip)}
              className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11.5px] font-medium text-[#0B63CE] whitespace-nowrap transition hover:border-[#0B63CE] hover:bg-blue-100"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
