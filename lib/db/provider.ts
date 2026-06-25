export type DbProvider = "sqlite" | "supabase";

export function getDbProvider(): DbProvider {
  const raw = process.env.DATABASE_PROVIDER ?? "sqlite";
  return raw === "supabase" ? "supabase" : "sqlite";
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
