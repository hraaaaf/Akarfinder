#!/usr/bin/env tsx
import { join, resolve } from "node:path";
import { rollbackOpenSerpRun } from "@/lib/openserp-ingestion/pipeline";
import { loadEnvFile } from "@/lib/openserp-ingestion/env";

function parseArgs(argv: string[]) {
  let runId: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--run-id" && argv[i + 1]) {
      runId = argv[++i];
    }
  }
  return { runId };
}

async function main() {
  loadEnvFile(join(process.cwd(), ".env.local"));
  loadEnvFile(join(process.cwd(), ".env.mission"));

  const args = parseArgs(process.argv.slice(2));
  if (!args.runId) {
    throw new Error("Usage: npm run ingest:openserp:listings:rollback -- --run-id=<RUN_ID>");
  }

  const manifestPath = resolve(process.cwd(), "data/ingestion-runs", args.runId, "rollback-manifest.json");
  await rollbackOpenSerpRun(manifestPath);
  console.log(JSON.stringify({ ok: true, rollback_manifest: manifestPath }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
