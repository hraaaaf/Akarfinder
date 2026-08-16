import {
  hasFreshProviderEvidence,
  type GeoProviderEvidence,
  type GeoProviderUnavailable,
} from "@/lib/geo/provider-contracts";

export type ProviderWithId = { readonly id: string };

type AvailableWithEvidence = { status: "available"; evidence: GeoProviderEvidence };
type ProviderResult = AvailableWithEvidence | GeoProviderUnavailable;
type Clock = Date | (() => Date);

export type FailoverResult<T extends ProviderResult> = {
  result: T | GeoProviderUnavailable;
  attemptedProviderIds: string[];
};

function clockNow(clock: Clock): Date {
  return typeof clock === "function" ? clock() : clock;
}

/**
 * Ordered, deterministic failover. Provider results only win when their
 * evidence is attributable, fresh, and bound to the provider that produced
 * the result. A fixed Date keeps deterministic tests; runtime uses a clock
 * evaluated after each provider response so newly created evidence is not
 * rejected as future-dated by milliseconds.
 */
export async function executeProviderFailover<P extends ProviderWithId, T extends ProviderResult>(
  providers: readonly P[],
  execute: (provider: P) => Promise<T>,
  now: Clock = () => new Date(),
): Promise<FailoverResult<T>> {
  const attemptedProviderIds: string[] = [];
  let lastFailure: GeoProviderUnavailable | null = null;

  for (const provider of providers) {
    attemptedProviderIds.push(provider.id);
    try {
      const result = await execute(provider);
      if (result.status === "available") {
        if (
          result.evidence.providerId === provider.id &&
          hasFreshProviderEvidence(result.evidence, clockNow(now))
        ) {
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
