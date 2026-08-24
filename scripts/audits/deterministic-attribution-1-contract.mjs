import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const resolver = read("lib/search/public-attribution.ts");
const gatewayCard = read("components/search/ExternalIndexedResultCard.tsx");
const listingCard = read("components/search/SearchListingCardDark.tsx");
const passport = read("lib/akarinfo/akarinfo-passport.ts");

assert.match(resolver, /getSearchGatewaySourceById/);
assert.match(resolver, /getSourceAccessType/);
assert.doesNotMatch(resolver, /title|snippet|description/i);
assert.doesNotMatch(resolver, /ranking_score|lane_weight|display_eligibility|fetch\s*\(|insert\s*\(|update\s*\(|upsert\s*\(/i);

assert.match(gatewayCard, /deriveGatewayPublicAttribution\(result\)/);
assert.match(gatewayCard, /data-public-attribution-type/);
assert.match(gatewayCard, /data-public-attribution-source/);
assert.match(gatewayCard, /data-public-attribution-cta/);
assert.doesNotMatch(gatewayCard, /\{result\.source_name\}/);
assert.doesNotMatch(gatewayCard, /\{result\.result_attribution_label\}/);
assert.doesNotMatch(gatewayCard, /\{result\.primary_cta_label\}/);

assert.match(listingCard, /deriveListingPublicAttribution\(listing\)/);
assert.match(listingCard, /publicAttribution\.combinedLabel/);
assert.match(passport, /deriveGatewayPublicAttribution/);
assert.match(passport, /deriveListingPublicAttribution/);

console.log("DETERMINISTIC-ATTRIBUTION-1 contract PASS");
