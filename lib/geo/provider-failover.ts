import {
  hasFreshProviderEvidence,
  type GeoProviderEvidence,
  type GeoProviderUnavailable,
} from "@/lib/geo/provider-contracts";

export type ProviderWithId = { readonly id: string };

type AvailableWithEvidence = { status: "available"; evidence: GeoProviderEvidence };
type ProviderResult = AvailableWithEvidence | GeoProviderUnavailable;

export type FailoverResult<T extends ProviderResult> = {
  result: T | GeoProviderUnavailable;
  attemptedProviderIds: string[];
};

/**
 * Ordered, deterministic failover. Provider results only win when their
 * evidence is attributable, fresh, and bound to the provider that produced
 * the result. Invalid/empty/upstream results fail closed and allow the next
 * configured provider to try.
 */
export async function executeProviderFailover<P extends ProviderWithId, T extends ProviderResult>(
  providers: readonly P[],
  execute: (provider: P) => Promise<T>,
  now = new Date(),
): Promise<FailoverResult<T>> {
  const attemptedProviderIds: string[] = [];
  let lastFailure: GeoProviderUnavailable | null = null;

  for (const provider of providers) {
    attemptedProviderIds.push(provider.id);
    try {
      const result = await execute(provider);
      if (result.status === "available") {
        if (result.evidence.providerId === provider.id && hasFreshProviderEvidence(result.evidence, now)) {
          return { result, attemptedProviderIds };
        }
        lastFailure = {
          status: "unavailable",
          providerId: provider.id,
          reason: "invalid_evidence",
        };
        continue;
      }
      lastFailure = result;
    } catch {
      lastFailure = {
        status: "unavailable",
        providerId: provider.id,
        reason: "upstream_error",
      };
    }
  }

  return {
    result: lastFailure ?? {
      status: "unavailable",
      providerId: "none",
      reason: "not_configured",
    },
    attemptedProviderIds,
  };
}
