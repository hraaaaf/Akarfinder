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
      className={`sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex min-w-0 flex-1 rounded-full border border-border/20 bg-card/95 p-1 shadow-[0_12px_34px_rgba(2,10,24,0.16)] backdrop-blur-xl sm:static sm:flex-none sm:bg-surface sm:shadow-none dark:border-white/12 dark:bg-card/95 sm:dark:bg-white/[0.06] ${className}`}
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
            className={`min-h-11 min-w-0 flex-1 rounded-full px-2 py-2 text-[12px] font-extrabold transition sm:px-3 sm:text-[13px] ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/65 hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {layout.label}
          </button>
        );
      })}
    </div>
  );
}
