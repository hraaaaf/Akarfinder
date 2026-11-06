import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Full PR diff (merge base to HEAD); an additional clean commit cannot hide changes.
export function changedWorkflowFiles(base = process.env.CI_DIFF_BASE || 'HEAD^', head = process.env.CI_DIFF_HEAD || 'HEAD') {
  return execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', `${base}...${head}`, '--', '.github/workflows/'], { encoding: 'utf8' })
    .split('\n').map(x => x.trim()).filter(x => /^\.github\/workflows\/.+\.ya?ml$/.test(x));
}


// GitHub Actions is for deterministic tests and synthetic fixtures until fresh,
// source-authorized production inventory exists. Never introduce cloud DB access
// in new workflow diff lines; historical references remain visible for separate
// cleanup rather than breaking unrelated PRs.
export function validateNewHostedDbReferences(patch) {
  const errors = [];
  let path = '';
  for (const line of patch.split('\n')) {
    const header = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (header) {
      path = header[2];
      continue;
    }
    if (!/^\.github\/workflows\/.+\.ya?ml$/.test(path)) continue;
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    const addedLine = line.slice(1);
    if (/^\s*#/.test(addedLine)) continue;
    const remoteSecret = /\bsecrets\s*(?:\.\s*|\[\s*['"])(?:SUPABASE_[\w]+|DATABASE_URL|DIRECT_URL|POSTGRES_URL|NEON_[\w]+)\b/i.test(addedLine);
    const remoteEndpoint = /(?:[a-z0-9-]+\.)?supabase\.co\b|(?:postgres(?:ql)?:\/\/)[^\s]*@/i.test(addedLine);
    const remoteCli = /\bsupabase\s+(?:link|db\s+(?:push|pull))\b/i.test(addedLine);
    if (remoteSecret || remoteEndpoint || remoteCli) {
      errors.push(path + ': newly added hosted DB credential/endpoint/CLI operation is forbidden in GitHub Actions');
    }
  }
  return errors;
}

export function changedWorkflowPatch(base = process.env.CI_DIFF_BASE || 'HEAD^', head = process.env.CI_DIFF_HEAD || 'HEAD') {
  return execFileSync('git', ['diff', '--no-ext-diff', '--unified=0', base + '...' + head, '--', '.github/workflows/'], { encoding: 'utf8' });
}

export function validateWorkflow(file, source) {
  const errors = [];
  const text = source.replace(/^\s*#.*$/gm, '');
  const pr = /^  (?:pull_request|pull_request_target):/m.test(text) || /^on:\s*\[[^\]]*pull_request(?:_target)?/m.test(text);
  const dispatch = /^  workflow_dispatch:/m.test(text);
  const push = /^  push:/m.test(text);
  const heavy = /\b(?:playwright\s+install|playwright\s+test|chromium|npm\s+run\s+build|next\s+build|npm\s+(?:run\s+)?test:scrapers|npm\s+test|visual.certification|full.page.certification|full.matrix|full.*benchmark|load.test|k6\s+run)\b/i.test(text);
  const topConcurrency = /^concurrency:\s*$/m.test(text);
  const cancellation = /^  cancel-in-progress:\s*(?:true|\$\{\{)/m.test(text);
  if (pr) {
    if (!/^    paths:\s*$/m.test(text)) errors.push('PR trigger must have targeted paths');
    const group = text.match(/^  group:\s*(.*)$/m)?.[1] || '';
    if (!topConcurrency || !cancellation || !group.includes('github.workflow') ||
        !/(?:github\.event\.pull_request\.number|github\.head_ref)/.test(group)) {
      errors.push('PR trigger requires per-PR top-level concurrency with cancel-in-progress');
    }
    if (heavy) errors.push('heavy suite/build/Chromium must not run on pull_request; use post-merge main');
  }
  if (heavy) {
    if (!topConcurrency) errors.push('heavy workflow requires top-level concurrency');
    if (push && !/^    branches:\s*(?:\[\s*['"]?main['"]?\s*\]|\n\s+-\s*['"]?main['"]?)/m.test(text)) errors.push('heavy push workflow must be restricted to main');
    // A main guard on one job must not authorize another unguarded heavy job.
    const jobs = text.split(/^jobs:\s*$/m)[1] || '';
    const starts = [...jobs.matchAll(/^  ([a-zA-Z0-9_-]+):\s*$/gm)];
    const blocks = starts.map((m, i) => jobs.slice(m.index, starts[i + 1]?.index ?? jobs.length));
    const risky = blocks.filter(block => /(?:npm\s+run\s+build|next\s+build|playwright|chromium|npm\s+test|test:scrapers|full.*benchmark)/i.test(block));
    if (dispatch && risky.some(block => !/^    if:\s*.*(?:refs\/heads\/main|github\.ref_name\s*==\s*['"]main['"])/m.test(block))) {
      errors.push('every heavy workflow_dispatch job guard required on main');
    }
  }
  return errors.map(msg => `${file}: ${msg}`);
}

if (process.argv[1]?.endsWith('validate-workflow-efficiency.mjs')) {
  const paths = changedWorkflowFiles();
  const failures = [...paths.flatMap(path => validateWorkflow(path, readFileSync(path, 'utf8'))), ...validateNewHostedDbReferences(changedWorkflowPatch())];
  if (failures.length) {
    console.error('CI efficiency policy failed:\n' + failures.map(x => '- ' + x).join('\n'));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ checkedWorkflowFiles: paths.length, failures: 0, mode: 'full-pr-diff' }, null, 2));
  }
}
