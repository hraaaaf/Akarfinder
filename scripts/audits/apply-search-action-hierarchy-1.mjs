import fs from "node:fs";

const cardPath = "components/search/SearchListingCardDark.tsx";
const mobileTestPath = "scripts/scrapers/__tests__/search-mobile-card-grid-1.test.ts";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, content) { fs.writeFileSync(path, content, "utf8"); }
function replaceExact(path, source, before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected exactly one match, got ${count}`);
  return source.replace(before, after);
}
function replaceRegex(path, source, regex, after, label) {
  const matches = source.match(regex);
  if (!matches || matches.length !== 1) throw new Error(`${path}: ${label} expected exactly one match`);
  return source.replace(regex, after);
}

{
  let source = read(cardPath);
  source = replaceExact(cardPath, source,
    'import { CompareToggleButton } from "@/components/compare/CompareToggleButton";\n',
    ''
  );
  source = replaceExact(cardPath, source,
    '  const { selection, hoverListing, clearHover, selectListing, isActive, registerListing } =\n    usePropertySelection();',
    '  const { hoverListing, clearHover, isActive, registerListing } = usePropertySelection();'
  );
  source = replaceExact(cardPath, source,
    '  const selected = active && selection.interaction === "selected";\n',
    ''
  );
  source = replaceExact(cardPath, source,
`          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9px] dark:border-white/8 sm:mt-3 sm:gap-3 sm:border-border/12 sm:pt-3 sm:text-[11px]">
            <span className="truncate font-semibold text-muted-foreground">{smartCard.freshnessLabel}</span>
            <span data-public-attribution className="truncate font-semibold text-muted-foreground">
              {publicAttribution.combinedLabel}
            </span>
          </div>`,
`          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/10 pt-2 text-[9px] dark:border-white/8 sm:mt-3 sm:gap-3 sm:border-border/12 sm:pt-3 sm:text-[11px]">
            <span className="truncate font-semibold text-muted-foreground">{smartCard.freshnessLabel}</span>
            {showOriginal && !observedExternal ? (
              <a
                href={listing.listing_url!}
                target="_blank"
                rel="noopener noreferrer"
                data-secondary-source-link
                className="inline-flex min-w-0 items-center gap-1 font-semibold text-muted-foreground transition hover:text-bronze-700 dark:hover:text-bronze-300"
                aria-label="Voir la source originale"
              >
                <span data-public-attribution className="truncate">{publicAttribution.combinedLabel}</span>
                <ExternalLink size={11} aria-hidden="true" className="shrink-0" />
              </a>
            ) : (
              <span data-public-attribution className="truncate font-semibold text-muted-foreground">
                {publicAttribution.combinedLabel}
              </span>
            )}
          </div>`
  );
  source = replaceRegex(cardPath, source,
    /\n          <button\n            type="button"[\s\S]*?\n          <\/button>\n/,
    '\n',
    'map secondary action'
  );
  source = replaceRegex(cardPath, source,
    /          <div className="mt-4 hidden flex-col gap-2 sm:flex sm:flex-row">[\s\S]*?          <\/div>\n\n          \{observedExternal && showOriginal \? \(/,
`          {!observedExternal ? (
            <Link
              href={resultHref}
              onClick={() =>
                track({
                  event_name: "search_result_click",
                  source_page: "/search",
                  listing_id: listing.id,
                  intent: listing.transaction_type === "rent" ? "rent" : "buy",
                })
              }
              data-card-primary-action
              className="mt-4 hidden w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.28)] transition hover:from-bronze-600 sm:flex"
            >
              Voir le bien
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : showOriginal ? (
            <a
              href={listing.listing_url!}
              target="_blank"
              rel="noopener noreferrer"
              data-card-primary-action
              className="mt-4 hidden w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.28)] transition hover:from-bronze-600 sm:flex"
            >
              Voir l’annonce originale
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : null}

          {observedExternal && showOriginal ? (`,
    'primary action block'
  );
  source = replaceRegex(cardPath, source,
    /\n          \{!observedExternal \? \(\n            <div className="mt-2 hidden sm:block">[\s\S]*?\n          \) : null\}/,
    '',
    'compare secondary action'
  );
  write(cardPath, source);
}

{
  let source = read(mobileTestPath);
  source = replaceExact(mobileTestPath, source,
`  it("removes secondary mobile actions while preserving them from sm upward", () => {
    const card = source("components/search/SearchListingCardDark.tsx");

    assert.match(card, /Repérer sur la carte[\\s\\S]*hidden[\\s\\S]*sm:flex|hidden[\\s\\S]*sm:flex[\\s\\S]*Repérer sur la carte/);
    assert.ok(card.includes('className="mt-4 hidden flex-col gap-2 sm:flex sm:flex-row"'));
    assert.ok(card.includes('className="mt-2 hidden sm:block"'));
  });`,
`  it("keeps mobile free of secondary actions while desktop exposes only one primary action", () => {
    const card = source("components/search/SearchListingCardDark.tsx");

    assert.ok(card.includes("data-card-primary-action"));
    assert.ok(card.includes("sm:flex"));
    assert.doesNotMatch(card, /Repérer sur la carte|CompareToggleButton/);
    assert.ok(card.includes("data-secondary-source-link"));
  });`
  );
  write(mobileTestPath, source);
}

console.log("SEARCH-ACTION-HIERARCHY-1 patch PASS");
