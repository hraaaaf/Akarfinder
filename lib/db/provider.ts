export type DbProvider = "sqlite" | "supabase" | "neon";

function parseProvider(raw: string | undefined, fallback: DbProvider): DbProvider {
  if (raw === "supabase") return "supabase";
  if (raw === "neon") return "neon";
  if (raw === "sqlite") return "sqlite";
  return fallback;
}

export function getDbProvider(): DbProvider {
  return parseProvider(process.env.DATABASE_PROVIDER, "sqlite");
}

export function getDbBackupProvider(): DbProvider | null {
  const raw = process.env.DATABASE_BACKUP_PROVIDER;
  if (!raw) return null;
  const parsed = parseProvider(raw, "sqlite");
  return parsed === getDbProvider() ? null : parsed;
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
