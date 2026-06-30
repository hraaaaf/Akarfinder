"use client";

/**
 * ThemeToggle — premium sun/moon switch for the header.
 * Accessible: real <button>, keyboard-focusable, descriptive aria-label,
 * aria-pressed reflects dark state. Inherits header text color via currentColor.
 */

import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Activer le thème clair" : "Activer le thème sombre"}
      aria-pressed={isDark}
      title={isDark ? "Thème clair" : "Thème sombre"}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-border/30 bg-border/5 text-current transition hover:border-border/55 hover:bg-border/15 focus-visible:outline-none ${className}`}
    >
      <span className="sr-only">{isDark ? "Activer le thème clair" : "Activer le thème sombre"}</span>
      {isDark ? (
        // Sun — currently dark, click to go light
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon — currently light, click to go dark
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
