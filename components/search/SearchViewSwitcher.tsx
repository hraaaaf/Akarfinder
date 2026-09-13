"use client";

import { useEffect } from "react";
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

const MOBILE_VIEW_ORDER: readonly SearchViewMode[] = ["list", "map"];

export function SearchViewSwitcher({
  value,
  onChange,
  className = "",
}: SearchViewSwitcherProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobile = window.matchMedia("(max-width: 639px)");
    if (mobile.matches && value === "split") onChange("list");
  }, [value, onChange]);

  return (
    <div className={`${styles.root} min-w-0 ${className}`} data-results-toolbar-view-control>
      <div
        data-search-mobile-view-select
        className={`${styles.segmented} flex min-w-0 rounded-full border border-border/20 bg-surface p-1 sm:hidden dark:border-white/12 dark:bg-white/[0.06]`}
        role="group"
        aria-label="Mode d’affichage des résultats"
      >
        {MOBILE_VIEW_ORDER.map((mode) => {
          const layout = getSearchViewLayout(mode);
          const active = value === mode || (mode === "list" && value === "split");

          return (
            <button
              key={mode}
              type="button"
              data-search-mobile-view-mode-button={mode}
              onClick={() => onChange(mode)}
              aria-pressed={active}
              className={`${styles.option} ${active ? styles.active : ""} min-h-10 min-w-[74px] rounded-full px-3 py-2 text-[12px] font-extrabold transition ${
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
              data-search-view-mode-button={mode}
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
