import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

import { readBearerToken } from "../../../lib/professional/auth.js";
import {
  commercialTierBadgeLabel,
  permissionsForRole,
  roleHasPermission,
} from "../../../lib/professional/permissions.js";
import {
  normalizeProfessionalSlug,
  parseAddProfessionalMemberInput,
  parseCreateProfessionalOrganizationInput,
} from "../../../lib/professional/validation.js";

function requestHeaders(authorization: string | null) {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return { headers } as Parameters<typeof readBearerToken>[0];
}

describe("#19B professional auth, ownership & profiles V1", () => {
  it("accepts Bearer auth only and never accepts a query-token substitute", () => {
    assert.equal(readBearerToken(requestHeaders("Bearer abc.def.ghi")), "abc.def.ghi");
    assert.equal(readBearerToken(requestHeaders("bearer token-123")), "token-123");
    assert.equal(readBearerToken(requestHeaders("Basic abc")), null);
    assert.equal(readBearerToken(requestHeaders(null)), null);
  });

  it("keeps commercial tier separate from ranking and permissions", () => {
    assert.equal(commercialTierBadgeLabel("premium"), "Partenaire Premium");
    assert.equal(commercialTierBadgeLabel("gold"), "Agence partenaire Gold");
    assert.equal(commercialTierBadgeLabel("none"), null);
    assert.equal(typeof commercialTierBadgeLabel("partner"), "string");

    const source = readFileSync(join(process.cwd(), "lib/professional/permissions.ts"), "utf8");
    assert.equal(/ranking[_ -]?(weight|boost|score)\s*[:=]/i.test(source), false);
  });

  it("enforces deterministic role permissions", () => {
    assert.equal(permissionsForRole("owner").length, 10);
    assert.equal(roleHasPermission("admin", "members.manage"), true);
    assert.equal(roleHasPermission("editor", "listings.manage"), true);
    assert.equal(roleHasPermission("editor", "members.manage"), false);
    assert.equal(roleHasPermission("lead_manager", "leads.manage"), true);
    assert.equal(roleHasPermission("lead_manager", "organization.manage"), false);
    assert.equal(roleHasPermission("viewer", "stats.read"), false);
  });

  it("validates organization and membership inputs without role inference", () => {
    const organization = parseCreateProfessionalOrganizationInput({
      organization_type: "agency",
      slug: "agence-rabat-centre",
      legal_name: "Agence Rabat Centre SARL",
      display_name: "Agence Rabat Centre",
      city: "Rabat",
    });
    assert.equal(organization.ok, true);
    assert.equal(normalizeProfessionalSlug(" Agence-Rabat-Centre "), "agence-rabat-centre");
    assert.equal(normalizeProfessionalSlug("../admin"), null);

    assert.deepEqual(
      parseAddProfessionalMemberInput({
        user_id: "11111111-1111-4111-8111-111111111111",
        role: "lead_manager",
      }),
      { user_id: "11111111-1111-4111-8111-111111111111", role: "lead_manager" },
    );
    assert.equal(
      parseAddProfessionalMemberInput({
        user_id: "11111111-1111-4111-8111-111111111111",
        role: "superadmin",
      }),
      null,
    );
  });

  it("migration enables RLS and explicit tenant-scoped lead routing", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260721231500_professional_auth_ownership_profiles_v1.sql"),
      "utf8",
    ).toLowerCase();

    for (const table of [
      "professional_organizations",
      "professional_memberships",
      "professional_listing_ownership",
      "professional_projects",
      "professional_lead_assignments",
    ]) {
      assert.ok(sql.includes(`alter table public.${table} enable row level security`), `${table} must have RLS`);
    }

    assert.ok(sql.includes("professional_lead_assignments"));
    assert.ok(sql.includes("organization_id"));
    assert.ok(sql.includes("user_id = (select auth.uid())"));
    assert.equal(sql.includes("commercial_tier = 'premium' then"), false);
  });

  it("new professional APIs do not use the legacy shared LEADS_ADMIN_TOKEN", () => {
    const files = [
      "app/api/pro/me/route.ts",
      "app/api/pro/organizations/route.ts",
      "app/api/pro/organizations/[organizationId]/members/route.ts",
      "app/api/pro/organizations/[organizationId]/ownership/listings/route.ts",
      "app/api/pro/organizations/[organizationId]/stats/route.ts",
      "app/api/pro/organizations/[organizationId]/leads/route.ts",
      "app/api/pro/organizations/[organizationId]/leads/[leadId]/route.ts",
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      assert.equal(source.includes("LEADS_ADMIN_TOKEN"), false, `${file} leaked legacy token auth`);
      assert.equal(source.includes("authenticateProfessionalRequest"), true, `${file} must use professional auth`);
    }
  });
});
