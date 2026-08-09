import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content, "utf8");
}

function replaceOnce(path, source, before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${path}: expected exactly one match, got ${count}`);
  }
  return source.replace(before, after);
}

function replaceCount(path, source, before, after, expected) {
  const count = source.split(before).length - 1;
  if (count !== expected) {
    throw new Error(`${path}: expected ${expected} matches, got ${count}`);
  }
  return source.split(before).join(after);
}

{
  const path = "components/search/ExternalIndexedResultCard.tsx";
  let source = read(path);
  source = replaceOnce(
    path,
    source,
    'import { SourceBadge } from "@/components/badges/SourceBadge";\n',
    'import { SourceBadge } from "@/components/badges/SourceBadge";\nimport { deriveGatewayPublicAttribution } from "@/lib/search/public-attribution";\n',
  );
  source = replaceOnce(
    path,
    source,
    '  const contextualCityVisual = getContextualCityVisual(result.normalized_city);\n  const [thumbError, setThumbError] = useState(false);',
    '  const contextualCityVisual = getContextualCityVisual(result.normalized_city);\n  const publicAttribution = deriveGatewayPublicAttribution(result);\n  const [thumbError, setThumbError] = useState(false);',
  );
  source = replaceOnce(
    path,
    source,
    '          <span className="truncate font-semibold text-muted-foreground">Source externe · {result.result_attribution_label}</span>\n          <span className="truncate font-semibold text-muted-foreground">{result.source_name}</span>',
    '          <span data-public-attribution-type className="truncate font-semibold text-muted-foreground">{publicAttribution.typeLabel}</span>\n          <span data-public-attribution-source className="truncate font-semibold text-muted-foreground">{publicAttribution.sourceLabel}</span>',
  );
  source = replaceOnce(
    path,
    source,
    '          {result.source_badge ? <SourceBadge badge={result.source_badge} variant="dark" /> : null}',
    '          {publicAttribution.badge ? <SourceBadge badge={publicAttribution.badge} variant="dark" /> : null}',
  );
  source = replaceOnce(
    path,
    source,
    '            {result.primary_cta_label}',
    '            {publicAttribution.primaryCtaLabel ?? "Voir la source originale"}',
  );
  write(path, source);
}

{
  const path = "components/search/SearchListingCardDark.tsx";
  let source = read(path);
  source = replaceOnce(
    path,
    source,
    'import { buildSmartPropertyCardModel } from "@/lib/ux/smart-property-card";\n',
    'import { buildSmartPropertyCardModel } from "@/lib/ux/smart-property-card";\nimport { deriveListingPublicAttribution } from "@/lib/search/public-attribution";\n',
  );
  source = replaceOnce(
    path,
    source,
    '  const observedExternal = isObservedExternalListing(listing);\n  const resultHref =',
    '  const observedExternal = isObservedExternalListing(listing);\n  const publicAttribution = deriveListingPublicAttribution(listing);\n  const resultHref =',
  );
  source = replaceOnce(
    path,
    source,
    '            <span className="truncate font-semibold text-muted-foreground">\n              {listing.source_name || truth.informationLabel}\n            </span>',
    '            <span data-public-attribution className="truncate font-semibold text-muted-foreground">\n              {publicAttribution.combinedLabel}\n            </span>',
  );
  write(path, source);
}

{
  const path = "lib/akarinfo/akarinfo-passport.ts";
  let source = read(path);
  source = replaceOnce(
    path,
    source,
    'import type { PublicSerpIntelligenceSummaryV1 } from "@/lib/intelligence/public-serp-intelligence-types";\n',
    'import type { PublicSerpIntelligenceSummaryV1 } from "@/lib/intelligence/public-serp-intelligence-types";\nimport { deriveGatewayPublicAttribution, deriveListingPublicAttribution } from "@/lib/search/public-attribution";\n',
  );
  source = replaceOnce(
    path,
    source,
    'export function buildAkarInfoPassportForListing(\n  listing: Listing,\n): AkarInfoPassport {\n  const sourceAccessType = getSourceAccessType(listing.source_name ?? "");',
    'export function buildAkarInfoPassportForListing(\n  listing: Listing,\n): AkarInfoPassport {\n  const publicAttribution = deriveListingPublicAttribution(listing);\n  const sourceAccessType = getSourceAccessType(listing.source_name ?? "");',
  );
  source = replaceCount(
    path,
    source,
    '      source_name: listing.source_name,',
    '      source_name: publicAttribution.sourceLabel,',
    2,
  );
  source = replaceOnce(
    path,
    source,
    'export function buildAkarInfoPassportForGatewayResult(\n  result: SearchGatewayNormalizedResult,\n  similarResults?: PublicResultSimilaritySummary,\n): AkarInfoPassport {\n  const observation = resolveGatewayObservationSummary(result);',
    'export function buildAkarInfoPassportForGatewayResult(\n  result: SearchGatewayNormalizedResult,\n  similarResults?: PublicResultSimilaritySummary,\n): AkarInfoPassport {\n  const publicAttribution = deriveGatewayPublicAttribution(result);\n  const observation = resolveGatewayObservationSummary(result);',
  );
  source = replaceOnce(
    path,
    source,
    '    source_name: result.source_name,',
    '    source_name: publicAttribution.sourceLabel,',
  );
  write(path, source);
}

console.log("DETERMINISTIC-ATTRIBUTION-1 builder PASS");
