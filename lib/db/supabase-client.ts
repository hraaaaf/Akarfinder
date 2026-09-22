// Server-only: never import this file in client components or pages.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;
let authClient: SupabaseClient | null = null;

function supabaseUrl(): string {
  const value = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  if (!value) throw new Error("[supabase] Missing SUPABASE_URL");
  return value;
}

function serviceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value) throw new Error("[supabase] Missing SUPABASE_SERVICE_ROLE_KEY");
  return value;
}

function anonKey(): string {
  const value = (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  if (!value) throw new Error("[supabase] Missing SUPABASE_ANON_KEY");
  return value;
}

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

/** Privileged client reserved for explicit staff/admin operations. It bypasses RLS. */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(supabaseUrl(), serviceRoleKey(), { auth: authOptions });
  }
  return adminClient;
}

/** Unprivileged client used to validate Supabase access tokens. */
export function getSupabaseAuthClient(): SupabaseClient {
  if (!authClient) {
    authClient = createClient(supabaseUrl(), anonKey(), { auth: authOptions });
  }
  return authClient;
}

/** Per-request client forwarding the user's JWT so PostgreSQL RLS is exercised. */
export function getSupabaseUserClient(accessToken: string): SupabaseClient {
  const token = accessToken.trim();
  if (!token) throw new Error("[supabase] Missing user access token");

  return createClient(supabaseUrl(), anonKey(), {
    auth: authOptions,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** @deprecated Use getSupabaseAdminClient() and keep privileged access explicit. */
export function getSupabaseServerClient(): SupabaseClient {
  return getSupabaseAdminClient();
}
