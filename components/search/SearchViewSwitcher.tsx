"use client";

import type { SearchViewMode } from "@/lib/ux/contracts";
import {
  SEARCH_VIEW_ORDER,
  getSearchViewLayout,
} from "@/lib/ux/search-view";

type SearchViewSwitcherProps = {
  value: SearchViewMode;
  onChange: (mode: SearchViewMode) => void;
  className?: string;
};

export function SearchViewSwitcher({
  value,
  onChange,
  className = "",
}: SearchViewSwitcherProps) {
  return (
    <div
      className={`flex rounded-full border border-border/20 bg-surface p-1 dark:border-white/12 dark:bg-white/[0.06] ${className}`}
      role="group"
      aria-label="Mode d’affichage des résultats"
    >
      {SEARCH_VIEW_ORDER.map((mode) => {
        const layout = getSearchViewLayout(mode);
        const active = value === mode;

        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-pressed={active}
            className={`flex-1 rounded-full px-3 py-2 text-[13px] font-extrabold transition ${
              active
                ? "bg-gradient-to-br from-bronze-500 to-bronze-700 text-white"
                : "text-foreground/55 hover:text-foreground"
            }`}
          >
            {layout.label}
          </button>
        );
      })}
    </div>
  );
}
