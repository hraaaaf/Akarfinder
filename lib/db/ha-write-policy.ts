import {
  getHaWriter,
  type HaWriter,
  type HaWriterState,
} from "./ha-writer-state.js";

const HA_WRITER_STATES = new Set<HaWriterState>([
  "SUPABASE_PRIMARY",
  "FAILOVER_PREP",
  "NEON_PRIMARY",
  "FAILBACK_SYNC",
  "FAILBACK_FREEZE",
]);

export type HaApplicationWriteTarget = Exclude<HaWriter, "none">;

export function getHaWriterState(
  env: NodeJS.ProcessEnv = process.env,
): HaWriterState {
  const raw = env.HA_WRITER_STATE?.trim();

  // Backward-compatible default before HA activation.
  if (!raw) return "SUPABASE_PRIMARY";

  if (!HA_WRITER_STATES.has(raw as HaWriterState)) {
    throw new Error(`Invalid HA_WRITER_STATE: ${raw}`);
  }

  return raw as HaWriterState;
}

export function assertHaApplicationWriteTarget(
  target: HaApplicationWriteTarget,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const state = getHaWriterState(env);
  const expected = getHaWriter(state);

  if (expected === "none") {
    throw new Error(`HA writes fenced in state ${state}`);
  }

  if (target !== expected) {
    throw new Error(
      `HA write target mismatch for ${state}: expected ${expected}, got ${target}`,
    );
  }
}

export function assertHaSupabaseWriteAllowed(
  env: NodeJS.ProcessEnv = process.env,
): void {
  assertHaApplicationWriteTarget("supabase", env);
}

export function assertHaNeonWriteAllowed(
  env: NodeJS.ProcessEnv = process.env,
): void {
  assertHaApplicationWriteTarget("neon", env);
}
