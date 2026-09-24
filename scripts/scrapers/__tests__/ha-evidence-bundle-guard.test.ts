import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = JSON.parse(
  readFileSync(
    new URL("../../../docs/ha-dr/schemas/ha-dr-evidence-v1.schema.json", import.meta.url),
    "utf8",
  ),
);

const template = JSON.parse(
  readFileSync(
    new URL("../../../docs/ha-dr/templates/HA_DR_EVIDENCE.template.json", import.meta.url),
    "utf8",
  ),
);

test("HA evidence schema requires integrity, writer, LSN and timing evidence", () => {
  const required = new Set(schema.required as string[]);

  for (const key of [
    "schema_version",
    "run_id",
    "status",
    "application_commit",
    "database_schema_fingerprint",
    "approved_tables",
    "writer_state",
    "single_writer_proven",
    "positions",
    "timings",
    "table_evidence",
    "conflicts",
    "duplicates",
    "secrets_redacted",
    "verdict",
  ]) {
    assert.equal(required.has(key), true, `missing required key: ${key}`);
  }
});

test("HA table evidence requires parity dimensions beyond row counts", () => {
  const required = new Set(
    schema.properties.table_evidence.items.required as string[],
  );

  for (const key of [
    "source_pk_digest",
    "target_pk_digest",
    "source_content_digest",
    "target_content_digest",
    "delete_parity",
    "timestamp_version_parity",
    "schema_fingerprint_match",
    "foreign_key_consistency",
    "replica_identity",
    "sequence_safe",
    "pass",
  ]) {
    assert.equal(required.has(key), true, `missing table evidence key: ${key}`);
  }
});

test("HA evidence template is explicitly NOT_RUN and cannot be mistaken for proof", () => {
  assert.equal(template.status, "NOT_RUN");
  assert.equal(template.verdict, "NOT_RUN");
  assert.equal(template.single_writer_proven, null);
  assert.equal(template.secrets_redacted, true);
  assert.match(template.notes.join("\n"), /not evidence/i);
});

test("HA evidence schema carries measured RPO/RTO fields", () => {
  const timings = schema.properties.timings.properties;
  assert.ok(timings.observed_rpo_seconds);
  assert.ok(timings.observed_failover_rto_seconds);
  assert.ok(timings.observed_failback_rto_seconds);
});

test("HA evidence schema exposes all state-machine states", () => {
  assert.deepEqual(schema.properties.writer_state.enum, [
    "SUPABASE_PRIMARY",
    "FAILOVER_PREP",
    "NEON_PRIMARY",
    "FAILBACK_SYNC",
    "FAILBACK_FREEZE",
  ]);
});

test("HA evidence artifacts must not contain connection-string fields", () => {
  const serialized = JSON.stringify({ schema, template }).toLowerCase();

  assert.doesNotMatch(serialized, /database_url/);
  assert.doesNotMatch(serialized, /service_role_key/);
  assert.doesNotMatch(serialized, /password/);
});
