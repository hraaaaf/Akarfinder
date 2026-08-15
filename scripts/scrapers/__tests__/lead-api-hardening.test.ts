import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isValidPhone, normalizePhone, validateLeadPayload } from "../../../lib/leads/validate";
import {
  LEAD_RATE_LIMIT_MAX_PER_PHONE,
  LEAD_RATE_LIMIT_RETRY_AFTER_SECONDS,
  LEAD_RATE_LIMIT_WINDOW_MS,
  isLeadRateLimited,
  leadRateLimitCutoff,
} from "../../../lib/leads/abuse";

const routeSource = readFileSync("app/api/leads/route.ts", "utf8");
const migrationSource = readFileSync("db/supabase-leads-migration.sql", "utf8");
const proFormSource = readFileSync("components/pro/ProActivationForm.tsx", "utf8");

describe("#643 phone contract", () => {
  it("accepts Moroccan and international formats", () => {
    assert.equal(isValidPhone("06 12 34 56 78"), true);
    assert.equal(isValidPhone("+212 6 12 34 56 78"), true);
    assert.equal(isValidPhone("+33 (0)6 12 34 56 78"), true);
  });

  it("preserves normalized international prefix", () => {
    assert.equal(normalizePhone("+212 (6) 12-34-56-78"), "+212612345678");
  });

  it("accepts exact 8 and 15 digit boundaries", () => {
    assert.equal(isValidPhone("12345678"), true);
    assert.equal(isValidPhone("+123456789012345"), true);
  });

  it("rejects too short, too long, letters and malformed plus signs", () => {
    assert.equal(isValidPhone("1234567"), false);
    assert.equal(isValidPhone("1234567890123456"), false);
    assert.equal(isValidPhone("abc0612345678"), false);
    assert.equal(isValidPhone("06/12/34/56/78"), false);
    assert.equal(isValidPhone("++212612345678"), false);
    assert.equal(isValidPhone("212+612345678"), false);
  });

  it("enforces the same rule through validateLeadPayload", () => {
    const base = { consentContact: true, consentIndicatif: true };
    assert.equal(validateLeadPayload({ profile: { ...base, phone: "+212612345678" } }).ok, true);
    assert.equal(validateLeadPayload({ profile: { ...base, phone: "abc0612345678" } }).ok, false);
  });

  it("aligns the Pro client with the shared validator", () => {
    assert.match(proFormSource, /import \{ isValidPhone \} from "@\/lib\/leads\/validate"/);
    assert.match(proFormSource, /const phoneOk = isValidPhone\(form\.phone\)/);
    assert.doesNotMatch(proFormSource, /phoneDigits/);
  });
});

describe("#643 bounded anti-abuse", () => {
  it("uses a 3 submissions / 10 minute policy", () => {
    assert.equal(LEAD_RATE_LIMIT_MAX_PER_PHONE, 3);
    assert.equal(LEAD_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000);
    assert.equal(LEAD_RATE_LIMIT_RETRY_AFTER_SECONDS, 600);
  });

  it("blocks at the threshold and above", () => {
    assert.equal(isLeadRateLimited(0), false);
    assert.equal(isLeadRateLimited(2), false);
    assert.equal(isLeadRateLimited(3), true);
    assert.equal(isLeadRateLimited(4), true);
  });

  it("computes a deterministic cutoff", () => {
    assert.equal(leadRateLimitCutoff(Date.parse("2026-08-15T17:00:00.000Z")), "2026-08-15T16:50:00.000Z");
  });

  it("checks recent rows by normalized phone before insert", () => {
    assert.match(routeSource, /select\("id", \{ count: "exact", head: true \}\)/);
    assert.match(routeSource, /\.eq\("phone_whatsapp", normalizedPhone\)/);
    assert.match(routeSource, /\.gte\("created_at", cutoff\)/);
    assert.match(routeSource, /isLeadRateLimited\(recentLeadCount \?\? 0\)/);
  });

  it("returns 429 with Retry-After and fails closed if the guard cannot be checked", () => {
    assert.match(routeSource, /status: 429/);
    assert.match(routeSource, /"Retry-After": String\(LEAD_RATE_LIMIT_RETRY_AFTER_SECONDS\)/);
    assert.match(routeSource, /anti-abuse lookup error/);
    assert.match(routeSource, /status: 503/);
  });

  it("reuses existing phone PII and indexes the bounded lookup", () => {
    assert.match(
      migrationSource,
      /buyer_leads_phone_created_at_idx ON buyer_leads \(phone_whatsapp, created_at DESC\)/,
    );
    assert.doesNotMatch(routeSource, /x-forwarded-for|remoteAddress|client_ip|ip_address/i);
  });

  it("keeps all shared lead funnels in the same protected route", () => {
    for (const channel of ["seller", "promoter", "credit", "visit_request"]) {
      assert.ok(routeSource.includes(`source_channel === "${channel}"`), `missing ${channel} funnel`);
    }
    assert.match(routeSource, /computeLeadTemperature\(buyerProfile\)/);
  });
});
