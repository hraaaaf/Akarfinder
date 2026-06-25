// P11D-D — Lead CRM helper tests
// Tests: validateLeadAdminToken, validateLeadStatusUpdate, validateVisitStatusUpdate,
//        normalizeInternalNotes, normalizeFollowUpDate, mapLeadStatusLabel, mapVisitStatusLabel

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_LEAD_STATUSES,
  ALLOWED_VISIT_STATUSES,
  validateLeadStatusUpdate,
  validateVisitStatusUpdate,
  normalizeInternalNotes,
  normalizeFollowUpDate,
  mapLeadStatusLabel,
  mapVisitStatusLabel,
  validateLeadAdminToken,
} from "../../../lib/leads/lead-admin";

// ── validateLeadAdminToken ────────────────────────────────────────────────────

describe("validateLeadAdminToken", () => {
  let originalToken: string | undefined;

  before(() => {
    originalToken = process.env.LEADS_ADMIN_TOKEN;
  });

  after(() => {
    if (originalToken !== undefined) {
      process.env.LEADS_ADMIN_TOKEN = originalToken;
    } else {
      delete process.env.LEADS_ADMIN_TOKEN;
    }
  });

  it("returns false when env var is not set", () => {
    delete process.env.LEADS_ADMIN_TOKEN;
    assert.equal(validateLeadAdminToken("sometoken"), false);
  });

  it("returns false when env var is too short", () => {
    process.env.LEADS_ADMIN_TOKEN = "short";
    assert.equal(validateLeadAdminToken("short"), false);
  });

  it("returns false when token is null", () => {
    process.env.LEADS_ADMIN_TOKEN = "validtoken12345";
    assert.equal(validateLeadAdminToken(null), false);
  });

  it("returns false when token is undefined", () => {
    process.env.LEADS_ADMIN_TOKEN = "validtoken12345";
    assert.equal(validateLeadAdminToken(undefined), false);
  });

  it("returns false when token does not match", () => {
    process.env.LEADS_ADMIN_TOKEN = "validtoken12345";
    assert.equal(validateLeadAdminToken("wrongtoken"), false);
  });

  it("returns true when token matches env var", () => {
    process.env.LEADS_ADMIN_TOKEN = "validtoken12345";
    assert.equal(validateLeadAdminToken("validtoken12345"), true);
  });
});

// ── validateLeadStatusUpdate ──────────────────────────────────────────────────

describe("validateLeadStatusUpdate", () => {
  it("returns null for undefined", () => {
    assert.equal(validateLeadStatusUpdate(undefined), null);
  });

  it("returns null for non-string", () => {
    assert.equal(validateLeadStatusUpdate(42), null);
    assert.equal(validateLeadStatusUpdate(true), null);
    assert.equal(validateLeadStatusUpdate({}), null);
  });

  it("returns null for unknown status", () => {
    assert.equal(validateLeadStatusUpdate("unknown"), null);
    assert.equal(validateLeadStatusUpdate("active"), null);
    assert.equal(validateLeadStatusUpdate(""), null);
  });

  it("accepts all ALLOWED_LEAD_STATUSES", () => {
    for (const status of ALLOWED_LEAD_STATUSES) {
      assert.equal(validateLeadStatusUpdate(status), status, `Expected ${status} to be valid`);
    }
  });

  it("normalizes whitespace", () => {
    assert.equal(validateLeadStatusUpdate("  new  "), "new");
    assert.equal(validateLeadStatusUpdate("  archived  "), "archived");
  });
});

// ── validateVisitStatusUpdate ─────────────────────────────────────────────────

describe("validateVisitStatusUpdate", () => {
  it("returns null for undefined", () => {
    assert.equal(validateVisitStatusUpdate(undefined), null);
  });

  it("returns null for non-string", () => {
    assert.equal(validateVisitStatusUpdate(null), null);
    assert.equal(validateVisitStatusUpdate(0), null);
  });

  it("returns null for unknown status", () => {
    assert.equal(validateVisitStatusUpdate("done"), null);
    assert.equal(validateVisitStatusUpdate("approved"), null);
    assert.equal(validateVisitStatusUpdate(""), null);
  });

  it("accepts all ALLOWED_VISIT_STATUSES", () => {
    for (const status of ALLOWED_VISIT_STATUSES) {
      assert.equal(validateVisitStatusUpdate(status), status, `Expected ${status} to be valid`);
    }
  });

  it("normalizes whitespace", () => {
    assert.equal(validateVisitStatusUpdate("  pending  "), "pending");
    assert.equal(validateVisitStatusUpdate("  confirmed  "), "confirmed");
  });
});

// ── normalizeInternalNotes ────────────────────────────────────────────────────

