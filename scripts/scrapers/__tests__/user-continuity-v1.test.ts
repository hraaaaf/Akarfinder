import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseContinuityAction } from "../../../lib/user-continuity/service.js";

describe("#19H User Continuity V1", () => {
  it("defines the seven canonical user-owned continuity tables with RLS", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260722033000_user_continuity_v1.sql"), "utf8").toLowerCase();
    const tables = ["user_search_projects","user_favorites","user_saved_searches","user_search_history","user_comparisons","user_eliminated_properties","user_learned_preferences"];
    for (const table of tables) {
      assert.ok(sql.includes(`create table if not exists public.${table}`));
      assert.ok(sql.includes(`alter table public.${table} enable row level security`));
      assert.ok(sql.includes(`grant select, insert, update, delete on public.${table} to authenticated, service_role`));
      assert.ok(sql.includes(`${table}_select_own`));
      assert.ok(sql.includes(`${table}_insert_own`));
      assert.ok(sql.includes(`${table}_update_own`));
      assert.ok(sql.includes(`${table}_delete_own`));
    }
    assert.equal(sql.includes(" to anon"), false);
    assert.ok(sql.includes("(select auth.uid()) = user_id"));
    assert.ok(sql.includes("with check ((select auth.uid()) = user_id)"));
  });

  it("prevents cross-user project references with composite ownership foreign keys", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260722033000_user_continuity_v1.sql"), "utf8").toLowerCase();
    assert.ok(sql.includes("unique (id, user_id)"));
    const compositeFk = "foreign key (project_id, user_id) references public.user_search_projects(id, user_id)";
    assert.ok(sql.split(compositeFk).length - 1 >= 5);
  });

  it("keeps legacy contact alerts separate from authenticated saved searches", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260722033000_user_continuity_v1.sql"), "utf8").toLowerCase();
    assert.equal(sql.includes("alter table public.saved_alerts"), false);
    assert.ok(sql.includes("user_saved_searches"));
    assert.ok(sql.includes("alerts_enabled"));
  });

  it("rejects high-confidence behavioral inference while allowing explicit preference learning", () => {
    assert.equal(parseContinuityAction({ action: "learn_preference", preference_key: "calmness", preference_value: true, source: "behavioral_inference", confidence: "high" }), null);
    const explicit = parseContinuityAction({ action: "learn_preference", preference_key: "calmness", preference_value: true, source: "explicit", confidence: "high" });
    assert.equal(explicit?.action, "learn_preference");
  });

  it("requires valid internal/external favorite identity rather than fabricating ownership", () => {
    assert.equal(parseContinuityAction({ action: "add_favorite", result_key: "x", target_kind: "internal_listing" }), null);
    assert.equal(parseContinuityAction({ action: "add_favorite", result_key: "x", target_kind: "external_result" }), null);
    assert.equal(parseContinuityAction({ action: "add_favorite", result_key: "x", target_kind: "internal_listing", listing_id: 42 })?.action, "add_favorite");
    assert.equal(parseContinuityAction({ action: "add_favorite", result_key: "x", target_kind: "external_result", source_url: "https://example.com/listing" })?.action, "add_favorite");
  });

  it("tenant service always scopes database operations by authenticated user_id", () => {
    const service = readFileSync(join(process.cwd(), "lib/user-continuity/service.ts"), "utf8");
    const route = readFileSync(join(process.cwd(), "app/api/me/continuity/route.ts"), "utf8");
    assert.ok(service.includes('.eq("user_id", userId)'));
    assert.ok(service.includes("user_id: userId"));
    assert.ok(route.includes("authenticateConsumerRequest"));
    assert.equal(route.includes("body.user_id"), false);
  });

  it("consumer auth uses HttpOnly cookies and never exposes the service role to the browser", () => {
    const cookies = readFileSync(join(process.cwd(), "lib/auth/session-cookies.ts"), "utf8");
    const workspace = readFileSync(join(process.cwd(), "components/account/UserContinuityWorkspace.tsx"), "utf8");
    assert.ok(cookies.includes("httpOnly: true"));
    assert.ok(cookies.includes("secure: true"));
    assert.ok(cookies.includes("supabase.auth.getUser"));
    assert.equal(workspace.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.equal(workspace.includes("localStorage"), false);
  });

  it("exposes a real account workspace for projects and continuity artifacts", () => {
    const page = readFileSync(join(process.cwd(), "app/mon-projet/page.tsx"), "utf8");
    const workspace = readFileSync(join(process.cwd(), "components/account/UserContinuityWorkspace.tsx"), "utf8");
    assert.ok(page.includes("UserContinuityWorkspace"));
    assert.ok(workspace.includes("/api/auth/session"));
    assert.ok(workspace.includes("/api/me/continuity"));
    assert.ok(workspace.includes("Mes projets de recherche"));
  });
});
