import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args.set(token.slice(2), value);
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function loadManifest(root) {
  return readJson(path.join(root, "config/product-constitution.json"));
}

function safeCandidateFile(candidateRoot, relativePath) {
  const root = path.resolve(candidateRoot);
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    return { ok: false, reason: "protected path escapes candidate root" };
  }
  if (!fs.existsSync(target)) {
    return { ok: false, reason: "protected file missing" };
  }
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) {
    return { ok: false, reason: "protected file must not be a symlink" };
  }
  const real = fs.realpathSync(target);
  if (real !== root && !real.startsWith(`${root}${path.sep}`)) {
    return { ok: false, reason: "protected file resolves outside candidate root" };
  }
  return { ok: true, target };
}

export function collectInvariantViolations(manifest, candidateRoot) {
  const violations = [];

  for (const standard of manifest.locked_standards ?? []) {
    if (standard.status !== "LOCKED") continue;

    for (const invariant of standard.invariants ?? []) {
      const safeFile = safeCandidateFile(candidateRoot, invariant.file);
      if (!safeFile.ok) {
        violations.push({
          standard: standard.id,
          file: invariant.file,
          reason: safeFile.reason,
        });
        continue;
      }

      const content = fs.readFileSync(safeFile.target, "utf8");

      if (invariant.type === "contains_exact") {
        if (!content.includes(invariant.value)) {
          violations.push({
            standard: standard.id,
            file: invariant.file,
            reason: `missing locked value: ${invariant.value}`,
          });
        }
        continue;
      }

      if (invariant.type === "not_contains_exact") {
        if (content.includes(invariant.value)) {
          violations.push({
            standard: standard.id,
            file: invariant.file,
            reason: `forbidden locked value present: ${invariant.value}`,
          });
        }
        continue;
      }

      if (invariant.type === "ordered_contains_exact") {
        const values = Array.isArray(invariant.values) ? invariant.values : [];
        let cursor = -1;
        let failed = false;
        for (const value of values) {
          const index = content.indexOf(value, cursor + 1);
          if (index === -1) {
            violations.push({
              standard: standard.id,
              file: invariant.file,
              reason: `missing or out-of-order locked value: ${value}`,
            });
            failed = true;
            break;
          }
          cursor = index;
        }
        if (!failed && values.length === 0) {
          violations.push({
            standard: standard.id,
            file: invariant.file,
            reason: "ordered_contains_exact requires a non-empty values array",
          });
        }
        continue;
      }

      if (invariant.type === "count_exact") {
        const value = invariant.value;
        const expected = Number(invariant.count);
        const actual = typeof value === "string" && value.length > 0 ? content.split(value).length - 1 : 0;
        if (!Number.isInteger(expected) || expected < 0 || actual !== expected) {
          violations.push({
            standard: standard.id,
            file: invariant.file,
            reason: `locked occurrence count mismatch for ${value}: expected ${expected}, got ${actual}`,
          });
        }
        continue;
      }

      violations.push({
        standard: standard.id,
        file: invariant.file,
        reason: `unsupported invariant type: ${invariant.type}`,
      });
    }
  }

  return violations;
}

export function overrideDocumentationIsComplete(changedFiles, manifest) {
  const changed = new Set(changedFiles);
  return changed.has(manifest.canonical_file) && changed.has(manifest.manifest_file);
}

function printViolations(violations) {
  for (const violation of violations) {
    console.error(`- [${violation.standard}] ${violation.file}: ${violation.reason}`);
  }
}

function writeGithubOutput(outputPath, values) {
  if (!outputPath) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${String(value)}`);
  fs.appendFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${url}`);
  }

  return response.json();
}

async function fetchAllPages(url, token) {
  const all = [];
  for (let page = 1; page <= 20; page += 1) {
    const separator = url.includes("?") ? "&" : "?";
    const rows = await githubJson(`${url}${separator}per_page=100&page=${page}`, token);
    all.push(...rows);
    if (rows.length < 100) break;
  }
  return all;
}

async function validateOverrideDocumentation({ manifest, token, repository, prNumber, headSha }) {
  const prUrl = `https://api.github.com/repos/${repository}/pulls/${prNumber}`;
  const pr = await githubJson(prUrl, token);
  const currentHeadSha = pr?.head?.sha;

  if (!currentHeadSha || currentHeadSha !== headSha) {
    return {
      ok: false,
      reasons: [`PR HEAD moved: expected ${headSha}, current ${currentHeadSha ?? "missing"}`],
    };
  }

  const files = await fetchAllPages(`${prUrl}/files`, token);
  const changedFiles = files.map((file) => file.filename);
  const docsComplete = overrideDocumentationIsComplete(changedFiles, manifest);

  return {
    ok: docsComplete,
    reasons: docsComplete
      ? []
      : [`standard override must update both ${manifest.canonical_file} and ${manifest.manifest_file}`],
    changedFiles,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.get("mode") ?? "enforce";
  const baseRoot = path.resolve(args.get("base-root") ?? ".");
  const manifest = loadManifest(baseRoot);

  if (mode === "validate-override") {
    const token = process.env.GITHUB_TOKEN;
    const repository = process.env.GITHUB_REPOSITORY;
    const prNumber = Number(args.get("pr-number"));
    const headSha = args.get("head-sha");

    if (!token || !repository || !Number.isInteger(prNumber) || prNumber < 1 || !headSha) {
      console.error("FAIL: GITHUB_TOKEN, GITHUB_REPOSITORY, --pr-number and --head-sha are required.");
      process.exitCode = 1;
      return;
    }

    const result = await validateOverrideDocumentation({ manifest, token, repository, prNumber, headSha });
    if (!result.ok) {
      for (const reason of result.reasons) console.error(`- ${reason}`);
      console.error("FAIL: human approval was granted, but the L0 override documentation contract is incomplete or stale.");
      process.exitCode = 1;
      return;
    }

    console.log(`PASS override documentation: exact PR HEAD ${headSha}; canonical + manifest updated.`);
    return;
  }

  const candidateRoot = path.resolve(args.get("candidate-root") ?? ".");
  const violations = collectInvariantViolations(manifest, candidateRoot);

  if (mode === "detect") {
    const drift = violations.length > 0;
    if (drift) {
      console.error("LOCKED STANDARD DRIFT DETECTED — explicit owner environment approval required:");
      printViolations(violations);
    } else {
      console.log(`No L0 drift detected for product constitution ${manifest.constitution_version}.`);
    }
    writeGithubOutput(args.get("github-output"), {
      drift: drift ? "true" : "false",
      violation_count: violations.length,
    });
    return;
  }

  if (mode !== "enforce") {
    console.error(`FAIL: unsupported mode ${mode}`);
    process.exitCode = 1;
    return;
  }

  if (violations.length === 0) {
    console.log(`PASS product constitution ${manifest.constitution_version}: locked invariants preserved.`);
    return;
  }

  console.error("LOCKED STANDARD DRIFT DETECTED:");
  printViolations(violations);
  console.error("FAIL: candidate changes a locked standard.");
  process.exitCode = 1;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
