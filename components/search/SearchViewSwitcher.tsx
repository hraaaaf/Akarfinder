"use client";

import type { SearchViewMode } from "@/lib/ux/contracts";
import {
  SEARCH_VIEW_ORDER,
  getSearchViewLayout,
} from "@/lib/ux/search-view";
import styles from "./SearchViewSwitcher.module.css";

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
    <div className={`${styles.root} min-w-0 ${className}`} data-results-toolbar-view-control>
      <select
        data-search-mobile-view-select
        aria-label="Mode d’affichage des résultats"
        value={value}
        onChange={(event) => onChange(event.target.value as SearchViewMode)}
        className="h-12 hidden max-w-[92px] rounded-full border border-border/20 bg-surface px-3 text-[12px] font-extrabold text-foreground outline-none dark:border-white/12 dark:bg-white/[0.06] dark:[color-scheme:dark]"
      >
        {SEARCH_VIEW_ORDER.map((mode) => (
          <option key={mode} value={mode}>
            {getSearchViewLayout(mode).label}
          </option>
        ))}
      </select>

      <div
        data-search-desktop-view-switcher
        className={`${styles.segmented} hidden min-w-0 rounded-full border border-border/20 bg-surface p-1 sm:flex dark:border-white/12 dark:bg-white/[0.06]`}
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
              className={`${styles.option} ${active ? styles.active : ""} min-h-10 min-w-0 rounded-full px-3 py-2 text-[12px] font-extrabold transition sm:text-[13px] ${
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
    </div>
  );
}
