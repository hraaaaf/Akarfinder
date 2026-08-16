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
 * evidence is attributable and fresh. Invalid/empty/upstream results fail
 * closed and allow the next configured provider to try.
 */
export async function executeProviderFailover<P extends ProviderWithId, T extends ProviderResult>(
  providers: readonly P[],
  execute: (provider: P) => Promise<T>,
  now = new Date(),
): Promise<FailoverResult<T>> {
  const attemptedProviderIds: string[] = [];

  for (const provider of providers) {
    attemptedProviderIds.push(provider.id);
    try {
      const result = await execute(provider);
      if (result.status === "available" && hasFreshProviderEvidence(result.evidence, now)) {
        return { result, attemptedProviderIds };
      }
    } catch {
      // Provider failures are isolated. The public layer receives an explicit
      // unavailable result if all configured providers fail.
    }
  }

  return {
    result: {
      status: "unavailable",
      providerId: attemptedProviderIds.at(-1) ?? "none",
      reason: providers.length === 0 ? "not_configured" : "upstream_error",
    },
    attemptedProviderIds,
  };
}
