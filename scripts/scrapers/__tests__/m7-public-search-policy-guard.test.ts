import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260824092200_m7_public_search_link_only_recovery.sql"),
  "utf8",
);

describe("M7-E canonical-link-only recovery", () => {
  it("keeps rich content behind explicit partner rights", () => {
    assert.match(migration, /authorization_status\s*=\s*'authorized_partner'/i);
    assert.match(migration, /content_reuse_policy\s*=\s*'authorized'/i);
    assert.match(migration, /display_policy\s*=\s*'partner_content'/i);
    assert.match(migration, /acquisition_mode\s+in\s*\('authorized_detail_feed',\s*'partner_feed'\)/i);
  });

  it("allows minimal indexing from canonical link policy without granting content reuse", () => {
    assert.match(migration, /authorization_status\s*<>\s*'prohibited'/i);
    assert.match(migration, /display_policy\s*=\s*'canonical_link_only'/i);
    assert.match(migration, /machine_gate\s*=\s*'canonical_link_only'/i);
    assert.match(migration, /ingestion_gate\s*=\s*'canonical_link_only'/i);
    assert.match(migration, /display_gate\s*=\s*'external_tail_link_only'/i);
    assert.doesNotMatch(migration, /tail\.review_status|tail\.manual_approval_required/i);
  });

  it("builds minimal search only from link/index-safe fields", () => {
    const minimalVector = migration.match(/to_tsvector\([\s\S]*?\)\s+as\s+minimal_search_vector/i)?.[0] ?? "";
    assert.match(minimalVector, /canonical_url/i);
    assert.match(minimalVector, /source_domain/i);
    assert.match(minimalVector, /normalized_city/i);
    assert.match(minimalVector, /normalized_property_type/i);
    assert.match(minimalVector, /normalized_intent/i);
    assert.doesNotMatch(minimalVector, /d\.title|d\.snippet|price|surface/i);
  });

  it("never exposes protected fields on the minimal lane", () => {
    assert.match(migration, /rich_content_allowed\s+then\s+row_page\.snippet\s+else\s+null::text/i);
    assert.match(migration, /rich_content_allowed\s+then\s+row_page\.normalized_price_mad\s+else\s+null::numeric/i);
    assert.match(migration, /rich_content_allowed\s+then\s+row_page\.normalized_surface_m2\s+else\s+null::numeric/i);
    assert.match(migration, /rich_content_allowed\s+then\s+row_page\.price_per_m2_mad\s+else\s+null::numeric/i);
    assert.match(migration, /'Annonce immobilière'/i);
    assert.match(migration, /external_minimal_index/i);
  });

  it("does not infer hidden price or surface through filters", () => {
    assert.match(migration, /external_minimal_allowed[\s\S]*?p_min_price\s+is\s+null[\s\S]*?p_max_price\s+is\s+null[\s\S]*?p_min_surface\s+is\s+null[\s\S]*?p_max_surface\s+is\s+null/i);
  });

  it("keeps the privileged RPC server-only", () => {
    assert.match(migration, /security\s+definer/i);
    assert.match(migration, /from\s+PUBLIC\s*,\s*anon\s*,\s*authenticated/i);
    assert.match(migration, /to\s+service_role/i);
  });
});
