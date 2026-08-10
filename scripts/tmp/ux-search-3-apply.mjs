import { readFile, writeFile } from "node:fs/promises";

async function replaceStrict(path, replacements) {
  let content = await readFile(path, "utf8");
  for (const [from, to] of replacements) {
    if (!content.includes(from)) throw new Error(`${path}: missing replacement anchor: ${from.slice(0, 120)}`);
    content = content.replace(from, to);
  }
  await writeFile(path, content, "utf8");
}

await replaceStrict("components/akarinfo/AkarInfoPassportCard.tsx", [
  ['variant?: "compact" | "full";', 'variant?: "serp" | "compact" | "full";'],
  [
    '  const compact = variant === "compact";\n  const points = compact\n',
    '  const serp = variant === "serp";\n  const compact = variant !== "full";\n  const points = compact\n',
  ],
  [
    '  const intelligence = passport.intelligence;\n\n  return (',
    `  const intelligence = passport.intelligence;\n\n  if (serp) {\n    return (\n      <div\n        data-akarinfo-serp\n        className={\`rounded-xl border border-border/12 bg-surface/55 px-2.5 py-2 dark:border-white/8 dark:bg-white/[0.025] \${className}\`}\n      >\n        <div className="flex min-w-0 items-center justify-between gap-2">\n          <span className="truncate text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground dark:text-white/45">\n            Informations AkarFinder\n          </span>\n          <span className={\`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold \${LEVEL_STYLES[passport.information_level_label]}\`}>\n            {PUBLIC_LEVEL_LABELS[passport.information_level_label]}\n          </span>\n        </div>\n        {points[0] ? (\n          <p className="mt-1 truncate text-[9.5px] font-semibold text-muted-foreground dark:text-white/50">\n            À vérifier · {points[0]}\n          </p>\n        ) : null}\n      </div>\n    );\n  }\n\n  return (`,
  ],
]);

await replaceStrict("components/search/ExternalIndexedResultCard.tsx", [
  ['className="relative h-[164px] w-full flex-shrink-0 overflow-hidden bg-white sm:h-[220px]"', 'className="relative h-[164px] w-full flex-shrink-0 overflow-hidden bg-white sm:h-[196px]"'],
  ['<div className="flex flex-1 flex-col p-3 sm:p-5">', '<div className="flex flex-1 flex-col p-3 sm:p-4">'],
  ['          data-mobile-price\n', '          data-mobile-price\n          data-card-price\n'],
  ['<h3 className="mt-1.5 line-clamp-1', '<h3 data-card-title className="mt-1.5 line-clamp-1'],
  ['<p className="mt-1 flex items-center gap-1 text-[10.5px]', '<p data-card-location className="mt-1 flex items-center gap-1 text-[10.5px]'],
  ['<div className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[9.5px]', '<div data-card-facts className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[9.5px]'],
  ['<div className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9px]', '<div data-card-provenance className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9px]'],
  ['<AkarInfoPassportCard passport={passport} className="mt-3" />', '<AkarInfoPassportCard passport={passport} variant="serp" className="mt-2" />'],
  ['<div className="mt-3 flex items-center justify-between gap-2 sm:mt-4 sm:rounded-xl', '<div data-card-action className="mt-2.5 flex items-center justify-between gap-2 sm:mt-3 sm:rounded-xl'],
  ['sm:mt-3 sm:line-clamp-2', 'sm:mt-2.5 sm:line-clamp-2'],
  ['sm:mt-3 sm:flex-wrap', 'sm:mt-2.5 sm:flex-wrap'],
  ['sm:mt-3 sm:gap-3 sm:border-border/12', 'sm:mt-2.5 sm:gap-3 sm:border-border/12'],
]);

await replaceStrict("components/search/SearchListingCardDark.tsx", [
  ['className="relative h-[164px] overflow-hidden bg-white sm:h-[220px]"', 'className="relative h-[164px] overflow-hidden bg-white sm:h-[196px]"'],
  ['<div className="flex flex-1 flex-col p-3 sm:p-5">', '<div className="flex flex-1 flex-col p-3 sm:p-4">'],
  ['<p data-mobile-price className="truncate', '<p data-mobile-price data-card-price className="truncate'],
  ['<h2 className="line-clamp-1', '<h2 data-card-title className="line-clamp-1'],
  ['<p className="mt-1 flex items-center gap-1 text-[10.5px]', '<p data-card-location className="mt-1 flex items-center gap-1 text-[10.5px]'],
  ['<div className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[9.5px]', '<div data-card-facts className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[9.5px]'],
  ['<div className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9px]', '<div data-card-provenance className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9px]'],
  ['className="mt-4 hidden w-full items-center justify-center gap-2 rounded-xl', 'className="mt-3 hidden w-full items-center justify-center gap-2 rounded-xl'],
  ['sm:mt-3 sm:line-clamp-2', 'sm:mt-2.5 sm:line-clamp-2'],
  ['sm:mt-3 sm:flex-wrap', 'sm:mt-2.5 sm:flex-wrap'],
  ['sm:mt-3 sm:gap-3 sm:border-border/12', 'sm:mt-2.5 sm:gap-3 sm:border-border/12'],
]);

console.log("UX-SEARCH-3 card architecture applied");