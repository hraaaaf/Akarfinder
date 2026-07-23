export type Phase1SearchReleaseGateCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

export type Phase1SearchReleaseGateResult = {
  ok: boolean;
  checks: Phase1SearchReleaseGateCheck[];
};

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/**
 * Code-side preflight for the single end-of-Phase-1 release.
 *
 * This function never deploys and never flips a feature flag. It only proves
 * that the runtime configuration is explicit enough to attempt the one allowed
 * Vercel release. Post-deploy SHA/HTML/Search smoke checks remain mandatory.
 */
export function evaluatePhase1SearchReleaseGate(
  env: NodeJS.ProcessEnv,
): Phase1SearchReleaseGateResult {
  const gatewayEnabled = enabled(env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED);
  const persistedExternalEnabled = enabled(env.PERSISTED_OPENSERP_LISTINGS_ENABLED);

  const checks: Phase1SearchReleaseGateCheck[] = [
    {
      id: "database_provider_supabase",
      ok: env.DATABASE_PROVIDER === "supabase",
      detail: "DATABASE_PROVIDER must explicitly be supabase for the public release.",
    },
    {
      id: "supabase_url_present",
      ok: Boolean(env.SUPABASE_URL?.trim()),
      detail: "SUPABASE_URL must be configured.",
    },
    {
      id: "supabase_service_role_present",
      ok: Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      detail: "SUPABASE_SERVICE_ROLE_KEY must be configured for the server read-model.",
    },
    {
      id: "public_search_discovery_lane_explicit",
      ok: gatewayEnabled || persistedExternalEnabled,
      detail:
        "At least one public discovery lane must be explicitly enabled: Search Gateway or persisted OpenSERP external results.",
    },
    {
      id: "search_gateway_flag_explicit",
      ok: env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED === "true" || env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED === "false",
      detail: "NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED must be explicitly true/false; no implicit production assumption.",
    },
    {
      id: "persisted_openserp_flag_explicit",
      ok: env.PERSISTED_OPENSERP_LISTINGS_ENABLED === "true" || env.PERSISTED_OPENSERP_LISTINGS_ENABLED === "false",
      detail: "PERSISTED_OPENSERP_LISTINGS_ENABLED must be explicitly true/false; publication stays opt-in.",
    },
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}
