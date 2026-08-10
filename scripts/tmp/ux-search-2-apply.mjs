import { readFile, writeFile } from "node:fs/promises";

const path = "components/search/LightZillowSearchShell.tsx";
let source = await readFile(path, "utf8");

const replacements = [
  [
    '<section className="border-b border-border/12 bg-surface/95 dark:border-white/8 dark:bg-deepblue/95">',
    '<section data-search-controls-section className="border-b border-border/12 bg-surface/95 dark:border-white/8 dark:bg-deepblue/95">',
  ],
  [
    '<div className="mx-auto max-w-[1480px] px-4 py-3 sm:px-6 sm:py-3.5">',
    '<div className="mx-auto max-w-[1480px] px-4 py-2 sm:px-6 sm:py-2.5">',
  ],
  [
    '<section className="mx-auto max-w-[1480px] px-4 py-3 sm:px-6 sm:py-4">',
    '<section data-search-results-section className="mx-auto max-w-[1480px] px-4 py-2.5 sm:px-6 sm:py-3">',
  ],
  [
    '<div className="flex flex-col gap-2.5 border-b border-border/12 pb-3 dark:border-white/8 sm:flex-row sm:items-center sm:justify-between">',
    '<div data-search-results-toolbar className="flex items-center justify-between gap-2 border-b border-border/12 pb-2.5 dark:border-white/8">',
  ],
  [
    '<div className="flex items-center justify-between gap-2 sm:justify-end">',
    '<div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">',
  ],
  [
    '<select\n              aria-label="Trier les résultats"',
    '<select\n              data-search-sort-select\n              aria-label="Trier les résultats"',
  ],
  [
    'className="h-10 shrink-0 rounded-full border border-border/20 bg-surface px-3 text-[12px] font-bold text-foreground outline-none dark:border-white/12 dark:bg-white/[0.06] dark:[color-scheme:dark]"',
    'className="h-12 max-w-[118px] shrink-0 rounded-full border border-border/20 bg-surface px-3 text-[12px] font-bold text-foreground outline-none sm:h-10 sm:max-w-none dark:border-white/12 dark:bg-white/[0.06] dark:[color-scheme:dark]"',
  ],
  [
    '<div data-search-view-layout={view} className={`mt-3 grid grid-cols-1 gap-5 ${view === "split" ? "lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]" : "lg:grid-cols-1"} lg:items-start`}>',
    '<div data-search-view-layout={view} className={`mt-2.5 grid grid-cols-1 gap-5 ${view === "split" ? "lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]" : "lg:grid-cols-1"} lg:items-start`}>',
  ],
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) throw new Error(`Missing UX-SEARCH-2 anchor: ${before.slice(0, 90)}`);
  source = source.replace(before, after);
}

await writeFile(path, source, "utf8");
console.log("UX-SEARCH-2 shell compaction applied");