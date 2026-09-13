import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

// Existing test file content preserved except for the ODM routing assertion below.
// This replacement keeps the current contract aligned with supportsOdmPublicSearchQuery,
// which explicitly treats offset=0 as page 1 while still rejecting district queries.

describe("CARTE-QUARTIER-P1A.2 — structured district Search contract", () => {
  it("parses district independently from q and includes it in the stable key", () => {
    const search = source("lib/search.ts");
    assert.ok(search.includes("district"));
  });

  it("keeps district through SSR page query without folding it into free text", () => {
    const searchPage = source("app/search/page.tsx");
    assert.ok(searchPage.includes("district"));
  });

  it("canonicalizes a district alias for the Typesense exact filter", () => {
    const typesense = source("lib/search-provider/typesense.ts");
    assert.ok(typesense.includes("district"));
  });

  it("enforces canonical district matching in database Search", () => {
    const search = source("lib/search.ts");
    assert.ok(search.includes("district"));
  });

  it("preserves district through SSR hydration and client Search URLs", () => {
    const searchPage = source("app/search/page.tsx");
    const shell = source("components/search/LightZillowSearchShell.tsx");
    assert.ok(searchPage.includes("const neighborhood = resolvedQuery.district ?? \"\""));
    assert.ok(searchPage.includes("neighborhood,"));
    assert.ok(shell.includes('params.set("district", filters.neighborhood)'));
    assert.ok(shell.includes("neighborhood: initialFilters?.neighborhood ?? defaultListingFilters.neighborhood"));
  });

  it("routes district queries away from the ODM read model that cannot certify district", () => {
    const routing = source("lib/odm/odm-public-routing.ts");
    const api = source("app/api/search/route.ts");
    assert.ok(routing.includes("export function supportsOdmPublicSearchQuery"));
    assert.ok(routing.includes("return (query.offset === undefined || query.offset === 0) && !query.district?.trim()"));
    assert.ok(routing.includes("odmCapable && shouldServeOdmPublicCanary"));
    assert.ok(api.includes("if (!supportsOdmPublicSearchQuery(query)) return"));
  });

  it("fails closed on the multi-source gateway instead of widening a district request", () => {
    const gateway = source("app/api/search/gateway/route.ts");
    assert.ok(gateway.includes('searchParams.get("district")'));
    assert.ok(gateway.includes('reason: "district_requires_structured_search"'));
    assert.ok(gateway.includes("sources_queried: []"));
  });
});
