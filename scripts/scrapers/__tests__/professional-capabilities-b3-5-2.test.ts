import assert from "node:assert/strict";
import test from "node:test";
import { ALL_PROFESSIONAL_CAPABILITIES, can, capabilitiesForRole, decideCapability, permissionsForRole } from "../../../lib/professional/permissions";
import type { ProfessionalMembershipContext, ProfessionalMembershipRole } from "../../../lib/professional/types";

function context(role: ProfessionalMembershipRole, options: { workspace?: "onboarding" | "active" | "suspended" | "rejected"; membership?: "active" | "invited" | "suspended"; activation?: "pending" | "onboarding" | "review" | "active" | "paused" | "rejected"; rights?: "none" | "pending" | "confirmed" | "revoked" } = {}): ProfessionalMembershipContext {
  const workspace = options.workspace ?? "active";
  return {
    organization: {
      id: "00000000-0000-4000-8000-000000000001", organization_type: "agency", slug: "alpha", legal_name: "Alpha", display_name: "Alpha",
      description: null, logo_url: null, website_url: null, city: null, public_email: null, public_phone: null,
      validation_status: workspace === "active" ? "validated" : workspace === "onboarding" ? "pending" : workspace,
      commercial_tier: "none", public_visibility: "draft", created_by: "00000000-0000-4000-8000-000000000002",
      created_at: "2026-08-06T00:00:00Z", updated_at: "2026-08-06T00:00:00Z",
      activation_status: options.activation ?? "active", source_authorization_status: options.rights ?? "confirmed",
    },
    membership: { id: "m", organization_id: "00000000-0000-4000-8000-000000000001", user_id: "u", role, status: options.membership ?? "active", created_at: "2026-08-06T00:00:00Z", updated_at: "2026-08-06T00:00:00Z" },
    permissions: permissionsForRole(role), capabilities: capabilitiesForRole(role), workspace_status: workspace, has_active_owner: true,
  };
}

test("owner and admin receive every canonical capability", () => {
  assert.deepEqual(capabilitiesForRole("owner"), [...ALL_PROFESSIONAL_CAPABILITIES]);
  assert.deepEqual(capabilitiesForRole("admin"), [...ALL_PROFESSIONAL_CAPABILITIES]);
});

test("six roles follow the approved matrix", () => {
  assert.equal(can(context("editor"), "catalogue.write"), true);
  assert.equal(can(context("editor"), "feed.review"), true);
  assert.equal(can(context("editor"), "feed.publish"), false);
  assert.equal(can(context("analyst"), "analytics.read"), true);
  assert.equal(can(context("analyst"), "catalogue.write"), false);
  assert.equal(can(context("lead_manager"), "leads.manage"), true);
  assert.equal(can(context("lead_manager"), "feed.read"), false);
  assert.equal(can(context("viewer"), "catalogue.read"), true);
  assert.equal(can(context("viewer"), "catalogue.write"), false);
});

test("inactive memberships and unavailable workspaces fail closed", () => {
  assert.equal(decideCapability(context("owner", { membership: "suspended" }), "organization.read").reason, "membership_inactive");
  assert.equal(decideCapability(context("owner", { workspace: "suspended" }), "organization.read").reason, "workspace_unavailable");
});

test("onboarding may prepare drafts but cannot submit or publish", () => {
  assert.equal(can(context("editor", { workspace: "onboarding" }), "catalogue.write"), true);
  assert.equal(can(context("editor", { workspace: "onboarding" }), "projects.write"), true);
  assert.equal(can(context("editor", { workspace: "onboarding" }), "catalogue.submit"), false);
  assert.equal(can(context("owner", { workspace: "onboarding" }), "feed.publish"), false);
});

test("publication capabilities require validation activation and source rights", () => {
  assert.equal(can(context("owner"), "feed.publish"), true);
  assert.equal(decideCapability(context("owner", { activation: "paused" }), "feed.publish").reason, "activation_inactive");
  assert.equal(decideCapability(context("owner", { rights: "pending" }), "feed.publish").reason, "source_rights_unconfirmed");
});

test("legacy permissions are derived aliases rather than a second matrix", () => {
  assert.equal(permissionsForRole("editor").includes("listings.manage"), true);
  assert.equal(permissionsForRole("viewer").includes("listings.manage"), false);
  assert.equal(permissionsForRole("admin").includes("members.manage"), true);
});
