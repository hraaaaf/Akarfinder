import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  commercialTierBadgeLabel,
  permissionsForRole,
  roleHasPermission,
} from "../../../lib/professional/permissions";
import {
  parseAddProfessionalMemberInput,
  parseCreateProfessionalOrganizationInput,
  parseUpdateProfessionalProfileInput,
} from "../../../lib/professional/validation";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("#19B professional auth, ownership & profiles V1", () => {
  it("accepts Authorization bearer only and never accepts a query-token substitute", () => {
    const source = read("lib/professional/auth.ts");
    assert.match(source, /authorization/i);
    assert.match(source, /bearer/i);
    assert.doesNotMatch(source, /searchParams\.get\(["']token["']\)/i);
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
    // B3.5.2 canonical matrix grants every active workspace role read-only analytics access.
    assert.equal(roleHasPermission("viewer", "stats.read"), true);
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
    if (organization.ok) {
      assert.equal(organization.value.organization_type, "agency");
    }
    assert.equal(
      parseCreateProfessionalOrganizationInput({ organization_type: "unknown" }).ok,
      false,
    );

    const member = parseAddProfessionalMemberInput({
      user_id: "00000000-0000-4000-8000-000000000001",
      role: "editor",
    });
    assert.deepEqual(member, {
      user_id: "00000000-0000-4000-8000-000000000001",
      role: "editor",
    });
    assert.equal(
      parseAddProfessionalMemberInput({
        user_id: "00000000-0000-4000-8000-000000000001",
        role: "superadmin",
      }),
      null,
    );
  });

  it("allows branding edits but forbids self-validation and self-upgrading commercial tier", () => {
    const update = parseUpdateProfessionalProfileInput({
      display_name: "Agence Atlas",
      description: "Portefeuille résidentiel",
      logo_url: "https://cdn.example.com/logo.png",
      website_url: "https://example.com",
    });

    assert.deepEqual(update, {
      display_name: "Agence Atlas",
      description: "Portefeuille résidentiel",
      logo_url: "https://cdn.example.com/logo.png",
      website_url: "https://example.com/",
    });

    assert.equal(
      parseUpdateProfessionalProfileInput({
        display_name: "Agence Atlas",
        commercial_tier: "premium",
      }),
      null,
    );
    assert.equal(
      parseUpdateProfessionalProfileInput({
        display_name: "Agence Atlas",
        validation_status: "validated",
      }),
      null,
    );
  });

  it("migration enables RLS, explicit tenant-scoped lead routing, and removes permissive legacy lead policy", () => {
    const migration = read("supabase/migrations/20260721231500_professional_auth_ownership_profiles_v1.sql");
    assert.match(migration, /enable row level security/i);
    assert.match(migration, /professional_lead_assignments/i);
    assert.match(migration, /organization_id/i);
    assert.match(migration, /drop policy if exists/i);
  });

  it("new professional APIs do not use the legacy shared LEADS_ADMIN_TOKEN", () => {
    const files = [
      "app/api/pro/me/route.ts",
      "app/api/pro/organizations/route.ts",
      "app/api/pro/organizations/[organizationId]/route.ts",
      "app/api/pro/organizations/[organizationId]/members/route.ts",
      "app/api/pro/organizations/[organizationId]/submissions/route.ts",
      "app/api/pro/organizations/[organizationId]/leads/route.ts",
    ];

    for (const file of files) {
      assert.doesNotMatch(read(file), /LEADS_ADMIN_TOKEN/);
    }
  });
});
