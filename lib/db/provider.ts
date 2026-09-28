export type DbProvider = "sqlite" | "supabase" | "neon";

export function getDbProvider(): DbProvider {
  const raw = process.env.DATABASE_PROVIDER ?? "sqlite";
  if (raw === "supabase") return "supabase";
  if (raw === "neon") return "neon";
  return "sqlite";
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isNeonConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
