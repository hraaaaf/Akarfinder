import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const read = (name: string) => readFileSync(join(root, "supabase/migrations", name), "utf8");
const m1 = read("20260810201500_mass_first_1_source_policy_public_gate.sql");
const m2 = read("20260810202500_mass_first_2_quality_not_eligibility.sql");
const m3 = read("20260810203500_mass_first_3_listing_power_score.sql");
const m4 = read("20260810204500_mass_first_4_public_search_power_ranking.sql");
const m5 = read("20260810205500_mass_first_5_reclassification_certification.sql");

describe("MASS-FIRST — permanent truth contract", () => {
  it("keeps Source Registry public permission channel-aware and fail-closed", () => {
    assert.match(m1, /mass_first_source_public_mode_v1\(\s*p_source_domain text,\s*p_seed_provider text/si);
    assert.match(m1, /requested_channel = any\(p\.allowed_discovery_channels\)/);
    assert.match(m1, /coalesce\(\([\s\S]*?'blocked'\)/);
    assert.match(m1, /canonical_link_only/);
    assert.match(m1, /partner_content/);
    assert.match(m1, /revoke all on function public\.mass_first_source_public_allowed_v1\(text,text\) from public, anon, authenticated/i);
  });

  it("never uses quality as a hard structural eligibility gate", () => {
    assert.match(m2, /quality_used_as_hard_eligibility_gate',false/);
    assert.match(m2, /quality_retained_for_ranking',true/);
    for (const tier of ["Q0_link_only", "Q1_contextual", "D", "REJECTED"]) {
      assert.match(m2, new RegExp(tier));
    }
    assert.doesNotMatch(
      m2.match(/create or replace function public\.odm06_display_eligibility\([\s\S]*?\$\$;/i)?.[0] ?? "",
      /quality_tier\s+(?:is|null|in|=|<>)/i,
    );
  });

  it("keeps Listing Power deterministic, bounded and independent from display rights", () => {
    assert.match(m3, /returns smallint[\s\S]*?immutable/i);
    assert.match(m3, /least\(100,greatest\(0,/);
    assert.match(m3, /listing_power_score between 0 and 100/);
    assert.match(m3, /'eligibility_dependency',false/);
    assert.match(m3, /thin_index_listing_power_rank_idx/);
  });

  it("redacts canonical-link-only source content at the Search RPC boundary", () => {
    assert.match(m4, /case when d\.public_mode='partner_content' then d\.title else null end as title/);
    assert.match(m4, /case when d\.public_mode='partner_content' then d\.snippet else null end as snippet/);
    assert.match(m4, /case when d\.public_mode='partner_content' then d\.normalized_price_mad else null end/);
    assert.match(m4, /case when d\.public_mode='partner_content' then d\.normalized_surface_m2 else null end/);
    assert.match(m4, /d\.public_mode in \('canonical_link_only','partner_content'\)/);
    assert.match(m4, /listing_power_score,0\)::real \/ 100\.0::real \* 0\.75::real/);
  });

  it("certifies channel-aware policy, structural purity, RPC parity, ACL, redaction and score/version integrity", () => {
    assert.doesNotMatch(m5, /mass_first_source_public_allowed_v1\(d\.source_domain\)/);
    assert.match(m5, /mass_first_source_public_allowed_v1\(d\.source_domain,d\.seed_provider\)/);
    for (const key of [
      "structural_eligibility_mismatch_rows",
      "source_policy_leak_rows",
      "non_listing_public_rows",
      "category_public_rows",
      "ambiguous_public_rows",
      "canonical_link_payload_leak_rows",
      "seed_channel_identity_drift_rows",
      "unscored_rows",
      "out_of_bounds_scores",
      "rpc_matches_certified_surface",
      "source_gate_security_invoker",
      "search_rpc_anon_denied",
      "listing_power_index_present",
    ]) assert.match(m5, new RegExp(key));
    assert.match(m5, /ranking_policy_version='mass-first-v2'/);
    assert.match(m5, /mass_first_policy_rows=t\.audited_rows/);
    assert.match(m5, /raise exception 'MASS-FIRST certification failed/);
  });
});
