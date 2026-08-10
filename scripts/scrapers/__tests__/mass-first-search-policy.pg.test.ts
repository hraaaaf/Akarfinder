import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrations = [
  "20260810201500_mass_first_1_source_policy_public_gate.sql",
  "20260810202500_mass_first_2_quality_not_eligibility.sql",
  "20260810203500_mass_first_3_listing_power_score.sql",
  "20260810204500_mass_first_4_public_search_power_ranking.sql",
  "20260810205500_mass_first_5_reclassification_certification.sql",
].map((name) => readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8"));

describe("MASS-FIRST — PostgreSQL semantic chain", () => {
  it("applies all five migrations and proves truth, redaction, ranking and fail-closed policy", async () => {
    const db = new PGlite();

    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;

      create table public.source_policy_registry (
        source_domain text primary key,
        no_bypass_required boolean not null default true,
        policy_hash text,
        review_status text,
        next_review_at timestamptz,
        allowed_discovery_channels text[] not null default '{}',
        machine_gate text,
        ingestion_gate text,
        display_policy text,
        display_gate text,
        acquisition_mode text,
        authorization_status text,
        content_reuse_policy text
      );

      create table public.thin_index_search_documents (
        seed_id uuid primary key,
        canonical_url text,
        source_domain text,
        seed_provider text,
        freshness_status text,
        title text,
        snippet text,
        normalized_city text,
        normalized_property_type text,
        normalized_intent text,
        normalized_price_mad numeric,
        normalized_surface_m2 numeric,
        price_per_m2_mad numeric,
        quality_tier text,
        quality_score smallint,
        display_eligibility text,
        display_eligibility_reason text,
        ranking_quality_boost real,
        ranking_policy_version text,
        vertical_classification text,
        document_kind text,
        document_kind_version text,
        search_vector tsvector,
        updated_at timestamptz not null default now()
      );

      create index thin_index_search_documents_fts_idx
        on public.thin_index_search_documents using gin(search_vector);

      create or replace function public.odm06_ranking_quality_boost(
        p_quality_tier text, p_quality_score integer, p_freshness_status text
      ) returns real language sql immutable set search_path='' as $$
        select least(0.35::real, greatest(0::real, coalesce(p_quality_score,0)::real / 100.0::real * 0.35::real));
      $$;
      create or replace function public.odm04_normalize_city(p text)
        returns text language sql immutable set search_path='' as $$ select lower(nullif(btrim(p),'')); $$;
      create or replace function public.odm04_normalize_property_type(p text)
        returns text language sql immutable set search_path='' as $$ select lower(nullif(btrim(p),'')); $$;
      create or replace function public.odm04_normalize_intent(p text)
        returns text language sql immutable set search_path='' as $$ select lower(nullif(btrim(p),'')); $$;

      insert into public.source_policy_registry (
        source_domain,policy_hash,review_status,next_review_at,allowed_discovery_channels,
        machine_gate,ingestion_gate,display_policy,display_gate,acquisition_mode,
        authorization_status,content_reuse_policy
      ) values
        ('canonical.example','h1','current',now()+interval '30 days',array['public_sitemap'],
         'canonical_link_only','canonical_link_only','canonical_link_only','external_tail_link_only',
         'public_sitemap_canonical_link','unverified','unknown'),
        ('partner.example','h2','current',now()+interval '30 days',array['public_sitemap'],
         'partner_feed','partner_feed','partner_content','public',
         'partner_feed','authorized_partner','authorized'),
        ('blocked.example','h3','current',now()+interval '30 days',array['public_sitemap'],
         'blocked_policy','blocked_policy','canonical_link_only','hidden',
         'public_sitemap_canonical_link','prohibited','prohibited');

      -- Seed the historical/pre-MASS-FIRST persisted state before installing triggers.
      insert into public.thin_index_search_documents (
        seed_id,canonical_url,source_domain,seed_provider,freshness_status,title,snippet,
        normalized_city,normalized_property_type,normalized_intent,normalized_price_mad,
        normalized_surface_m2,price_per_m2_mad,quality_tier,quality_score,
        display_eligibility,display_eligibility_reason,ranking_quality_boost,ranking_policy_version,
        vertical_classification,document_kind,document_kind_version,search_vector,updated_at
      ) values
        ('10000000-0000-4000-8000-000000000001','https://canonical.example/1','canonical.example','public_sitemap','seed_only',
         'Appartement Agdal','Texte source non réutilisable','rabat','appartement','sale',1200000,80,15000,
         'Q0_link_only',10,'ineligible','missing_quality_tier',0,'odm06-v1','real_estate_likely','LISTING','legacy',
         to_tsvector('simple','Appartement Agdal'),now()-interval '6 hours'),
        ('10000000-0000-4000-8000-000000000002','https://partner.example/2','partner.example','public_sitemap','fresh_confirmed',
         'Villa Hay Riad','Villa partenaire autorisée','rabat','villa','sale',4800000,320,15000,
         'A',95,'eligible_primary','quality_ready',0.3,'odm06-v1','real_estate_likely','LISTING','partner',
         to_tsvector('simple','Villa Hay Riad'),now()-interval '1 hour'),
        ('10000000-0000-4000-8000-000000000003','https://blocked.example/3','blocked.example','public_sitemap','fresh_confirmed',
         'Bien interdit','Ne doit jamais sortir','rabat','appartement','sale',900000,60,15000,
         'A',100,'eligible_primary','legacy_leak',0.35,'odm06-v1','real_estate_likely','LISTING','legacy',
         to_tsvector('simple','Bien interdit'),now()),
        ('10000000-0000-4000-8000-000000000004','https://partner.example/category','partner.example','public_sitemap','fresh_confirmed',
         'Catégorie appartements','Collection','rabat','appartement','sale',null,null,null,
         'A',90,'eligible_primary','legacy_leak',0.3,'odm06-v1','real_estate_likely','CATEGORY','legacy',
         to_tsvector('simple','Catégorie appartements'),now()),
        ('10000000-0000-4000-8000-000000000005','https://partner.example/ambiguous','partner.example','public_sitemap','fresh_confirmed',
         'Page immobilière','Ambiguë','rabat',null,null,null,null,null,
         'B',70,'eligible_secondary','ambiguous_property_result',0.05,'odm06-v1','real_estate_likely','AMBIGUOUS','legacy',
         to_tsvector('simple','Page immobilière'),now()),
        ('10000000-0000-4000-8000-000000000006','https://partner.example/not-real-estate','partner.example','public_sitemap','fresh_confirmed',
         'Article','Pas un bien','rabat',null,null,null,null,null,
         'A',90,'eligible_primary','legacy_leak',0.3,'odm06-v1','other','LISTING','legacy',
         to_tsvector('simple','Article'),now());
    `);

    for (const migration of migrations) await db.exec(migration);

    const state = await db.query<{
      seed_id: string;
      display_eligibility: string;
      display_eligibility_reason: string;
      ranking_policy_version: string;
      listing_power_score: number;
    }>(`select seed_id::text,display_eligibility,display_eligibility_reason,ranking_policy_version,listing_power_score
       from public.thin_index_search_documents order by seed_id`);

    const byId = new Map(state.rows.map((row) => [row.seed_id, row]));
    assert.equal(byId.get("10000000-0000-4000-8000-000000000001")?.display_eligibility, "eligible_secondary");
    assert.equal(byId.get("10000000-0000-4000-8000-000000000001")?.display_eligibility_reason, "canonical_link_only_policy_eligible");
    assert.equal(byId.get("10000000-0000-4000-8000-000000000002")?.display_eligibility, "eligible_primary");
    assert.equal(byId.get("10000000-0000-4000-8000-000000000003")?.display_eligibility, "ineligible");
    assert.equal(byId.get("10000000-0000-4000-8000-000000000004")?.display_eligibility_reason, "category_page_not_listing");
    assert.equal(byId.get("10000000-0000-4000-8000-000000000005")?.display_eligibility_reason, "document_not_listing");
    assert.equal(byId.get("10000000-0000-4000-8000-000000000006")?.display_eligibility_reason, "vertical_not_real_estate");
    for (const row of state.rows) {
      assert.equal(row.ranking_policy_version, "mass-first-v2");
      assert.ok(row.listing_power_score >= 0 && row.listing_power_score <= 100);
    }
    assert.ok(
      (byId.get("10000000-0000-4000-8000-000000000002")?.listing_power_score ?? 0)
      > (byId.get("10000000-0000-4000-8000-000000000001")?.listing_power_score ?? 100),
    );

    const search = await db.query<{
      representation_id: string;
      title: string | null;
      snippet: string | null;
      normalized_price_mad: number | null;
      normalized_surface_m2: number | null;
      lane_weight: number;
      total_count: number;
    }>(`select representation_id::text,title,snippet,normalized_price_mad,normalized_surface_m2,lane_weight,total_count
       from public.search_public_representations_v1(p_limit=>50)`);

    assert.equal(search.rows.length, 2);
    assert.equal(Number(search.rows[0]?.total_count), 2);
    assert.equal(search.rows[0]?.representation_id, "10000000-0000-4000-8000-000000000002");
    assert.equal(search.rows[0]?.lane_weight, 0);
    const canonical = search.rows.find((row) => row.representation_id === "10000000-0000-4000-8000-000000000001");
    assert.equal(canonical?.lane_weight, 1);
    assert.equal(canonical?.title, null);
    assert.equal(canonical?.snippet, null);
    assert.equal(canonical?.normalized_price_mad, null);
    assert.equal(canonical?.normalized_surface_m2, null);

    const reportResult = await db.query<{ report: Record<string, unknown> }>(
      `select public.mass_first_5_certification_report_v1() as report`,
    );
    const report = reportResult.rows[0]?.report as Record<string, unknown>;
    assert.equal(report.certified, true);
    assert.equal(Number(report.recovered_structural_listings), 1);
    assert.equal(Number(report.eligible_search_rows), 2);
    assert.equal(Number(report.rpc_total_count), 2);
    assert.equal(Number(report.source_policy_leak_rows), 0);
    assert.equal(Number(report.non_listing_public_rows), 0);
    assert.equal(Number(report.canonical_link_payload_leak_rows), 0);
    assert.equal(Number(report.unscored_rows), 0);
    assert.equal(Number(report.out_of_bounds_scores), 0);
    assert.equal(Number(report.mass_first_policy_rows), 6);

    await db.close();
  });
});
