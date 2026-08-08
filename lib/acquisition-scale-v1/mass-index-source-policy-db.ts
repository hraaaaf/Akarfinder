// P0.1 — Runtime adapter for the production Source Registry.
// Read-only. It never mutates policy and never manufactures fallback rows.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import type { MassIndexSourcePolicy } from "@/lib/acquisition-scale-v1/mass-index-source-policy";

const POLICY_COLUMNS = [
  "source_domain",
  "allowed_discovery_channels",
  "review_status",
  "next_review_at",
  "no_bypass_required",
  "policy_hash",
  "acquisition_mode",
  "machine_gate",
  "ingestion_gate",
  "display_gate",
].join(",");

export async function loadMassIndexSourcePolicies(sourceDomains: string[]): Promise<MassIndexSourcePolicy[]> {
  const domains = [...new Set(sourceDomains.map((domain) => domain.trim().toLowerCase()).filter(Boolean))].sort();
  if (domains.length === 0) return [];

  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("source_policy_registry")
    .select(POLICY_COLUMNS)
    .in("source_domain", domains);

  if (error) {
    throw new Error(`P0.1 Source Registry read failed: ${error.message}`);
  }

  return (data ?? []) as unknown as MassIndexSourcePolicy[];
}
