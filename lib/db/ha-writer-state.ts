export type HaWriterState =
  | "SUPABASE_PRIMARY"
  | "FAILOVER_PREP"
  | "NEON_PRIMARY"
  | "FAILBACK_SYNC"
  | "FAILBACK_FREEZE";

export type HaWriter = "supabase" | "neon" | "none";

const WRITER_BY_STATE: Record<HaWriterState, HaWriter> = {
  SUPABASE_PRIMARY: "supabase",
  FAILOVER_PREP: "none",
  NEON_PRIMARY: "neon",
  FAILBACK_SYNC: "neon",
  FAILBACK_FREEZE: "none",
};

const ALLOWED_TRANSITIONS: Record<HaWriterState, readonly HaWriterState[]> = {
  SUPABASE_PRIMARY: ["FAILOVER_PREP"],
  FAILOVER_PREP: ["SUPABASE_PRIMARY", "NEON_PRIMARY"],
  NEON_PRIMARY: ["FAILBACK_SYNC"],
  FAILBACK_SYNC: ["NEON_PRIMARY", "FAILBACK_FREEZE"],
  FAILBACK_FREEZE: ["NEON_PRIMARY", "SUPABASE_PRIMARY"],
};

export function getHaWriter(state: HaWriterState): HaWriter {
  return WRITER_BY_STATE[state];
}

export function canTransitionHaWriter(
  from: HaWriterState,
  to: HaWriterState,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertHaWriterTransition(
  from: HaWriterState,
  to: HaWriterState,
): void {
  if (!canTransitionHaWriter(from, to)) {
    throw new Error(`Unsafe HA writer transition: ${from} -> ${to}`);
  }
}

export function assertSingleWriter(params: {
  state: HaWriterState;
  supabaseWritesEnabled: boolean;
  neonWritesEnabled: boolean;
}): void {
  const { state, supabaseWritesEnabled, neonWritesEnabled } = params;

  if (supabaseWritesEnabled && neonWritesEnabled) {
    throw new Error("Split-brain guard: Supabase and Neon writes cannot both be enabled");
  }

  const expected = getHaWriter(state);
  const actual: HaWriter = supabaseWritesEnabled
    ? "supabase"
    : neonWritesEnabled
      ? "neon"
      : "none";

  if (actual !== expected) {
    throw new Error(
      `HA writer mismatch for ${state}: expected ${expected}, got ${actual}`,
    );
  }
}
