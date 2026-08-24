import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260824091000_m7_public_search_policy_guard.sql"),
  "utf8",
);

describe("M7-E public search policy guard", () => {
  it("permits rich content only for explicit authorized partner policy", () => {
    assert.match(migration, /authorization_status\s*=\s*'authorized_partner'/i);
    assert.match(migration, /content_reuse_policy\s*=\s*'authorized'/i);
    assert.match(migration, /display_policy\s*=\s*'partner_content'/i);
    assert.match(migration, /acquisition_mode\s+in\s*\('authorized_detail_feed',\s*'partner_feed'\)/i);
  });

  it("requires the stricter external-tail approval for minimal index rows", () => {
    assert.match(migration, /join\s+public\.source_policy_registry/i);
    assert.match(migration, /left\s+join\s+public\.source_external_tail_policy_v1/i);
    assert.match(migration, /tail\.display_gate\s*=\s*'external_tail_link_only'/i);
    assert.match(migration, /tail\.review_status\s*=\s*'approved_existing_link_policy'/i);
    assert.match(migration, /tail\.manual_approval_required\s*=\s*false/i);
    assert.match(migration, /authorization_status\s+not\s+in\s*\('prohibited',\s*'permission_required'\)/i);
    assert.match(migration, /content_reuse_policy\s+not\s+in\s*\('prohibited',\s*'permission_required'\)/i);
  });

  it("builds minimal full-text search only from allowed index fields", () => {
    const minimalVector = migration.match(/to_tsvector\([\s\S]*?\)\s+as\s+minimal_search_vector/i)?.[0] ?? "";
    assert.match(minimalVector, /canonical_url/i);
    assert.match(minimalVector, /source_domain/i);
    assert.match(minimalVector, /normalized_city/i);
    assert.match(minimalVector, /normalized_property_type/i);
    assert.match(minimalVector, /normalized_intent/i);
    assert.doesNotMatch(minimalVector, /d\.title|d\.snippet|price|surface/i);
  });

  it("never exposes protected fields on the external minimal lane", () => {
    assert.match(migration, /rich_content_allowed\s+then\s+row_page\.snippet\s+else\s+null::text/i);
    assert.match(migration, /rich_content_allowed\s+then\s+row_page\.normalized_price_mad\s+else\s+null::numeric/i);
    assert.match(migration, /rich_content_allowed\s+then\s+row_page\.normalized_surface_m2\s+else\s+null::numeric/i);
    assert.match(migration, /rich_content_allowed\s+then\s+row_page\.price_per_m2_mad\s+else\s+null::numeric/i);
    assert.match(migration, /'Annonce immobilière'/i);
    assert.match(migration, /external_minimal_index/i);
  });

  it("does not use hidden price or surface as public filters on minimal rows", () => {
    assert.match(
      migration,
      /external_minimal_allowed[\s\S]*?p_min_price\s+is\s+null[\s\S]*?p_max_price\s+is\s+null[\s\S]*?p_min_surface\s+is\s+null[\s\S]*?p_max_surface\s+is\s+null/i,
    );
  });

  it("keeps the SECURITY DEFINER RPC server-only", () => {
    assert.match(migration, /security\s+definer/i);
    assert.match(
      migration,
      /revoke\s+all\s+on\s+function\s+public\.search_public_representations_v2[\s\S]*?from\s+PUBLIC\s*,\s*anon\s*,\s*authenticated/i,
    );
    assert.match(
      migration,
      /grant\s+execute\s+on\s+function\s+public\.search_public_representations_v2[\s\S]*?to\s+service_role/i,
    );
  });
});
