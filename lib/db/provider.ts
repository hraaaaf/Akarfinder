import { assertHaReadProviderCoherent } from "./ha-write-policy";

export type DbProvider = "sqlite" | "supabase" | "neon";

export function getDbProvider(env: NodeJS.ProcessEnv = process.env): DbProvider {
  const raw = env.DATABASE_PROVIDER ?? "sqlite";
  const provider: DbProvider =
    raw === "supabase" ? "supabase" : raw === "neon" ? "neon" : "sqlite";
  assertHaReadProviderCoherent(provider, env);
  return provider;
}

export function isSupabaseConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isNeonConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return !!env.NEON_DATABASE_URL;
}
