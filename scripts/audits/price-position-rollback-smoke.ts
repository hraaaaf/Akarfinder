import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getIndicativePricePositionDecision, getIndicativePricePositionDisplay } from "@/lib/price-position/price-position-display";
import { getMarketPriceScoreDisplay } from "@/lib/market/market-price-score-display";

type RollbackSmokeResult = {
  flag_off_hidden: boolean;
  flag_on_visible: boolean;
  internal_leak: boolean;
  routes_checked: number;
  route_failures: string[];
};

function withEnv<T>(changes: Record<string, string | undefined>, fn: () => T): T {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(changes)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function makeListing() {
  return {
    id: "rollback-smoke-listing",
    city: "Casablanca",
    neighborhood: "Maarif",
    price: 1_500_000,
    surface_m2: 100,
    price_per_m2: 15_000,
    property_type: "Appartement",
    transaction_type: "buy",
    source_name: "akarfinder",
  } as const;
}

async function scanRoutes(baseUrl: string): Promise<{ checked: number; failures: string[] }> {
  const routes = [
    "/",
    "/search?q=appartement%20casablanca",
    "/search?q=location%20studio%20casablanca",
    "/immobilier/casablanca",
    "/immobilier/casablanca/maarif",
    "/demo/promoteur",
    "/demo/agence",
    "/robots.txt",
    "/sitemap.xml",
  ];

  const forbidden = [
    "value_low",
    "value_median",
    "value_high",
    "evidence_ref",
    "source_registry",
    "benchmark_value",
  ];

  const failures: string[] = [];
  let checked = 0;

  for (const route of routes) {
    const response = await fetch(new URL(route, baseUrl), { redirect: "follow" });
    const body = await response.text();
    checked += 1;
    if (response.status !== 200) {
      failures.push(`${route}: status ${response.status}`);
    }
    for (const term of forbidden) {
      if (body.includes(term)) {
        failures.push(`${route}: leaked ${term}`);
      }
    }
  }

  return { checked, failures };
}

export async function runPricePositionRollbackSmoke(baseUrl?: string): Promise<RollbackSmokeResult> {
  const flagOffHidden = withEnv(
    {
      PRICE_POSITION_REFERENCE_ENABLED: "false",
      NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined,
    },
    () => {
      const display = getIndicativePricePositionDisplay(makeListing() as never);
      const decision = getIndicativePricePositionDecision(makeListing() as never);
      const score = getMarketPriceScoreDisplay({
        city: "Casablanca",
        property_type: "appartement",
        surface_m2: 100,
        total_price_mad: 1_000_000,
      });
      return display === null && decision === null && score === null;
    }
  );

  const flagOnVisible = withEnv(
    {
      PRICE_POSITION_REFERENCE_ENABLED: "true",
      NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined,
    },
    () => {
      const display = getIndicativePricePositionDisplay(makeListing() as never);
      const decision = getIndicativePricePositionDecision(makeListing() as never);
      return Boolean(display && decision?.public_view && decision.benchmark_id);
    }
  );

  const internalLeak = withEnv(
    {
      PRICE_POSITION_REFERENCE_ENABLED: "true",
      NEXT_PUBLIC_PRICE_POSITION_REFERENCE_ENABLED: undefined,
    },
    () => {
      const decision = getIndicativePricePositionDecision(makeListing() as never);
      if (!decision) return true;
      const serialized = JSON.stringify({
        public_view: decision.public_view,
        benchmark_id: decision.benchmark_id,
        benchmark_value: decision.benchmark_value,
        benchmark_date: decision.benchmark_date,
        benchmark_methodology: decision.benchmark_methodology,
        benchmark_source_type: decision.benchmark_source_type,
      });
      return !serialized.includes("value_low") && !serialized.includes("value_median") && !serialized.includes("value_high") && !serialized.includes("evidence_ref") && !serialized.includes("source_registry");
    }
  );

  let routesChecked = 0;
  const routeFailures: string[] = [];

  if (baseUrl) {
    const routeResult = await scanRoutes(baseUrl);
    routesChecked = routeResult.checked;
    routeFailures.push(...routeResult.failures);
  }

  assert.ok(flagOffHidden, "Flag off should hide all surfaces");
  assert.ok(flagOnVisible, "Flag on should keep the feature visible for eligible listings");
  assert.ok(internalLeak, "Internal leak detected");
  assert.equal(routeFailures.length, 0, routeFailures.join("; "));

  return {
    flag_off_hidden: flagOffHidden,
    flag_on_visible: flagOnVisible,
    internal_leak: internalLeak,
    routes_checked: routesChecked,
    route_failures: routeFailures,
  };
}

async function main() {
  const baseUrl = process.env.PRICE_POSITION_ROLLBACK_SMOKE_BASE_URL?.trim();
  const result = await runPricePositionRollbackSmoke(baseUrl || undefined);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && process.argv[1].includes("price-position-rollback-smoke")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
