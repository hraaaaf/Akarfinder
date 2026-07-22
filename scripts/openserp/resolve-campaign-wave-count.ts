#!/usr/bin/env tsx
// MASS-ACQUISITION-CAMPAIGN-V2 — read-only scheduler catch-up resolver.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { resolveCampaignWaveCount } from "@/lib/openserp-ingestion/github-campaign-policy";

async function main() {
  try {
    const supabase = getSupabaseServerClient();
    const response = await supabase
      .from("openserp_engine_budget_state")
      .select("last_success_at")
      .not("last_success_at", "is", null)
      .order("last_success_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (response.error) throw new Error(response.error.message);
    const lastSuccessAt = (response.data?.last_success_at as string | null | undefined) ?? null;
    process.stdout.write(String(resolveCampaignWaveCount(lastSuccessAt)));
  } catch (error) {
    // Fail safe: a telemetry/read failure must never create an acquisition storm.
    console.error(`[campaign-wave-count] ${error instanceof Error ? error.message : String(error)}; falling back to 1 wave`);
    process.stdout.write("1");
  }
}

void main();
