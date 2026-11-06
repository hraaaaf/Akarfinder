import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWorkflow, validateNewHostedDbReferences } from './validate-workflow-efficiency.mjs';

const quick = [
  'name: Quick gate', 'on:', '  pull_request:', '    paths:', "      - 'app/search/**'",
  'concurrency:', '  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}', '  cancel-in-progress: true',
  'jobs:', '  unit:', '    steps:', '      - run: node --test test/unit.test.mjs', ''
].join('\n');
const bad = (text, expected) => assert.ok(validateWorkflow('test.yml', text).some(x => x.includes(expected)), expected);
test('targeted PR quick test accepted', () => assert.deepEqual(validateWorkflow('test.yml', quick), []));
test('reject PR build', () => bad(quick + '      - run: npm run build\n', 'heavy suite'));
test('reject PR Chromium', () => bad(quick + '      - run: npx playwright install --with-deps chromium\n', 'heavy suite'));
test('reject broad PR', () => bad(quick.replace("    paths:\n      - 'app/search/**'\n", ''), 'targeted paths'));
test('reject PR missing concurrency', () => bad(quick.replace(/concurrency:[\s\S]*?jobs:\n/, 'jobs:\n'), 'concurrency'));
test('reject uncancelled PR', () => bad(quick.replace('cancel-in-progress: true','cancel-in-progress: false'), 'concurrency'));
test('accept heavy postmerge main', () => assert.deepEqual(validateWorkflow('after.yml', [
  'on:', '  push:', '    branches: [main]', '    paths:', "      - 'app/search/**'",
  '  workflow_dispatch:', 'concurrency:', '  group: after', '  cancel-in-progress: true',
  'jobs:', '  visual:', "    if: github.ref == 'refs/heads/main'", '    steps:', '      - run: npm run build', ''
].join('\n')), []));
test('reject heavy branch push', () => bad([
  'on:', '  push:', '    branches: [feature]', 'concurrency:', '  group: after',
  '  cancel-in-progress: true', 'jobs:', '  visual:', '    steps:', '      - run: npm run build', ''
].join('\n'), 'restricted to main'));
test('reject dispatch-only heavy not guarded', () => bad([
  'on:', '  workflow_dispatch:', 'concurrency:', '  group: after',
  '  cancel-in-progress: true', 'jobs:', '  visual:', '    steps:', '      - run: npm run build', ''
].join('\n'), 'job guard'));
test('reject push-main plus dispatch without guard', () => bad([
  'on:', '  push:', '    branches: [main]', '  workflow_dispatch:',
  'concurrency:', '  group: after', '  cancel-in-progress: true',
  'jobs:', '  visual:', '    steps:', '      - run: npm run build', ''
].join('\n'), 'job guard'));

test('PR without PR-number isolation is rejected', () => bad(quick.replace('github.event.pull_request.number || github.ref', 'github.ref'), 'per-PR'));
test('one guarded job does not allow an unguarded heavy job', () => bad([
  'on:', '  workflow_dispatch:', 'concurrency:', '  group: after', '  cancel-in-progress: true',
  'jobs:', '  first:', "    if: github.ref == 'refs/heads/main'", '    steps:', '      - run: npm run build',
  '  second:', '    steps:', '      - run: npx playwright install chromium', ''
].join('\n'), 'every heavy'));


const patch = (lines, filename = '.github/workflows/contract.yml') =>
  ['diff --git a/' + filename + ' b/' + filename,
   '--- a/' + filename, '+++ b/' + filename,
   '@@ -3,0 +4,2 @@', ...lines, ''].join('\n');

test('forbid new hosted Supabase service credentials in workflows', () => {
  const diff = patch(['+    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}']);
  assert.equal(validateNewHostedDbReferences(diff).length, 1);
});
test('forbid new Neon and generic hosted database credentials', () => {
  const diff = patch(['+    DB: ${{ secrets.NEON_DATABASE_URL }}', '+    DB: ${{ secrets.DATABASE_URL }}']);
  assert.equal(validateNewHostedDbReferences(diff).length, 2);
});
test('forbid new hosted Supabase endpoints and remote db commands', () => {
  const diff = patch(['+    url: https://abcd1234.supabase.co',
    '+    run: supabase db push', '+    run: supabase link --project-ref abc']);
  assert.equal(validateNewHostedDbReferences(diff).length, 3);
});
test('ignore legacy references removed by a PR', () => {
  const diff = patch(['-    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
    '+    run: node --test scripts/ci/offline.test.mjs']);
  assert.deepEqual(validateNewHostedDbReferences(diff), []);
});
test('ignore existing references in unchanged context and YAML headers', () => {
  const diff = patch(['      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
    '+    run: node --test scripts/ci/offline.test.mjs']);
  assert.deepEqual(validateNewHostedDbReferences(diff), []);
});
test('accept local-only workflow and negative assertions', () => {
  const diff = patch(["+    run: psql -h 127.0.0.1 -p 5433 -d test -c 'select 1'",
    '+    run: echo "No hosted database environment configured"',
    '+    run: test -z "${SUPABASE_URL:-}"']);
  assert.deepEqual(validateNewHostedDbReferences(diff), []);
});
test('ignore additions to non-workflow files and comment lines', () => {
  const diff = patch(['+    run: supabase db push'], 'docs/architecture.md')
    + patch(['+    # do not run supabase db push'], '.github/workflows/docs.yml');
  assert.deepEqual(validateNewHostedDbReferences(diff), []);
});
