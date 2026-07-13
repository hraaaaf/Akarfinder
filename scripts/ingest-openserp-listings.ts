#!/usr/bin/env tsx
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import {
  executeOpenSerpDryRun,
  loadLockedFirstWriteManifest,
  runPostWriteIdempotenceCheck,
  writeOpenSerpCandidatesToSupabase,
} from "@/lib/openserp-ingestion/pipeline";
import { loadEnvFile } from "@/lib/openserp-ingestion/env";

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
    manifestPath: undefined as string | undefined,
    maxSources: 1000,
    batchSize: 25,
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
    } else if (arg === "--manifest" && argv[i + 1]) {
      args.manifestPath = argv[++i];
    } else if (arg === "--max-sources" && argv[i + 1]) {
      args.maxSources = Number(argv[++i]);
    } else if (arg === "--batch-size" && argv[i + 1]) {
      args.batchSize = Number(argv[++i]);
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
  const runDir = join(reportRoot, args.runId);

  let dryRun:
    | Awaited<ReturnType<typeof executeOpenSerpDryRun>>
    | null = null;
  let selectedCandidates = null;
  let lockedManifest:
    | Awaited<ReturnType<typeof loadLockedFirstWriteManifest>>
    | null = null;
  let summary: Record<string, unknown>;

  if (args.manifestPath) {
    lockedManifest = await loadLockedFirstWriteManifest(resolve(process.cwd(), args.manifestPath));
    if (lockedManifest.first_write_run_id !== args.runId) {
      throw new Error(`run_id mismatch: expected ${lockedManifest.first_write_run_id}, got ${args.runId}`);
    }
    selectedCandidates = lockedManifest.selectedCandidates;
    summary = {
      run_id: args.runId,
      mode: args.write ? "write" : "dry_run",
      provider: {
        provider: "openserp",
        provider_mode: "local_cli",
        provider_endpoint: "locked-manifest",
        provider_live_or_fixture: "live",
      },
      metrics: {
        queries_planned: lockedManifest.candidate_count,
        queries_executed: lockedManifest.selected_count,
      },
      source_run_id: lockedManifest.source_run_id,
      manifest_sha256: lockedManifest.manifest_sha256,
      candidate_file_sha256: lockedManifest.candidate_file_sha256,
      production_write_authorized: true,
    };
  } else {
    dryRun = await executeOpenSerpDryRun(matrixPath, {
      runId: args.runId,
      reportPath: reportRoot,
      queryLimit: args.queryLimit,
      city: args.city,
      env: process.env,
    });

    summary = {
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
  }

  let writeResult: unknown = null;
  if (args.write) {
    if (summary.production_write_authorized !== true) {
      throw new Error("production_write_authorized=false after dry-run");
    }
    const candidates = selectedCandidates ?? dryRun?.acceptedCandidates;
    if (!candidates) {
      throw new Error("no candidates available for write");
    }
    writeResult = await writeOpenSerpCandidatesToSupabase(candidates, {
      runId: args.runId,
      reportPath: reportRoot,
      maxNew: args.maxNew,
      maxUpdates: args.maxUpdates,
      maxSources: args.maxSources,
      batchSize: args.batchSize,
      manifestSha256: lockedManifest?.manifest_sha256,
      sourceRunId: lockedManifest?.source_run_id,
      selectedCandidateIds: lockedManifest?.selected_candidate_ids,
      excludedCandidates: lockedManifest
        ? Object.entries(lockedManifest.exclusion_reasons).map(([candidate_id, reason]) => ({
            candidate_id,
            reason,
          }))
        : undefined,
    });
    const postWriteIdempotence = await runPostWriteIdempotenceCheck(candidates);
    await writeFile(
      join(runDir, "post-write-idempotence.json"),
      JSON.stringify(postWriteIdempotence, null, 2),
      "utf8",
    );
    writeResult = {
      ...((writeResult as Record<string, unknown>) ?? {}),
      post_write_idempotence: postWriteIdempotence,
    };
  } else if (selectedCandidates) {
    await mkdir(runDir, { recursive: true });
    await writeFile(
      join(runDir, "summary.json"),
      JSON.stringify(
        {
          ...summary,
          selected_candidates: selectedCandidates.length,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(
      JSON.stringify(
        {
          ...summary,
          selected_candidates: selectedCandidates.length,
        },
        null,
        2,
      ),
    );
    return;
  } else if (!dryRun) {
    throw new Error("no dry-run and no locked manifest");
  }

  const providerMode =
    (dryRun?.provider?.provider_mode as string | undefined) ??
    ((summary.provider as { provider_mode?: string } | undefined)?.provider_mode ?? "locked-manifest");
  const metrics = (summary.metrics as Record<string, unknown> | undefined) ?? {};

  await mkdir(runDir, { recursive: true });
  await writeFile(
    join(runDir, "summary.md"),
    [
      `# OpenSERP ingestion run ${args.runId}`,
      "",
      `- mode: ${args.write ? "write" : "dry_run"}`,
      `- provider: ${providerMode}`,
      `- queries_executed: ${metrics.queries_executed ?? "n/a"}`,
      `- raw_results: ${metrics.raw_results ?? "n/a"}`,
      `- zero_result_queries: ${metrics.zero_result_queries ?? "n/a"}`,
      `- individual_candidates: ${metrics.individual_candidates ?? selectedCandidates?.length ?? "n/a"}`,
      `- unique_source_urls: ${metrics.unique_source_urls ?? selectedCandidates?.length ?? "n/a"}`,
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

void main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
