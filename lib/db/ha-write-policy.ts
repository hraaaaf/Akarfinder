import {
  getHaWriter,
  type HaWriter,
  type HaWriterState,
} from "./ha-writer-state";

const HA_WRITER_STATES = new Set<HaWriterState>([
  "SUPABASE_PRIMARY",
  "FAILOVER_PREP",
  "NEON_PRIMARY",
  "FAILBACK_SYNC",
  "FAILBACK_FREEZE",
]);

export type HaApplicationWriteTarget = Exclude<HaWriter, "none">;
export type HaApplicationReadProvider = "sqlite" | "supabase" | "neon";

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


export function assertHaReadProviderCoherent(
  provider: HaApplicationReadProvider,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const raw = env.HA_WRITER_STATE?.trim();

  // HA is opt-in. Preserve the legacy/provider-migration read modes until an
  // operator explicitly activates the HA state machine.
  if (!raw) return;

  const state = getHaWriterState(env);

  if (state === "SUPABASE_PRIMARY" && provider !== "supabase") {
    throw new Error(
      `HA read provider mismatch for ${state}: expected supabase, got ${provider}`,
    );
  }

  if (
    (state === "NEON_PRIMARY" ||
      state === "FAILBACK_SYNC" ||
      state === "FAILBACK_FREEZE") &&
    provider !== "neon"
  ) {
    throw new Error(
      `HA read provider mismatch for ${state}: expected neon, got ${provider}`,
    );
  }

  // FAILOVER_PREP intentionally permits either provider while writes are
  // fenced and the operator establishes the incident read path.
}
