import { getSupabaseServerClient } from "@/lib/db/supabase-client";

export type OwnedProjectRecord = {
  id: string;
  user_id: string;
  name: string;
  profile: unknown;
  companion_session?: unknown;
  status?: string | null;
  updated_at?: string | null;
};

export async function readOwnedProject(userId: string, projectId: string): Promise<OwnedProjectRecord | null> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("user_search_projects")
    .select("id,user_id,name,profile,companion_session,status,updated_at")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("PROJECT_READ_FAILED");
  return data as OwnedProjectRecord | null;
}
