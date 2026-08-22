"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { track } from "@/lib/tracking/track";
import { parseNaturalSearchQuery, parsedQueryToParams } from "@/lib/search/natural-query-parser";

const INTENTS = [
  { label: "Acheter", type: "buy" },
  { label: "Louer", type: "rent" },
  { label: "Neuf", type: "new" },
] as const;

type Intent = (typeof INTENTS)[number]["type"];

export function HomeSearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<Intent>("buy");

  const handleSearch = useCallback(() => {
    const parsed = parseNaturalSearchQuery(query);
    const params = parsedQueryToParams(parsed, intent);

    track({
      event_name: "hero_search_submit",
      source_page: "/",
      intent: parsed.intent ?? intent,
      metadata: {
        q: query.trim() || null,
        property_type: parsed.property_type ?? null,
        furnished: parsed.furnished ?? false,
        city: parsed.city ?? null,
        budget_max: parsed.budget_max ?? null,
      },
    });

    const qs = params.toString();
    router.push(`/search${qs ? `?${qs}` : ""}`);
  }, [query, intent, router]);

  return (
    <form
      data-home-search="hvr-1"
      className="w-full"
      role="search"
      aria-label="Recherche immobilière"
      onSubmit={(event) => {
        event.preventDefault();
        handleSearch();
      }}
    >
      <div
        data-home-search-intents="hvr-1"
        className="mx-auto mb-2.5 grid max-w-[420px] grid-cols-3 gap-1 rounded-[15px] border border-white/18 bg-[#061B33]/46 p-1 backdrop-blur-sm lg:mx-0"
        role="group"
        aria-label="Type de projet"
      >
        {INTENTS.map((item) => {
          const active = intent === item.type;
          return (
            <button
              key={item.type}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setIntent(item.type);
                inputRef.current?.focus();
              }}
              className={`min-h-10 rounded-[11px] px-3 py-2 text-[12px] font-extrabold transition sm:text-[13px] ${
                active
                  ? "bg-white text-[#0B2545] shadow-[0_5px_16px_rgba(2,12,27,0.18)]"
                  : "text-white/84 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-stretch overflow-hidden rounded-[17px] border border-white/34 bg-white shadow-[0_14px_36px_rgba(2,12,27,0.28)] transition focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-300/25">
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 sm:px-5">
          <Search
            size={19}
            strokeWidth={2.1}
            className="shrink-0 text-[#0B63CE]"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            data-crawl-search-input="home-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ville, quartier ou référence"
            aria-label="Ville, quartier ou référence"
            className="min-w-0 flex-1 bg-transparent py-4 text-[14px] font-semibold text-[#0B1F3A] outline-none placeholder:font-medium placeholder:text-slate-400 sm:py-[17px] sm:text-[15px]"
          />
        </div>

        <button
          type="submit"
          className="m-1.5 flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-[#0B63CE] px-3.5 py-3 text-[12px] font-extrabold text-white shadow-[0_5px_18px_rgba(11,99,206,0.28)] transition hover:bg-[#084FA8] active:scale-[0.98] sm:px-6 sm:text-[14px]"
        >
          <Search size={15} strokeWidth={2.4} aria-hidden="true" />
          <span>Rechercher</span>
        </button>
      </div>
    </form>
  );
}
