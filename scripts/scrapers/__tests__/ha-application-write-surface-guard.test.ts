import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string): string {
  return readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
}

const guardedFiles = [
  "app/api/leads/route.ts",
  "app/api/seller-drafts/[draftId]/publication/route.ts",
  "app/api/seller-drafts/[draftId]/review/route.ts",
  "app/api/seller-drafts/[draftId]/photos/route.ts",
  "lib/seller/owner-listing-projection.ts",
  "lib/professional/repository.ts",
  "lib/professional/commercial-repository.ts",
  "lib/tracking/log-event.ts",
  "lib/search-gateway-cache/supabase-cache-store.ts",
  "lib/public-property-index/supabase-index-store.ts",
  "lib/observation-ledger/supabase-observation-ledger.ts",
] as const;

test("known Supabase runtime write surfaces import the HA write fence", () => {
  for (const path of guardedFiles) {
    const source = read(path);
    assert.match(
      source,
      /assertHaSupabaseWriteAllowed/,
      `missing HA write fence in ${path}`,
    );
  }
});

test("lead creation fences before opening the Supabase data path", () => {
  const source = read("app/api/leads/route.ts");
  const guard = source.indexOf("assertHaSupabaseWriteAllowed();");
  const client = source.indexOf("const supabase = getSupabaseServerClient();");
  assert.ok(guard >= 0 && guard < client);
});

test("seller mutation handlers fence before draft authorization reads", () => {
  for (const path of [
    "app/api/seller-drafts/[draftId]/publication/route.ts",
    "app/api/seller-drafts/[draftId]/review/route.ts",
    "app/api/seller-drafts/[draftId]/photos/route.ts",
  ]) {
    const source = read(path);
    const mutationSegments = source
      .split(/export async function (?=POST|PATCH|DELETE)/g)
      .slice(1)
      .filter((segment) => /^(POST|PATCH|DELETE)\b/.test(segment));

    assert.ok(mutationSegments.length > 0, `no mutation handler found in ${path}`);
    for (const segment of mutationSegments) {
      const guard = segment.indexOf("assertHaSupabaseWriteAllowed();");
      const auth = segment.indexOf("authorizeSellerDraftUpload(");
      const client = segment.indexOf("getSupabaseServerClient(");
      assert.ok(guard >= 0, `missing handler fence in ${path}`);
      if (auth >= 0) assert.ok(guard < auth, `fence must precede auth DB read in ${path}`);
      if (client >= 0) assert.ok(guard < client, `fence must precede client creation in ${path}`);
    }
  }
});

test("owner projection RPC is fenced", () => {
  const source = read("lib/seller/owner-listing-projection.ts");
  const fn = source.split("export async function syncOwnerListingProjection")[1] ?? "";
  assert.match(fn, /assertHaSupabaseWriteAllowed\(\);[\s\S]*getSupabaseServerClient\(\)/);
});

test("professional HA-table mutations are fenced", () => {
  const source = read("lib/professional/repository.ts");
  for (const fn of [
    "createProfessionalOrganizationWithOwner",
    "addProfessionalMember",
    "claimProfessionalListingOwnership",
    "updateAssignedProfessionalLead",
  ]) {
    const segment = source.split(`export async function ${fn}`)[1] ?? "";
    assert.match(segment, /assertHaSupabaseWriteAllowed\(\);/, fn);
  }
});

test("commercial runtime mutations are fenced", () => {
  const source = read("lib/professional/commercial-repository.ts");
  for (const fn of [
    "createPartnerPropertySubmission",
    "savePartnerPropertySubmission",
    "submitPartnerPropertyForReview",
    "reviewPartnerPropertySubmissionByStaff",
    "setProfessionalActivationByStaff",
    "createPartnerMedia",
  ]) {
    const segment = source.split(`export async function ${fn}`)[1] ?? "";
    assert.match(segment, /assertHaSupabaseWriteAllowed\(\);/, fn);
  }
});

test("auxiliary Supabase mutations are fenced at mutation methods", () => {
  const cache = read("lib/search-gateway-cache/supabase-cache-store.ts");
  assert.match(cache, /async write\([\s\S]*?assertHaSupabaseWriteAllowed\(\);/);
  assert.match(cache, /async recordHit\([\s\S]*?assertHaSupabaseWriteAllowed\(\);/);

  const index = read("lib/public-property-index/supabase-index-store.ts");
  assert.match(index, /async upsert\([\s\S]*?assertHaSupabaseWriteAllowed\(\);/);

  const ledger = read("lib/observation-ledger/supabase-observation-ledger.ts");
  assert.match(
    ledger,
    /persistObservationLedgerEvent[\s\S]*?assertHaSupabaseWriteAllowed\(\);[\s\S]*?client\.rpc/,
  );

  const tracking = read("lib/tracking/log-event.ts");
  assert.match(
    tracking,
    /assertHaSupabaseWriteAllowed\(\);[\s\S]*?getSupabaseServerClient\(\)/,
  );
});
