import { getSupabaseServerClient } from "@/lib/db/supabase-client";

export type ContinuityAction =
  | { action: "create_project"; name: string; profile?: unknown; companion_session?: unknown }
  | { action: "save_project"; project_id: string; name?: string; profile?: unknown; companion_session?: unknown; status?: "active" | "archived" }
  | { action: "add_favorite"; project_id?: string | null; result_key: string; target_kind: "internal_listing" | "external_result"; listing_id?: number | null; source_url?: string | null; snapshot?: unknown }
  | { action: "remove_favorite"; result_key: string }
  | { action: "save_search"; project_id?: string | null; name: string; query_state: unknown; alerts_enabled?: boolean; alert_frequency?: "immediate" | "daily" | "weekly" }
  | { action: "record_history"; project_id?: string | null; query_state: unknown; result_count?: number | null }
  | { action: "save_comparison"; project_id?: string | null; name?: string; entries: unknown[] }
  | { action: "eliminate_property"; project_id: string; result_key: string; reasons: unknown[] }
  | { action: "restore_property"; project_id: string; result_key: string }
  | { action: "learn_preference"; project_id?: string | null; preference_key: string; preference_value: unknown; source: "explicit" | "companion_derived" | "behavioral_inference"; confidence: "high" | "medium" | "low" };

function cleanText(value: unknown, max = 120): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned && cleaned.length <= max ? cleaned : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parseContinuityAction(body: unknown): ContinuityAction | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  switch (b.action) {
    case "create_project": {
      const name = cleanText(b.name);
      return name ? { action: "create_project", name, profile: b.profile, companion_session: b.companion_session } : null;
    }
    case "save_project": {
      if (!isUuid(b.project_id)) return null;
      const name = b.name == null ? undefined : cleanText(b.name) ?? undefined;
      if (b.name != null && !name) return null;
      const status = b.status === "active" || b.status === "archived" ? b.status : undefined;
      return { action: "save_project", project_id: b.project_id, name, profile: b.profile, companion_session: b.companion_session, status };
    }
    case "add_favorite": {
      const resultKey = cleanText(b.result_key, 500);
      const projectId = b.project_id == null ? null : isUuid(b.project_id) ? b.project_id : null;
      if (!resultKey || (b.project_id != null && !projectId)) return null;
      if (b.target_kind === "internal_listing") {
        const listingId = typeof b.listing_id === "number" && Number.isSafeInteger(b.listing_id) && b.listing_id > 0 ? b.listing_id : null;
        return listingId ? { action: "add_favorite", project_id: projectId, result_key: resultKey, target_kind: "internal_listing", listing_id: listingId, snapshot: b.snapshot } : null;
      }
      if (b.target_kind === "external_result") {
        const sourceUrl = typeof b.source_url === "string" && /^https?:\/\//i.test(b.source_url) ? b.source_url.slice(0, 2000) : null;
        return sourceUrl ? { action: "add_favorite", project_id: projectId, result_key: resultKey, target_kind: "external_result", source_url: sourceUrl, snapshot: b.snapshot } : null;
      }
      return null;
    }
    case "remove_favorite": {
      const resultKey = cleanText(b.result_key, 500);
      return resultKey ? { action: "remove_favorite", result_key: resultKey } : null;
    }
    case "save_search": {
      const name = cleanText(b.name);
      const projectId = b.project_id == null ? null : isUuid(b.project_id) ? b.project_id : null;
      if (!name || (b.project_id != null && !projectId)) return null;
      const frequency = b.alert_frequency === "immediate" || b.alert_frequency === "weekly" ? b.alert_frequency : "daily";
      return { action: "save_search", project_id: projectId, name, query_state: b.query_state ?? {}, alerts_enabled: b.alerts_enabled === true, alert_frequency: frequency };
    }
    case "record_history": {
      const projectId = b.project_id == null ? null : isUuid(b.project_id) ? b.project_id : null;
      if (b.project_id != null && !projectId) return null;
      const count = b.result_count == null ? null : typeof b.result_count === "number" && Number.isInteger(b.result_count) && b.result_count >= 0 ? b.result_count : null;
      if (b.result_count != null && count == null) return null;
      return { action: "record_history", project_id: projectId, query_state: b.query_state ?? {}, result_count: count };
    }
    case "save_comparison": {
      const projectId = b.project_id == null ? null : isUuid(b.project_id) ? b.project_id : null;
      if ((b.project_id != null && !projectId) || !Array.isArray(b.entries) || b.entries.length > 10) return null;
      return { action: "save_comparison", project_id: projectId, name: cleanText(b.name) ?? "Comparaison", entries: b.entries };
    }
    case "eliminate_property": {
      const resultKey = cleanText(b.result_key, 500);
      return isUuid(b.project_id) && resultKey && Array.isArray(b.reasons) ? { action: "eliminate_property", project_id: b.project_id, result_key: resultKey, reasons: b.reasons.slice(0, 20) } : null;
    }
    case "restore_property": {
      const resultKey = cleanText(b.result_key, 500);
      return isUuid(b.project_id) && resultKey ? { action: "restore_property", project_id: b.project_id, result_key: resultKey } : null;
    }
    case "learn_preference": {
      const key = cleanText(b.preference_key);
      const projectId = b.project_id == null ? null : isUuid(b.project_id) ? b.project_id : null;
      const source = b.source === "explicit" || b.source === "companion_derived" || b.source === "behavioral_inference" ? b.source : null;
      const confidence = b.confidence === "high" || b.confidence === "medium" || b.confidence === "low" ? b.confidence : null;
      if (!key || !source || !confidence || (b.project_id != null && !projectId)) return null;
      if (source === "behavioral_inference" && confidence === "high") return null;
      return { action: "learn_preference", project_id: projectId, preference_key: key, preference_value: b.preference_value ?? null, source, confidence };
    }
    default:
      return null;
  }
}

