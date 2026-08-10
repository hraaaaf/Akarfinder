import { readFile, writeFile } from "node:fs/promises";

async function edit(path, transform) {
  const before = await readFile(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`${path}: transform produced no change`);
  await writeFile(path, after, "utf8");
}

function replaceOnce(content, from, to, label) {
  const index = content.indexOf(from);
  if (index < 0) throw new Error(`missing anchor ${label}`);
  if (content.indexOf(from, index + from.length) >= 0) throw new Error(`ambiguous anchor ${label}`);
  return content.slice(0, index) + to + content.slice(index + from.length);
}

await edit("components/akarinfo/AkarInfoPassportCard.tsx", (input) => {
  let content = input;
  content = replaceOnce(content, 'variant?: "compact" | "full";', 'variant?: "serp" | "compact" | "full";', "passport variant type");
  content = replaceOnce(
    content,
    '  const compact = variant === "compact";\n  const points = compact\n',
    '  const serp = variant === "serp";\n  const compact = variant !== "full";\n  const points = compact\n',
    "passport compact state",
  );
  content = replaceOnce(
    content,
    '  const intelligence = passport.intelligence;\n\n  return (',
    [
      '  const intelligence = passport.intelligence;',
      '',
      '  if (serp) {',
      '    return (',
      '      <div',
      '        data-akarinfo-serp',
      '        className={`rounded-xl border border-border/12 bg-surface/55 px-2.5 py-2 dark:border-white/8 dark:bg-white/[0.025] ${className}`}',
      '      >',
      '        <div className="flex min-w-0 items-center justify-between gap-2">',
      '          <span className="truncate text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground dark:text-white/45">',
      '            Informations AkarFinder',
      '          </span>',
      '          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${LEVEL_STYLES[passport.information_level_label]}`}>',
      '            {PUBLIC_LEVEL_LABELS[passport.information_level_label]}',
      '          </span>',
      '        </div>',
      '        {points[0] ? (',
      '          <p className="mt-1 truncate text-[9.5px] font-semibold text-muted-foreground dark:text-white/50">',
      '            À vérifier · {points[0]}',
      '          </p>',
      '        ) : null}',
      '      </div>',
      '    );',
      '  }',
      '',
      '  return (',
    ].join("\n"),
    "passport serp branch",
  );
  return content;
});

await edit("components/search/ExternalIndexedResultCard.tsx", (input) => {
  let content = input;
  const similarBlock = [
    '        {similarResults?.similar_possible ? (',
    '          <p className="mt-1.5 text-[9px] font-semibold text-amber-800 dark:text-amber-100 sm:mt-2 sm:text-[11px]">',
    '            Résultats proches · doublon possible. Comparez les sources pour confirmer.',
    '          </p>',
    '        ) : null}',
    '',
  ].join("\n");

  content = replaceOnce(content, 'className="relative h-[164px] w-full flex-shrink-0 overflow-hidden bg-white sm:h-[220px]"', 'data-card-image className="relative h-[164px] w-full flex-shrink-0 overflow-hidden bg-white sm:h-[196px]"', "external image");
  content = replaceOnce(content, '<div className="flex flex-1 flex-col p-3 sm:p-5">', '<div className="flex flex-1 flex-col p-3 sm:p-4">', "external body");
  content = replaceOnce(content, '          data-mobile-price\n', '          data-mobile-price\n          data-card-price\n', "external price marker");
  content = replaceOnce(content, '<h3 className="mt-1.5 line-clamp-1', '<h3 data-card-title className="mt-1.5 line-clamp-2', "external title");
  content = replaceOnce(content, '<p className="mt-1 flex items-center gap-1 text-[10.5px]', '<p data-card-location className="mt-1 flex items-center gap-1 text-[10.5px]', "external location");
  content = replaceOnce(content, '<div className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[9.5px]', '<div data-card-facts className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[10px]', "external facts");
  content = replaceOnce(content, similarBlock, "", "external similarity original position");
  content = replaceOnce(content, '<div className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9px]', '<div data-card-provenance className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9.5px]', "external provenance");
  content = replaceOnce(
    content,
    '        </div>\n\n        <div className="mt-2 hidden items-center justify-between gap-2 sm:flex">',
    '        </div>\n\n' + similarBlock.replace('className="mt-1.5', 'data-card-trust-note className="mt-1.5') + '        <div data-card-provenance-detail className="mt-2 hidden items-center justify-between gap-2 sm:flex">',
    "external provenance continuation",
  );
  content = replaceOnce(content, '<div className="hidden sm:block">\n          <AkarInfoPassportCard passport={passport} className="mt-3" />', '<div data-card-provenance-detail className="hidden sm:block">\n          <AkarInfoPassportCard passport={passport} variant="serp" className="mt-2" />', "external serp passport");
  content = replaceOnce(content, '<div className="mt-3 flex items-center justify-between gap-2 sm:mt-4 sm:rounded-xl', '<div data-card-action className="mt-2.5 flex items-center justify-between gap-2 sm:mt-3 sm:rounded-xl', "external action");
  content = content.replaceAll('sm:mt-3 sm:line-clamp-2', 'sm:mt-2.5 sm:line-clamp-2');
  content = content.replaceAll('sm:mt-3 sm:flex-wrap', 'sm:mt-2.5 sm:flex-wrap');
  content = content.replaceAll('sm:mt-3 sm:gap-3 sm:border-border/12', 'sm:mt-2.5 sm:gap-3 sm:border-border/12');
  return content;
});

