import assert from 'node:assert/strict';
import fs from 'node:fs';

const contract = JSON.parse(fs.readFileSync(
  new URL('./candidate-lake-q1a-materializable-contract.json', import.meta.url),
  'utf8',
));

const materializable = Object.values(contract.lanes).reduce((sum, count) => sum + count, 0);
const aggregateOnly = Object.values(contract.aggregateOnly)
  .reduce((sum, cohort) => sum + cohort.count, 0);

assert.equal(materializable, contract.materializableExpected);
assert.equal(aggregateOnly, contract.aggregateOnlyExpected);
assert.equal(materializable + aggregateOnly, contract.frozenAccountingTotal);
assert.equal(Object.keys(contract.lanes).length, 25);
assert.equal(contract.aggregateOnly.data_4_9b.placeholderAllowed, false);
assert.equal(contract.aggregateOnly.data_4_9b.publicationEligible, false);
assert.deepEqual(contract.invariants, {
  candidateIsActive: false,
  urlIsPhysicalProperty: false,
  freshnessInferred: false,
  authorizationInferred: false,
  databaseWrites: 0,
  productionWrites: 0,
  sourceSiteFetches: 0,
  vercelDeployments: 0,
});

console.log(JSON.stringify({
  schemaVersion: contract.schemaVersion,
  laneCount: Object.keys(contract.lanes).length,
  materializable,
  aggregateOnly,
  frozenAccountingTotal: materializable + aggregateOnly,
  ok: true,
}, null, 2));
