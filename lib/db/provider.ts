export type DbProvider = "sqlite" | "supabase" | "neon";

function parseProvider(
  raw: string | undefined,
  options: { defaultValue?: DbProvider; variable: string }
): DbProvider | null {
  if (!raw) return options.defaultValue ?? null;
  if (raw === "supabase" || raw === "neon" || raw === "sqlite") return raw;
  throw new Error(
    `[db] unsupported ${options.variable}="${raw}" (expected neon, supabase, or sqlite)`
  );
}

export function getDbProvider(): DbProvider {
  return parseProvider(process.env.DATABASE_PROVIDER, {
    defaultValue: "sqlite",
    variable: "DATABASE_PROVIDER",
  }) as DbProvider;
}

export function getDbBackupProvider(): DbProvider | null {
  const parsed = parseProvider(process.env.DATABASE_BACKUP_PROVIDER, {
    variable: "DATABASE_BACKUP_PROVIDER",
  });
  if (!parsed || parsed === getDbProvider()) return null;
  return parsed;
}

export function getDbProviderChain(): DbProvider[] {
  const primary = getDbProvider();
  const backup = getDbBackupProvider();
  return backup ? [primary, backup] : [primary];
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isNeonConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
