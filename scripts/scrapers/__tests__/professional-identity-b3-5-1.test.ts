import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isWorkspaceAccessibleContext,
  resolveActiveProfessionalContext,
  workspaceStatusFromValidation,
} from "../../../lib/professional/identity";
import type { ProfessionalMembershipContext } from "../../../lib/professional/types";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260806090000_b3_5_1_professional_identity.sql",
);

function context(
  id: string,
  name: string,
  validation: "pending" | "validated" | "suspended" | "rejected",
  overrides: Partial<ProfessionalMembershipContext> = {},
): ProfessionalMembershipContext {
  return {
    organization: {
      id,
      organization_type: "agency",
      slug: name.toLowerCase(),
      legal_name: name,
      display_name: name,
      description: null,
      logo_url: null,
      website_url: null,
      city: null,
      public_email: null,
      public_phone: null,
      validation_status: validation,
      commercial_tier: "none",
      public_visibility: "draft",
      created_by: "00000000-0000-4000-8000-000000000001",
      created_at: "2026-08-06T00:00:00.000Z",
      updated_at: "2026-08-06T00:00:00.000Z",
    },
    membership: {
      id: `membership-${id}`,
      organization_id: id,
      user_id: "00000000-0000-4000-8000-000000000002",
      role: "owner",
      status: "active",
      created_at: "2026-08-06T00:00:00.000Z",
      updated_at: "2026-08-06T00:00:00.000Z",
    },
    permissions: [],
    workspace_status: workspaceStatusFromValidation(validation),
    has_active_owner: true,
    ...overrides,
  };
}

test("validation statuses map to explicit workspace states", () => {
  assert.equal(workspaceStatusFromValidation("pending"), "onboarding");
  assert.equal(workspaceStatusFromValidation("validated"), "active");
  assert.equal(workspaceStatusFromValidation("suspended"), "suspended");
  assert.equal(workspaceStatusFromValidation("rejected"), "rejected");
});

test("workspace access requires active membership and an active owner", () => {
  assert.equal(isWorkspaceAccessibleContext(context("a", "Alpha", "validated")), true);
  assert.equal(isWorkspaceAccessibleContext(context("b", "Beta", "pending")), true);
  assert.equal(isWorkspaceAccessibleContext(context("c", "Gamma", "suspended")), false);
  assert.equal(isWorkspaceAccessibleContext(context("d", "Delta", "rejected")), false);
  assert.equal(
    isWorkspaceAccessibleContext(context("e", "Epsilon", "validated", {
      membership: { ...context("e", "Epsilon", "validated").membership, status: "suspended" },
    })),
    false,
  );
  assert.equal(
    isWorkspaceAccessibleContext(context("f", "Zeta", "validated", { has_active_owner: false as true })),
    false,
  );
});

test("preferred organization wins only when it is accessible", () => {
  const alpha = context("a", "Alpha", "validated");
  const beta = context("b", "Beta", "pending");
  const suspended = context("c", "Suspended", "suspended");

  const preferred = resolveActiveProfessionalContext([alpha, beta, suspended], "b");
  assert.equal(preferred.active_context?.organization.id, "b");
  assert.equal(preferred.selection_source, "preferred");

  const rejectedPreference = resolveActiveProfessionalContext([alpha, beta, suspended], "c");
  assert.equal(rejectedPreference.active_context?.organization.id, "a");
  assert.equal(rejectedPreference.selection_source, "default");
});

test("default selection is deterministic and prioritizes validated organizations", () => {
  const result = resolveActiveProfessionalContext([
    context("z", "Zulu", "pending"),
    context("b", "Beta", "validated"),
    context("a", "Alpha", "validated"),
  ]);

  assert.equal(result.active_context?.organization.id, "a");
  assert.deepEqual(
    result.available_contexts.map((item) => item.organization.id),
    ["a", "b", "z"],
  );
});

test("identity migration keeps conversion atomic and service-role only", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");
  assert.match(sql, /create or replace function public\.convert_professional_activation_request/i);
  assert.match(sql, /for update;/i);
  assert.match(sql, /status not in \('qualified', 'onboarding'\)/i);
  assert.match(sql, /insert into public\.professional_organizations/i);
  assert.match(sql, /insert into public\.professional_memberships/i);
  assert.match(sql, /status = 'converted'/i);
  assert.match(sql, /grant execute[\s\S]*to service_role;/i);
  assert.match(sql, /revoke all[\s\S]*from public, anon, authenticated;/i);
});

test("identity migration protects validated organizations from losing their last owner", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");
  assert.match(sql, /professional_organization_has_active_owner/i);
  assert.match(sql, /PROFESSIONAL_ORGANIZATION_ACTIVE_OWNER_REQUIRED/i);
  assert.match(sql, /create constraint trigger professional_organization_active_owner_guard/i);
  assert.match(sql, /create constraint trigger professional_membership_active_owner_guard/i);
  assert.match(sql, /deferrable initially deferred/i);
});
