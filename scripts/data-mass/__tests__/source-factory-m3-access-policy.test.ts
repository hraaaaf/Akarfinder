import assert from "node:assert/strict";
import test from "node:test";

import { buildM3SeparatedAccessPolicy } from "../source-factory-m3-access-policy";

test("minimal external index is independent from ingestion and reuse authorization", () => {
  const result = buildM3SeparatedAccessPolicy("Example.ma", true);

  assert.equal(result.sourceDomain, "example.ma");
  assert.equal(result.externalIndex.eligible, true);
  assert.equal(result.externalIndex.mode, "MINIMAL_EXTERNAL_INDEX");
  assert.deepEqual(result.externalIndex.allowedFields, ["CANONICAL_URL", "SOURCE_DOMAIN", "PROVENANCE"]);
  assert.equal(result.externalIndex.sourceNetworkRequestsAllowed, false);
  assert.equal(result.externalIndex.sourceContentReuseAllowed, false);
  assert.equal(result.ingestionAndReuse.authorized, false);
  assert.equal(result.ingestionAndReuse.evidenceReference, null);
  assert.deepEqual(result.ingestionAndReuse.allowedChannels, []);
});

test("external-index ineligibility does not prevent a separately evidenced reuse authorization", () => {
  const result = buildM3SeparatedAccessPolicy("partner.example", false, {
    granted: true,
    evidenceReference: "contract:partner-feed-2026-08",
    allowedChannels: ["PARTNER_FEED"],
  });

  assert.equal(result.externalIndex.mode, "NONE");
  assert.equal(result.ingestionAndReuse.authorized, true);
  assert.equal(result.ingestionAndReuse.evidenceReference, "contract:partner-feed-2026-08");
  assert.deepEqual(result.ingestionAndReuse.allowedChannels, ["PARTNER_FEED"]);
});

test("explicit reuse evidence is mandatory when ingestion or reuse is granted", () => {
  assert.throws(
    () => buildM3SeparatedAccessPolicy("example.ma", true, { granted: true, allowedChannels: ["DIRECT_FETCH"] }),
    /M3_REUSE_EVIDENCE_REQUIRED/,
  );
});

test("canonical-link and internal-only channels cannot authorize ingestion or source-content reuse", () => {
  assert.throws(
    () => buildM3SeparatedAccessPolicy("example.ma", true, {
      granted: true,
      evidenceReference: "review:legacy-canonical-link",
      allowedChannels: ["CANONICAL_LINK"],
    }),
    /M3_REUSE_CHANNEL_REQUIRED/,
  );

  assert.throws(
    () => buildM3SeparatedAccessPolicy("example.ma", true, {
      granted: true,
      evidenceReference: "review:legacy-internal-signal",
      allowedChannels: ["INTERNAL_SIGNAL"],
    }),
    /M3_REUSE_CHANNEL_REQUIRED/,
  );
});

test("not-granted reuse plane cannot carry channels or pseudo-evidence", () => {
  assert.throws(
    () => buildM3SeparatedAccessPolicy("example.ma", true, {
      granted: false,
      evidenceReference: "terms:https://example.ma/terms",
    }),
    /M3_REUSE_NOT_GRANTED_MUST_BE_EMPTY/,
  );

  assert.throws(
    () => buildM3SeparatedAccessPolicy("example.ma", true, {
      granted: false,
      allowedChannels: ["PUBLIC_SITEMAP"],
    }),
    /M3_REUSE_NOT_GRANTED_MUST_BE_EMPTY/,
  );
});
