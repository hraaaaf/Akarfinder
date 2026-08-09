import fs from "node:fs";

const path = "components/search/LightZillowSearchShell.tsx";
let s = fs.readFileSync(path, "utf8");
function replaceExact(before, after, label) {
  const count = s.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, got ${count}`);
  s = s.replace(before, after);
}

replaceExact(
  '<div className={`mt-3 grid grid-cols-1 gap-5 ${view === "split" ? "lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.62fr)]" : "lg:grid-cols-1"} lg:items-start`}>',
  '<div data-search-view-layout={view} className={`mt-3 grid grid-cols-1 gap-5 ${view === "split" ? "lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]" : "lg:grid-cols-1"} lg:items-start`}>',
  "desktop split grid"
);
replaceExact(
  '<div ref={listRef} className="min-w-0">',
  '<div ref={listRef} data-search-list-pane className="min-w-0">',
  "list pane marker"
);
replaceExact(
  '<div className="min-w-0 space-y-4 lg:sticky lg:top-5 lg:self-start">',
  '<div data-search-map-pane className="min-w-0 space-y-4 lg:sticky lg:top-5 lg:self-start">',
  "map pane marker"
);
replaceExact(
  '<div className="overflow-hidden rounded-2xl border border-border/15 bg-card backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">',
  '<div data-search-map-secondary="project" className={`${view === "split" ? "lg:hidden" : ""} overflow-hidden rounded-2xl border border-border/15 bg-card backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]`}>',
  "project secondary"
);
replaceExact(
  'className="flex items-center justify-center gap-2 rounded-2xl border border-border/20 bg-card px-4 py-3 text-[13px] font-extrabold text-foreground/75 transition hover:border-bronze-500/40 hover:text-foreground dark:border-white/12 dark:bg-white/[0.04] dark:text-white/80 dark:hover:text-white"',
  'data-search-map-secondary="full-map"\n                className={`${view === "split" ? "lg:hidden" : ""} flex items-center justify-center gap-2 rounded-2xl border border-border/20 bg-card px-4 py-3 text-[13px] font-extrabold text-foreground/75 transition hover:border-bronze-500/40 hover:text-foreground dark:border-white/12 dark:bg-white/[0.04] dark:text-white/80 dark:hover:text-white`}',
  "full map secondary"
);

fs.writeFileSync(path, s, "utf8");
console.log("SEARCH-DESKTOP-SPLIT-1 patch PASS");
