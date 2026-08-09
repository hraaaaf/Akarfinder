import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const resolver = read("lib/search/public-attribution.ts");
const gatewayCard = read("components/search/ExternalIndexedResultCard.tsx");
const listingCard = read("components/search/SearchListingCardDark.tsx");
const passport = read("lib/akarinfo/akarinfo-passport.ts");
const visual = read("scripts/audits/unified-listing-card-1-visual.mjs");

assert.match(resolver, /getSearchGatewaySourceById/);
assert.match(resolver, /getSourceAccessType/);
assert.match(resolver, /Source originale/);
assert.match(resolver, /Origine à confirmer/);
assert.doesNotMatch(resolver, /title|snippet|description/i);
assert.doesNotMatch(resolver, /ranking_score|lane_weight|display_eligibility|fetch\s*\(|insert\s*\(|update\s*\(|upsert\s*\(/i);

assert.match(gatewayCard, /deriveGatewayPublicAttribution\(result\)/);
assert.match(gatewayCard, /data-public-attribution-type/);
assert.match(gatewayCard, /data-public-attribution-source/);
assert.doesNotMatch(gatewayCard, /\{result\.source_name\}/);
assert.doesNotMatch(gatewayCard, /\{result\.result_attribution_label\}/);
assert.doesNotMatch(gatewayCard, /\{result\.primary_cta_label\}/);
assert.doesNotMatch(gatewayCard, /badge=\{result\.source_badge\}/);

assert.match(listingCard, /deriveListingPublicAttribution\(listing\)/);
assert.match(listingCard, /publicAttribution\.combinedLabel/);
assert.doesNotMatch(listingCard, /\{listing\.source_name\s*\|\|/);

assert.match(passport, /deriveGatewayPublicAttribution/);
assert.match(passport, /deriveListingPublicAttribution/);
assert.match(passport, /source_name: publicAttribution\.sourceLabel/);

assert.match(visual, /RAW LABEL MUST NOT RENDER/);
assert.match(visual, /desktop-1440x900/);
assert.match(visual, /deterministic indexed attribution is not visible/);
assert.match(visual, /raw source_name leaked into public attribution/);

console.log("DETERMINISTIC-ATTRIBUTION-1 contract PASS");
