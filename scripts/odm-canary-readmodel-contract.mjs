import assert from "node:assert/strict";

const MAX_PERCENT = 1;
const parsePercent = (value) => {
  if (value === undefined || String(value).trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_PERCENT ? parsed : 0;
};

const bucket = (key) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 10_000;
};

for (const invalid of [undefined, "", "abc", "-1", "1.01", "10", "Infinity"]) {
  assert.equal(parsePercent(invalid), 0);
}
assert.equal(parsePercent("1"), 1);

let admitted = 0;
const total = 100_000;
for (let index = 0; index < total; index += 1) {
  if (bucket(`request-${index}`) < 100) admitted += 1;
}
assert.ok(admitted > 700 && admitted <= 1_100, `unsafe deterministic admission count: ${admitted}`);

console.log(JSON.stringify({
  contract: "odm_canary_readmodel_v1",
  total,
  admitted,
  rate: admitted / total,
  max_percent: MAX_PERCENT,
  status: "PASS",
}, null, 2));
