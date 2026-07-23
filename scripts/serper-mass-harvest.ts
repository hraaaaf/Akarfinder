import { runSerperMassHarvest } from "@/lib/serper-mass-harvest/runner";

function parseMode(args: string[]): "plan" | "run" | "apply" {
  if (args.includes("--apply")) return "apply";
  if (args.includes("--run")) return "run";
  return "plan";
}

function parseMaxCalls(args: string[]): number | undefined {
  const inline = args.find((arg) => arg.startsWith("--max-calls="));
  if (inline) {
    const value = Number(inline.split("=", 2)[1]);
    if (!Number.isInteger(value) || value < 1 || value > 2000) {
      throw new Error("--max-calls must be an integer between 1 and 2000");
    }
    return value;
  }
  const index = args.indexOf("--max-calls");
  if (index >= 0) {
    const value = Number(args[index + 1]);
    if (!Number.isInteger(value) || value < 1 || value > 2000) {
      throw new Error("--max-calls must be an integer between 1 and 2000");
    }
    return value;
  }
  return undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = parseMode(args);
  const maxCalls = parseMaxCalls(args);

  const summary = await runSerperMassHarvest({ mode, maxCalls });
  const topYield = [...summary.query_metrics]
    .sort((a, b) => {
      if (b.accepted_results !== a.accepted_results) return b.accepted_results - a.accepted_results;
      return b.new_unique_results - a.new_unique_results;
    })
    .slice(0, 20)
    .map((metric) => ({
      phase: metric.query.phase,
      source: metric.query.source_id,
      query: metric.query.query,
      raw: metric.raw_results,
      accepted: metric.accepted_results,
      new_unique: metric.new_unique_results,
      duplicate: metric.duplicate_results,
      category_or_noise: metric.category_or_noise_results,
      yield_ratio: Number(metric.yield_ratio.toFixed(3)),
    }));

  console.log(
    JSON.stringify(
      {
        run_id: summary.run_id,
        mode: summary.mode,
        hard_cap: summary.hard_cap,
        calls: {
          reserved: summary.calls_reserved,
          succeeded: summary.calls_succeeded,
          failed: summary.calls_failed,
        },
        results: {
          raw: summary.raw_results,
          observations: summary.observations,
          unique_canonical_urls: summary.unique_canonical_urls,
          accepted: summary.accepted,
          rejected: summary.rejected,
          unclassified: summary.unclassified,
          persisted: summary.persisted,
        },
        executed_by_phase: {
          fixed: summary.fixed_queries,
          adaptive: summary.adaptive_queries,
          discovery: summary.discovery_queries,
          refresh: summary.refresh_queries,
        },
        top_yield_queries: topYield,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[serper-mass-harvest] fatal", error);
  process.exitCode = 1;
});