export async function readContinuityState(userId: string) {
  const db = getSupabaseServerClient();
  const specs = [
    ["projects", "user_search_projects", "updated_at"],
    ["favorites", "user_favorites", "created_at"],
    ["saved_searches", "user_saved_searches", "updated_at"],
    ["history", "user_search_history", "created_at"],
    ["comparisons", "user_comparisons", "updated_at"],
    ["eliminated", "user_eliminated_properties", "created_at"],
    ["preferences", "user_learned_preferences", "updated_at"],
  ] as const;
  const entries = await Promise.all(specs.map(async ([key, table, order]) => {
    const { data, error } = await db.from(table).select("*").eq("user_id", userId).order(order, { ascending: false }).limit(50);
    if (error) throw new Error(`CONTINUITY_READ_FAILED:${table}`);
    return [key, data ?? []] as const;
  }));
  return Object.fromEntries(entries);
}

async function ensureOwnedProject(userId: string, projectId: string | null | undefined) {
  if (!projectId) return true;
  const db = getSupabaseServerClient();
  const { data } = await db.from("user_search_projects").select("id").eq("id", projectId).eq("user_id", userId).maybeSingle();
  return !!data;
}

export async function executeContinuityAction(userId: string, action: ContinuityAction) {
  const db = getSupabaseServerClient();
  if ("project_id" in action && !(await ensureOwnedProject(userId, action.project_id))) throw new Error("PROJECT_NOT_OWNED");

  switch (action.action) {
    case "create_project": {
      const { data, error } = await db.from("user_search_projects").insert({ user_id: userId, name: action.name, profile: action.profile ?? {}, companion_session: action.companion_session ?? null }).select("*").single();
      if (error) throw new Error("PROJECT_CREATE_FAILED");
      return data;
    }
    case "save_project": {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (action.name !== undefined) patch.name = action.name;
      if (action.profile !== undefined) patch.profile = action.profile;
      if (action.companion_session !== undefined) patch.companion_session = action.companion_session;
      if (action.status !== undefined) patch.status = action.status;
      const { data, error } = await db.from("user_search_projects").update(patch).eq("id", action.project_id).eq("user_id", userId).select("*").single();
      if (error) throw new Error("PROJECT_SAVE_FAILED");
      return data;
    }
    case "add_favorite": {
      const row = { user_id: userId, project_id: action.project_id ?? null, result_key: action.result_key, target_kind: action.target_kind, listing_id: action.listing_id ?? null, source_url: action.source_url ?? null, snapshot: action.snapshot ?? {} };
      const { data, error } = await db.from("user_favorites").upsert(row, { onConflict: "user_id,result_key" }).select("*").single();
      if (error) throw new Error("FAVORITE_SAVE_FAILED");
      return data;
    }
    case "remove_favorite": {
      const { error } = await db.from("user_favorites").delete().eq("user_id", userId).eq("result_key", action.result_key);
      if (error) throw new Error("FAVORITE_REMOVE_FAILED");
      return { removed: true };
    }
    case "save_search": {
      const { data, error } = await db.from("user_saved_searches").insert({ user_id: userId, project_id: action.project_id ?? null, name: action.name, query_state: action.query_state, alerts_enabled: action.alerts_enabled ?? false, alert_frequency: action.alert_frequency ?? "daily" }).select("*").single();
      if (error) throw new Error("SAVED_SEARCH_FAILED");
      return data;
    }
    case "record_history": {
      const { data, error } = await db.from("user_search_history").insert({ user_id: userId, project_id: action.project_id ?? null, query_state: action.query_state, result_count: action.result_count ?? null }).select("*").single();
      if (error) throw new Error("HISTORY_SAVE_FAILED");
      return data;
    }
    case "save_comparison": {
      const { data, error } = await db.from("user_comparisons").insert({ user_id: userId, project_id: action.project_id ?? null, name: action.name ?? "Comparaison", entries: action.entries }).select("*").single();
      if (error) throw new Error("COMPARISON_SAVE_FAILED");
      return data;
    }
    case "eliminate_property": {
      const { data, error } = await db.from("user_eliminated_properties").upsert({ user_id: userId, project_id: action.project_id, result_key: action.result_key, reasons: action.reasons }, { onConflict: "user_id,project_id,result_key" }).select("*").single();
      if (error) throw new Error("ELIMINATION_SAVE_FAILED");
      return data;
    }
    case "restore_property": {
      const { error } = await db.from("user_eliminated_properties").delete().eq("user_id", userId).eq("project_id", action.project_id).eq("result_key", action.result_key);
      if (error) throw new Error("ELIMINATION_RESTORE_FAILED");
      return { restored: true };
    }
    case "learn_preference": {
      const row = { user_id: userId, project_id: action.project_id ?? null, preference_key: action.preference_key, preference_value: action.preference_value, source: action.source, confidence: action.confidence, updated_at: new Date().toISOString() };
      const { data, error } = await db.from("user_learned_preferences").upsert(row, { onConflict: "user_id,project_id,preference_key" }).select("*").single();
      if (error) throw new Error("PREFERENCE_SAVE_FAILED");
      return data;
    }
  }
}
