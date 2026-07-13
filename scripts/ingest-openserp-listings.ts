#!/usr/bin/env tsx
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import {
  executeOpenSerpDryRun,
  writeOpenSerpCandidatesToSupabase,
} from "@/lib/openserp-ingestion/pipeline";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=\s]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim();
  }
}

function parseArgs(argv: string[]) {
  const args = {
    dryRun: true,
    write: false,
    maxNew: 500,
    maxUpdates: 500,
    city: undefined as string | undefined,
    queryLimit: undefined as number | undefined,
    resume: false,
    runId: `openserp-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    reportPath: "data/ingestion-runs",
    matrixPath: undefined as string | undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--write") {
      args.write = true;
      args.dryRun = false;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
      args.write = false;
    } else if (arg === "--max-new" && argv[i + 1]) {
      args.maxNew = Number(argv[++i]);
    } else if (arg === "--max-updates" && argv[i + 1]) {
      args.maxUpdates = Number(argv[++i]);
    } else if (arg === "--city" && argv[i + 1]) {
      args.city = argv[++i];
    } else if (arg === "--query-limit" && argv[i + 1]) {
      args.queryLimit = Number(argv[++i]);
    } else if (arg === "--resume") {
      args.resume = true;
    } else if (arg === "--run-id" && argv[i + 1]) {
      args.runId = argv[++i];
    } else if (arg === "--report-path" && argv[i + 1]) {
      args.reportPath = argv[++i];
    } else if (arg === "--matrix-path" && argv[i + 1]) {
      args.matrixPath = argv[++i];
    }
  }

  return args;
}

async function main() {
  loadEnvFile(join(process.cwd(), ".env.local"));
  loadEnvFile(join(process.cwd(), ".env.mission"));

  if (!process.env.OPENSERP_BINARY_PATH) {
    process.env.OPENSERP_BINARY_PATH = "C:\\Users\\lenovo\\go\\bin\\openserp.exe";
  }

  const args = parseArgs(process.argv.slice(2));
  const matrixPath = resolve(
    process.cwd(),
    args.matrixPath ??
      (existsSync(resolve(process.cwd(), "data/openserp/ingestion-quality-query-matrix-v2.json"))
        ? "data/openserp/ingestion-quality-query-matrix-v2.json"
        : "data/openserp/ingestion-pilot-query-matrix.json"),
  );
  const reportRoot = resolve(process.cwd(), args.reportPath);

  const dryRun = await executeOpenSerpDryRun(matrixPath, {
    runId: args.runId,
    reportPath: reportRoot,
    queryLimit: args.queryLimit,
    city: args.city,
    env: process.env,
  });

  const runDir = join(reportRoot, args.runId);
  const summary = {
    run_id: args.runId,
    mode: args.write ? "write" : "dry_run",
    provider: dryRun.provider,
    metrics: dryRun.metrics,
    production_write_authorized:
      dryRun.metrics.queries_executed >= 60 &&
      dryRun.metrics.zero_result_queries >= 0 &&
      dryRun.metrics.raw_results >= 500 &&
      dryRun.metrics.individual_candidates >= 200 &&
      dryRun.metrics.unique_source_urls >= 200 &&
      dryRun.metrics.cities_covered >= 3 &&
      dryRun.metrics.phone_hits === 0 &&
      dryRun.metrics.whatsapp_hits === 0 &&
      dryRun.metrics.personal_email_hits === 0 &&
      dryRun.metrics.secret_hits === 0,
  };

  let writeResult: unknown = null;
  if (args.write) {
    if (!summary.production_write_authorized) {
      throw new Error("production_write_authorized=false after dry-run");
    }
    writeResult = await writeOpenSerpCandidatesToSupabase(dryRun.acceptedCandidates, {
      runId: args.runId,
      reportPath: reportRoot,
      maxNew: args.maxNew,
      maxUpdates: args.maxUpdates,
    });
  }

  await mkdir(runDir, { recursive: true });
  await writeFile(
    join(runDir, "summary.md"),
    [
      `# OpenSERP ingestion run ${args.runId}`,
      "",
      `- mode: ${args.write ? "write" : "dry_run"}`,
      `- provider: ${dryRun.provider?.provider_mode ?? "unknown"}`,
      `- queries_executed: ${dryRun.metrics.queries_executed}`,
      `- raw_results: ${dryRun.metrics.raw_results}`,
      `- zero_result_queries: ${dryRun.metrics.zero_result_queries}`,
      `- individual_candidates: ${dryRun.metrics.individual_candidates}`,
      `- unique_source_urls: ${dryRun.metrics.unique_source_urls}`,
      `- production_write_authorized: ${summary.production_write_authorized}`,
      ...(writeResult
        ? [
            "",
            "## Write result",
            "",
            `\`\`\`json`,
            JSON.stringify(writeResult, null, 2),
            `\`\`\``,
          ]
        : []),
      "",
    ].join("\n"),
    "utf8",
  );

  await writeFile(join(runDir, "summary.json"), JSON.stringify({ ...summary, write_result: writeResult }, null, 2), "utf8");
  console.log(JSON.stringify({ ...summary, write_result: writeResult }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