await edit("components/search/SearchListingCardDark.tsx", (input) => {
  let content = input;
  const creditBlock = [
    '          {showNeighborhoodPhoto ? (',
    '            <a',
    '              href={neighborhoodPhoto.sourcePage}',
    '              target="_blank"',
    '              rel="noopener noreferrer"',
    '              data-neighborhood-photo-credit',
    '              className="mt-1 inline-flex w-fit max-w-full truncate text-[7.5px] font-semibold text-muted-foreground/75 underline-offset-2 hover:text-foreground hover:underline sm:text-[9px]"',
    '              aria-label={`Crédit et licence de la photo d’ambiance ${neighborhoodPhoto.label}`}',
    '            >',
    '              Crédit & licence · Wikimedia Commons',
    '            </a>',
    '          ) : null}',
    '',
  ].join("\n");

  content = replaceOnce(content, 'className="relative h-[164px] overflow-hidden bg-white sm:h-[220px]"', 'data-card-image className="relative h-[164px] overflow-hidden bg-white sm:h-[196px]"', "internal image");
  content = replaceOnce(content, '<div className="flex flex-1 flex-col p-3 sm:p-5">', '<div className="flex flex-1 flex-col p-3 sm:p-4">', "internal body");
  content = replaceOnce(content, '<p data-mobile-price className="truncate', '<p data-mobile-price data-card-price className="truncate', "internal price");
  content = replaceOnce(content, '<Link href={resultHref} target={resultTarget} rel={resultRel} className="mt-1.5 block sm:mt-3">', '<Link href={resultHref} target={resultTarget} rel={resultRel} className="mt-1.5 block sm:mt-2.5">', "internal content link spacing");
  content = replaceOnce(content, '<h2 className="line-clamp-1', '<h2 data-card-title className="line-clamp-2', "internal title");
  content = replaceOnce(content, '<p className="mt-1 flex items-center gap-1 text-[10.5px]', '<p data-card-location className="mt-1 flex items-center gap-1 text-[10.5px]', "internal location");
  content = replaceOnce(content, creditBlock, "", "internal credit original position");
  content = replaceOnce(content, '<div className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[9.5px]', '<div data-card-facts className="mt-1.5 flex min-h-4 items-center gap-x-1.5 overflow-hidden text-[10px]', "internal facts");
  content = replaceOnce(content, '<div className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9px]', '<div data-card-provenance className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9.5px]', "internal provenance");
  content = replaceOnce(
    content,
    '          </div>\n\n          {!observedExternal && listing.duplicate_score != null && listing.duplicate_score >= 0.7 ? (',
    '          </div>\n\n' + creditBlock.replace('className="mt-1 inline-flex', 'className="mt-1.5 inline-flex').replace('text-[7.5px]', 'text-[8.5px]') + '          {!observedExternal && listing.duplicate_score != null && listing.duplicate_score >= 0.7 ? (',
    "internal credit after provenance",
  );
  content = content.replaceAll('sm:mt-3 sm:flex-wrap', 'sm:mt-2.5 sm:flex-wrap');
  content = content.replaceAll('sm:mt-3 sm:gap-3 sm:border-border/12', 'sm:mt-2.5 sm:gap-3 sm:border-border/12');
  content = content.replaceAll('className="mt-4 hidden w-full items-center justify-center gap-2 rounded-xl', 'className="mt-3 hidden w-full items-center justify-center gap-2 rounded-xl');
  return content;
});

console.log("UX-SEARCH-3 card architecture applied");
