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
    <div className="relative overflow-hidden rounded-[20px] bg-white/[0.9] shadow-[0_30px_80px_-12px_rgba(4,18,42,0.55),0_8px_24px_-8px_rgba(4,18,42,0.3)] ring-1 ring-white/50 backdrop-blur-xl supports-[backdrop-filter]:bg-white/[0.82]">

      {/* Hairline bronze — fusion premium avec le hero */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C2A368]/70 to-transparent" />

      {/* ── Tab strip ── */}
      <div className="flex border-b border-[#e8deca]/70">
        {TRANSACTION_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTxType(t.value)}
            className={`flex-1 py-3 text-[13.5px] font-bold tracking-[-0.01em] transition ${
              txType === t.value
                ? "border-b-2 border-[#9B7838] bg-white text-[#8f6a2a]"
                : "bg-[#f8f4ec] text-gray-500 hover:bg-white hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Main search row ── */}
      <div className="flex items-stretch gap-0 p-3 sm:gap-2 sm:p-4">

        {/* Location input */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#e3d8c4] bg-[#fdfaf5] px-3.5 focus-within:border-[#9B7838] focus-within:ring-2 focus-within:ring-[#9B7838]/15 sm:px-4">
          <span className="shrink-0 text-[#9B7838]"><SearchIcon /></span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ville, quartier, adresse…"
            aria-label="Recherche par lieu"
            className="min-w-0 flex-1 bg-transparent py-3 text-[14.5px] font-medium text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>

        {/* Property type select */}
        <select
          value={propType}
          onChange={(e) => setPropType(e.target.value)}
          aria-label="Type de bien"
          className="hidden shrink-0 cursor-pointer appearance-none rounded-xl border border-[#e3d8c4] bg-[#fdfaf5] px-4 py-3 text-[13.5px] font-bold text-gray-700 outline-none transition hover:border-[#9B7838] focus:border-[#9B7838] sm:block"
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
          className="ml-1.5 flex shrink-0 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#b8893b_0%,#8f6a2a_100%)] px-5 py-3 text-[14px] font-extrabold text-white shadow-[0_6px_22px_rgba(143,106,42,0.42),inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:brightness-105 hover:shadow-[0_10px_28px_rgba(143,106,42,0.52)] active:scale-[0.98] sm:px-7 sm:text-[15px]"
        >
          <SearchIcon />
          <span className="hidden sm:inline">Rechercher</span>
        </Link>
      </div>

      {/* ── Quick chips ── */}
      <div className="flex items-center gap-2 border-t border-[#ede7d9] px-4 py-2.5">
        <span className="shrink-0 text-[11.5px] font-semibold text-gray-400">Ex :</span>
        <div className="flex flex-nowrap gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => applyChip(chip)}
              className="shrink-0 rounded-full border border-[#ddd0b4] bg-white px-3 py-1 text-[11.5px] font-medium text-gray-600 whitespace-nowrap transition hover:border-[#9B7838]/50 hover:text-[#8f6a2a]"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