describe("normalizeInternalNotes", () => {
  it("returns null for null", () => {
    assert.equal(normalizeInternalNotes(null), null);
  });

  it("returns null for undefined", () => {
    assert.equal(normalizeInternalNotes(undefined), null);
  });

  it("returns null for non-string", () => {
    assert.equal(normalizeInternalNotes(42), null);
    assert.equal(normalizeInternalNotes({}), null);
  });

  it("returns null for empty string", () => {
    assert.equal(normalizeInternalNotes(""), null);
  });

  it("returns null for whitespace-only string", () => {
    assert.equal(normalizeInternalNotes("   "), null);
  });

  it("trims whitespace from valid notes", () => {
    assert.equal(normalizeInternalNotes("  Note valide  "), "Note valide");
  });

  it("truncates at 2000 characters", () => {
    const long = "A".repeat(2500);
    const result = normalizeInternalNotes(long);
    assert.ok(result !== null);
    assert.equal(result!.length, 2000);
  });

  it("preserves notes under 2000 chars", () => {
    const note = "Suivi téléphonique réalisé. Client intéressé.";
    assert.equal(normalizeInternalNotes(note), note);
  });
});

// ── normalizeFollowUpDate ─────────────────────────────────────────────────────

describe("normalizeFollowUpDate", () => {
  it("returns null for null", () => {
    assert.equal(normalizeFollowUpDate(null), null);
  });

  it("returns null for undefined", () => {
    assert.equal(normalizeFollowUpDate(undefined), null);
  });

  it("returns null for empty string", () => {
    assert.equal(normalizeFollowUpDate(""), null);
  });

  it("returns null for invalid date string", () => {
    assert.equal(normalizeFollowUpDate("not-a-date"), null);
    assert.equal(normalizeFollowUpDate("32/13/2026"), null);
  });

  it("returns null for non-string", () => {
    assert.equal(normalizeFollowUpDate(12345), null);
    assert.equal(normalizeFollowUpDate({}), null);
  });

  it("accepts YYYY-MM-DD date", () => {
    const result = normalizeFollowUpDate("2026-07-15");
    assert.ok(result !== null, "Expected non-null for valid date");
    assert.ok(result!.includes("2026-07-15"), `Expected ISO string to contain 2026-07-15, got: ${result}`);
  });

  it("accepts full ISO-8601 string", () => {
    const result = normalizeFollowUpDate("2026-07-15T10:00:00.000Z");
    assert.ok(result !== null, "Expected non-null for valid ISO date");
    assert.ok(result!.startsWith("2026-07-15"), `Expected ISO string, got: ${result}`);
  });
});

// ── mapLeadStatusLabel ────────────────────────────────────────────────────────

describe("mapLeadStatusLabel", () => {
  it("maps new → Nouveau", () => {
    assert.equal(mapLeadStatusLabel("new"), "Nouveau");
  });

  it("maps contacted → Contacté", () => {
    assert.equal(mapLeadStatusLabel("contacted"), "Contacté");
  });

  it("maps qualified → Qualifié", () => {
    assert.equal(mapLeadStatusLabel("qualified"), "Qualifié");
  });

  it("maps visit_confirmed → Visite confirmée", () => {
    assert.equal(mapLeadStatusLabel("visit_confirmed"), "Visite confirmée");
  });

  it("maps reschedule_requested → Créneau à modifier", () => {
    assert.equal(mapLeadStatusLabel("reschedule_requested"), "Créneau à modifier");
  });

  it("maps archived → Archivé", () => {
    assert.equal(mapLeadStatusLabel("archived"), "Archivé");
  });

  it("falls back to raw value for unknown status", () => {
    assert.equal(mapLeadStatusLabel("unknown_status"), "unknown_status");
  });

  it("does not return raw status value for known keys", () => {
    const rawValues = ["new", "contacted", "qualified", "visit_confirmed", "reschedule_requested", "archived"];
    for (const raw of rawValues) {
      const label = mapLeadStatusLabel(raw);
      assert.notEqual(label, raw, `Label for '${raw}' should not be the raw value`);
    }
  });
});

// ── mapVisitStatusLabel ───────────────────────────────────────────────────────

describe("mapVisitStatusLabel", () => {
  it("maps pending → En attente", () => {
    assert.equal(mapVisitStatusLabel("pending"), "En attente");
  });

  it("maps contacted → Contacté", () => {
    assert.equal(mapVisitStatusLabel("contacted"), "Contacté");
  });

  it("maps confirmed → Confirmé", () => {
    assert.equal(mapVisitStatusLabel("confirmed"), "Confirmé");
  });

  it("maps reschedule_requested → Créneau à modifier", () => {
    assert.equal(mapVisitStatusLabel("reschedule_requested"), "Créneau à modifier");
  });

  it("maps cancelled → Annulé", () => {
    assert.equal(mapVisitStatusLabel("cancelled"), "Annulé");
  });

  it("maps archived → Archivé", () => {
    assert.equal(mapVisitStatusLabel("archived"), "Archivé");
  });

  it("falls back to raw value for unknown status", () => {
    assert.equal(mapVisitStatusLabel("unknown_visit"), "unknown_visit");
  });

  it("does not return raw status value for known keys", () => {
    const rawValues = ["pending", "confirmed", "cancelled", "archived"];
    for (const raw of rawValues) {
      const label = mapVisitStatusLabel(raw);
      assert.notEqual(label, raw, `Label for '${raw}' should not be the raw value`);
    }
  });
});
