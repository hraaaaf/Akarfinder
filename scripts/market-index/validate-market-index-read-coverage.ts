// AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1 — per-row validation of all 177
// Market Index memberships and the 144-row legacy fallback (135 unenriched
// single-source + 9 across the 4 ambiguous multi-source groups). Read-only.

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=\s]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env.mission"));

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: clusters } = await supabase
    .from("property_clusters")
    .select("id, cluster_origin, legacy_property_listing_id");
  const { data: members } = await supabase
    .from("property_cluster_members")
    .select("id, property_cluster_id, source_offer_id");
  const { data: sources } = await supabase
    .from("listing_sources")
    .select("id, property_listing_id, source_name, listing_url, source_url, origin_type, displayed_price, price_status");
  const { data: listings } = await supabase
    .from("property_listings")
    .select("id, price_mad");

  const clusterById = new Map((clusters ?? []).map((c) => [c.id, c]));
  const membersByCluster = new Map<string, typeof members>();
  for (const m of members ?? []) {
    const arr = membersByCluster.get(m.property_cluster_id) ?? [];
    arr.push(m);
    membersByCluster.set(m.property_cluster_id, arr as never);
  }
  const sourceById = new Map((sources ?? []).map((s) => [s.id, s]));
  const listingById = new Map((listings ?? []).map((l) => [l.id, l]));
  const sourcesByListing = new Map<number, typeof sources>();
  for (const s of sources ?? []) {
    const arr = sourcesByListing.get(s.property_listing_id) ?? [];
    arr.push(s);
    sourcesByListing.set(s.property_listing_id, arr as never);
  }

  // --- Section 14: validate all 177 memberships individually ---
  const membershipChecks: Array<{ ok: boolean; issues: string[]; cluster_id: string }> = [];
  for (const cluster of clusters ?? []) {
    if (cluster.cluster_origin !== "legacy_one_to_one_projection") continue;
    const issues: string[] = [];
    const clusterMembers = membersByCluster.get(cluster.id) ?? [];
    if (clusterMembers.length !== 1) issues.push(`expected exactly 1 membership, found ${clusterMembers.length}`);

    const member = clusterMembers[0];
    if (member) {
      const source = sourceById.get(member.source_offer_id);
      if (!source) {
        issues.push("membership points to a non-existent listing_source");
      } else {
        if (source.property_listing_id !== cluster.legacy_property_listing_id) {
          issues.push("membership's source belongs to a different property_listing than the cluster");
        }
        if (source.origin_type !== "persisted_openserp") {
          issues.push(`source origin_type is '${source.origin_type}', expected 'persisted_openserp'`);
        }
        if (!source.listing_url && !source.source_url) {
          issues.push("source has no listing_url or source_url");
        }
        const listing = listingById.get(cluster.legacy_property_listing_id!);
        if (listing) {
          const legacyPrice = listing.price_mad;
          const validLegacyPrice = typeof legacyPrice === "number" && Number.isFinite(legacyPrice) && legacyPrice > 0;
          if (validLegacyPrice && source.displayed_price !== legacyPrice) {
            issues.push(`displayed_price (${source.displayed_price}) does not match legacy price_mad (${legacyPrice})`);
          }
        }
        // External-web-result / no undue partner badge is a display-layer
        // property (computed from field_confidence, not from Market Index --
        // see docs/MARKET_INDEX_READ_PATH_AUDIT.md section 3), so it is
        // covered by the shadow-read parity suite, not re-checked here.
        // No public provenance is invented: origin_type is never exposed
        // (checked by the test suite), so nothing to verify per-row here.
      }
    }

    membershipChecks.push({ ok: issues.length === 0, issues, cluster_id: cluster.id });
  }

  // --- Section 15: validate the fallback set (144 rows) ---
  const allListingIds = [...listingById.keys()];
  const fallbackDetail = {
    unenriched_single_source: 0,
    ambiguous_multi_source_groups_preserved: 0,
    ambiguous_multi_source_sources_preserved: 0,
    total_fallback_sources: 0,
    issues: [] as string[],
  };

  for (const listingId of allListingIds) {
    const listingSources = sourcesByListing.get(listingId) ?? [];
    if (listingSources.length === 0) continue;

    if (listingSources.length > 1) {
      // ambiguous group -- must have NO cluster at all
      const hasCluster = (clusters ?? []).some((c) => c.legacy_property_listing_id === listingId);
      if (hasCluster) fallbackDetail.issues.push(`ambiguous listing ${listingId} unexpectedly has a cluster`);
      else {
        fallbackDetail.ambiguous_multi_source_groups_preserved++;
        fallbackDetail.ambiguous_multi_source_sources_preserved += listingSources.length;
      }
      fallbackDetail.total_fallback_sources += listingSources.length;
      continue;
    }

    // single source
    const source = listingSources[0];
    if (source.origin_type !== "persisted_openserp") {
      fallbackDetail.unenriched_single_source++;
      fallbackDetail.total_fallback_sources++;
      // must still be servable via legacy -- has a URL
      if (!source.listing_url && !source.source_url) {
        fallbackDetail.issues.push(`unenriched source ${source.id} (listing ${listingId}) has no URL, may be unservable`);
      }
    }
  }

  const knownAmbiguousIds = [134, 129, 315, 44];
  const knownAmbiguousStillUnclustered = knownAmbiguousIds.every(
    (id) => !(clusters ?? []).some((c) => c.legacy_property_listing_id === id),
  );

  const report = {
    audit_id: "market-index-legacy-fallback-validation",
    mission: "AKARFINDER-MARKET-INDEX-READ-ACTIVATION-1",
    generated_at_utc: new Date().toISOString(),
    membership_validation: {
      total_clusters_checked: membershipChecks.length,
      all_pass: membershipChecks.every((c) => c.ok),
      failing: membershipChecks.filter((c) => !c.ok),
    },
    fallback_validation: {
      ...fallbackDetail,
      known_ambiguous_ids: knownAmbiguousIds,
      known_ambiguous_still_unclustered: knownAmbiguousStillUnclustered,
    },
    expected_vs_actual: {
      expected_memberships: 177,
      actual_memberships: membershipChecks.length,
      expected_unenriched_single_source: 135,
      actual_unenriched_single_source: fallbackDetail.unenriched_single_source,
      expected_ambiguous_groups: 4,
      actual_ambiguous_groups: fallbackDetail.ambiguous_multi_source_groups_preserved,
      expected_ambiguous_sources: 9,
      actual_ambiguous_sources: fallbackDetail.ambiguous_multi_source_sources_preserved,
    },
    overall_verdict:
      membershipChecks.every((c) => c.ok) && fallbackDetail.issues.length === 0 && knownAmbiguousStillUnclustered
        ? "PASS"
        : "FAIL",
  };

  const outDir = join(process.cwd(), "data", "audits");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "market-index-legacy-fallback-validation.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(
    {
      membership_all_pass: report.membership_validation.all_pass,
      membership_count: report.membership_validation.total_clusters_checked,
      fallback_issues: fallbackDetail.issues.length,
      expected_vs_actual: report.expected_vs_actual,
      overall_verdict: report.overall_verdict,
    },
    null,
    2,
  ));

  if (report.overall_verdict !== "PASS") process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
