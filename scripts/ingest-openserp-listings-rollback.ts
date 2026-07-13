#!/usr/bin/env tsx
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { rollbackOpenSerpRun } from "@/lib/openserp-ingestion/pipeline";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=\s]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim();
  }
}

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
