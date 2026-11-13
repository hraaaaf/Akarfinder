import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWorkflow } from './validate-workflow-efficiency.mjs';

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

const alwaysOnGate = [
  'name: Required PR Gate', 'on:', '  pull_request:', '    branches: [main]',
  'permissions:', '  contents: read', 'concurrency:',
  '  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}',
  '  cancel-in-progress: true', 'jobs:', '  gate:', '    name: gate',
  '    steps:', '      - run: node --test scripts/ci/required-pr-gate.test.mjs',
  '      - run: npx tsc --noEmit', ''
].join('\n');

test('permanent status check exception is restricted to the real required gate', () => {
  assert.deepEqual(validateWorkflow('.github/workflows/required-pr-gate.yml', alwaysOnGate), []);
  bad(alwaysOnGate, 'targeted paths');
  bad(alwaysOnGate.replace('    name: gate', '    name: fake-gate'), 'targeted paths');
  assert.ok(validateWorkflow('.github/workflows/required-pr-gate.yml', alwaysOnGate.replace('    branches: [main]', '    branches: [other]')).some(x => x.includes('targeted paths')));
  assert.ok(validateWorkflow('.github/workflows/required-pr-gate.yml', alwaysOnGate + '      - run: npm run build\n').some(x => x.includes('heavy suite')));
});


const nativeReaderPath = ".github/workflows/vivre-ici-native-screen-reader-pr1197.yml";
const nativeReaderWorkflow = [
  "name: Vivre Ici J18 Native Screen Readers PR1197",
  "on:",
  "  pull_request:",
  "    branches: [feat/akarfinder-supabase-unified-20261108]",
  "    paths:",
  '      - ".github/workflows/vivre-ici-native-screen-reader-pr1197.yml"',
  '      - "scripts/audits/vivre-ici-native-screen-reader.spec.mjs"',
  "permissions:",
  "  contents: read",
  "concurrency:",
  '  group: \${{ github.workflow }}-\${{ github.event.pull_request.number || github.ref }}',
  "  cancel-in-progress: true",
  "jobs:",
  "  native-reader:",
  "    if: github.event.pull_request.number == 1197 && github.event.pull_request.head.repo.full_name == github.repository",
  "    runs-on: \${{ matrix.os }}",
  "    timeout-minutes: 40",
  "    strategy:",
  "      matrix:",
  "        include:",
  "          - os: windows-2022",
  "            reader: nvda",
  "          - os: macos-15",
  "            reader: voiceover",
  "    steps:",
  "      - run: npm run build",
  "      - run: npx @guidepup/setup setup --ci",
  "      - run: npx playwright test --config scripts/audits/vivre-ici-native-screen-reader.config.mjs",
  "",
].join("\n");

test("one-off heavy real-reader exception is limited to Vivre Ici PR1197", () => {
  assert.deepEqual(validateWorkflow(nativeReaderPath, nativeReaderWorkflow), []);
  const forbidden = [
    nativeReaderWorkflow.replace("number == 1197", "number == 1198"),
    nativeReaderWorkflow.replace("os: macos-15", "os: ubuntu-24.04"),
    nativeReaderWorkflow.replace("  contents: read", "  contents: write"),
    nativeReaderWorkflow.replace("    timeout-minutes: 40", "    timeout-minutes: 120"),
    nativeReaderWorkflow.replace("    branches: [feat/akarfinder-supabase-unified-20261108]", "    branches: [main]"),
    nativeReaderWorkflow.replace(" && github.event.pull_request.head.repo.full_name == github.repository", ""),
    nativeReaderWorkflow + "  workflow_dispatch:\n",
    nativeReaderWorkflow.replace("  native-reader:", "  second-reader:"),
  ];
  for (const candidate of forbidden) {
    assert.ok(validateWorkflow(nativeReaderPath, candidate).some(e => e.includes("heavy suite")),
      "strict one-off exception must reject expanded privileges");
  }
  assert.ok(validateWorkflow("another.yml", nativeReaderWorkflow).some(e => e.includes("heavy suite")));
});
