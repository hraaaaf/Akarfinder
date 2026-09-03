import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const base = process.env.CI_DIFF_BASE || "HEAD^";
const head = process.env.CI_DIFF_HEAD || "HEAD";
const changed = execFileSync("git", ["diff", "--name-only", base, head], { encoding: "utf8" })
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.startsWith(".github/workflows/") && /\.ya?ml$/.test(line));

const failures = [];
for (const path of changed) {
  const text = readFileSync(path, "utf8");
  const hasPullRequest = /(^|\n)\s{0,2}pull_request\s*:/m.test(text);
  if (!hasPullRequest) continue;

  const heavy = /(playwright install|npm run build|chromium|visual certification|Capture every renderable page)/i.test(text);
  if (!heavy) continue;

  const hasConcurrency = /(^|\n)concurrency\s*:/m.test(text);
  const hasLatestCommitScope = /Latest-commit scope check/.test(text) && /git diff --name-only HEAD\^ HEAD/.test(text);

  if (!hasConcurrency) failures.push(`${path}: heavy PR workflow missing concurrency/cancel-in-progress`);
  if (!hasLatestCommitScope) failures.push(`${path}: heavy PR workflow missing latest-commit scope gate`);
}

if (failures.length) {
  console.error("CI workflow efficiency policy failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({ checkedWorkflowFiles: changed.length, failures: 0 }, null, 2));
