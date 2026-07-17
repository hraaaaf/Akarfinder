#!/usr/bin/env tsx
// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — section 22.
// One wave per invocation (per the mission's "ne jamais lancer les 425
// requêtes en une seule rafale" + "Traitement par lots courts, avec pause et
// backoff" + "valider apres chaque vague avant la suivante" rules).
// Modes are mutually exclusive and one is mandatory -- no default, no silent
// dry-run fallback for --apply.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvFile } from "@/lib/openserp-ingestion/env";
import { selectNextBatch, type RotationQuery } from "@/lib/openserp-ingestion/query-rotation-planner";
import { runIngestionCycle } from "@/lib/openserp-ingestion/run-orchestrator";
import { isOpenSerpIngestionWriteAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";

type Wave = 1 | 2 | 3;
const WAVE_SIZES: Record<Wave, number> = { 1: 25, 2: 100, 3: 300 };

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseArgs(argv: string[]) {
  const args = {
    mode: null as "dry-run" | "plan" | "apply" | null,
    wave: null as Wave | null,
    runId: null as string | null,
    expectedPlanSha256: null as string | null,
    confirmed: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--plan") args.mode = "plan";
    else if (arg === "--apply") args.mode = "apply";
    else if (arg === "--wave" && argv[i + 1]) args.wave = Number(argv[++i]) as Wave;
    else if (arg === "--run-id" && argv[i + 1]) args.runId = argv[++i];
    else if (arg === "--expected-plan-sha256" && argv[i + 1]) args.expectedPlanSha256 = argv[++i];
    else if (arg === "--confirm-national-openserp-bootstrap") args.confirmed = true;
  }
  return args;
}

function computeWavePlan(wave: Wave, universePath: string) {
  const universe = JSON.parse(readFileSync(universePath, "utf8")) as { queries: RotationQuery[] };
  const nowIso = new Date().toISOString();
  const batch = selectNextBatch(universe.queries, WAVE_SIZES[wave], nowIso);
  const planBody = {
    wave,
    size: WAVE_SIZES[wave],
    query_ids: batch.map((q) => q.query_id).sort(),
  };
  const planSha256 = sha256(JSON.stringify(planBody));
  return { batch, planBody, planSha256 };
}

async function main() {
  loadEnvFile(join(process.cwd(), ".env.local"));
  loadEnvFile(join(process.cwd(), ".env.mission"));
  if (!process.env.OPENSERP_BINARY_PATH) {
    process.env.OPENSERP_BINARY_PATH = "C:\\Users\\lenovo\\go\\bin\\openserp.exe";
  }

  const args = parseArgs(process.argv.slice(2));
  if (!args.mode) {
    throw new Error("one of --dry-run / --plan / --apply is required");
  }
  if (!args.wave || ![1, 2, 3].includes(args.wave)) {
    throw new Error("--wave 1|2|3 is required");
  }
  if (!args.runId) {
    throw new Error("--run-id is required");
  }

  const universePath = join(process.cwd(), "data/openserp/query-universe-v1.json");
  const outDir = join(process.cwd(), "data/audits");
  mkdirSync(outDir, { recursive: true });

  if (args.mode === "plan") {
    const { planBody, planSha256 } = computeWavePlan(args.wave, universePath);
    const output = { ...planBody, run_id: args.runId, plan_sha256: planSha256, generated_at: new Date().toISOString() };
    writeFileSync(join(outDir, `openserp-bootstrap-wave-${args.wave}-plan.json`), JSON.stringify(output, null, 2), "utf8");
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (args.mode === "dry-run") {
    const { metrics } = await runIngestionCycle({
      runId: args.runId,
      scheduledAtIso: new Date().toISOString(),
      write: false,
    });
    const output = { wave: args.wave, mode: "dry_run", metrics };
    writeFileSync(join(outDir, `openserp-bootstrap-wave-${args.wave}-dry-run.json`), JSON.stringify(output, null, 2), "utf8");
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // --apply
  if (!args.confirmed) {
    throw new Error("--confirm-national-openserp-bootstrap is required for --apply");
  }
  if (!args.expectedPlanSha256) {
    throw new Error("--expected-plan-sha256 is required for --apply");
  }
  if (!isOpenSerpIngestionWriteAuthorized()) {
    throw new Error("refused: OPENSERP_AUTOMATED_INGESTION_ENABLED and OPENSERP_INGESTION_WRITE_ENABLED must both be true");
  }

  const { planBody, planSha256 } = computeWavePlan(args.wave, universePath);
  if (planSha256 !== args.expectedPlanSha256) {
    throw new Error(
      `plan hash mismatch: expected ${args.expectedPlanSha256}, computed ${planSha256} -- the query universe/rotation state has drifted since --plan was run. Re-run --plan and re-review before applying.`,
    );
  }

  const { metrics } = await runIngestionCycle({
    runId: args.runId,
    scheduledAtIso: new Date().toISOString(),
    write: true,
  });

  const output = { wave: args.wave, mode: "apply", plan: planBody, plan_sha256: planSha256, metrics };
  writeFileSync(join(outDir, `openserp-bootstrap-wave-${args.wave}.json`), JSON.stringify(output, null, 2), "utf8");
  console.log(JSON.stringify(output, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
