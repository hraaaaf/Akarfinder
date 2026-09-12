import fs from "node:fs";
import path from "node:path";

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

export function collectInvariantViolations(manifest, candidateRoot) {
  const violations = [];

  for (const standard of manifest.locked_standards ?? []) {
    if (standard.status !== "LOCKED") continue;

    for (const invariant of standard.invariants ?? []) {
      const target = path.join(candidateRoot, invariant.file);
      if (!fs.existsSync(target)) {
        violations.push({
          standard: standard.id,
          file: invariant.file,
          reason: "protected file missing",
        });
        continue;
      }

      const content = fs.readFileSync(target, "utf8");
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

      violations.push({
        standard: standard.id,
        file: invariant.file,
        reason: `unsupported invariant type: ${invariant.type}`,
      });
    }
  }

  return violations;
}

export function hasExactHeadOwnerApproval(reviews, owner, headSha, requiredState = "APPROVED") {
  return reviews.some((review) =>
    review?.user?.login === owner &&
    review?.state === requiredState &&
    review?.commit_id === headSha,
  );
}

export function overrideDocumentationIsComplete(changedFiles, manifest) {
  const changed = new Set(changedFiles);
  return changed.has(manifest.canonical_file) && changed.has(manifest.manifest_file);
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

async function validateOwnerOverride({ manifest, event, token, repository }) {
  const pr = event.pull_request;
  if (!pr) {
    return { ok: false, reasons: ["event has no pull_request payload"] };
  }

  const headSha = pr.head?.sha;
  const prNumber = pr.number;
  if (!headSha || !prNumber) {
    return { ok: false, reasons: ["pull request head SHA or number missing"] };
  }

  const baseUrl = `https://api.github.com/repos/${repository}/pulls/${prNumber}`;
  const [files, reviews] = await Promise.all([
    fetchAllPages(`${baseUrl}/files`, token),
    fetchAllPages(`${baseUrl}/reviews`, token),
  ]);

  const changedFiles = files.map((file) => file.filename);
  const requiredState = manifest.owner_override?.required_review_state ?? "APPROVED";
  const exactApproval = hasExactHeadOwnerApproval(
    reviews,
    manifest.standard_owner,
    headSha,
    requiredState,
  );

  const docsComplete = overrideDocumentationIsComplete(changedFiles, manifest);
  const reasons = [];
  if (!exactApproval) {
    reasons.push(
      `missing ${requiredState} review by ${manifest.standard_owner} on exact HEAD ${headSha}`,
    );
  }
  if (!docsComplete) {
    reasons.push(
      `standard override must update both ${manifest.canonical_file} and ${manifest.manifest_file}`,
    );
  }

  return {
    ok: exactApproval && docsComplete,
    reasons,
    headSha,
    changedFiles,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseRoot = path.resolve(args.get("base-root") ?? ".");
  const candidateRoot = path.resolve(args.get("candidate-root") ?? ".");
  const eventPath = args.get("event");

  const manifest = loadManifest(baseRoot);
  const violations = collectInvariantViolations(manifest, candidateRoot);

  if (violations.length === 0) {
    console.log(`PASS product constitution ${manifest.constitution_version}: locked invariants preserved.`);
    return;
  }

  console.error("LOCKED STANDARD DRIFT DETECTED:");
  for (const violation of violations) {
    console.error(`- [${violation.standard}] ${violation.file}: ${violation.reason}`);
  }

  if (!eventPath) {
    console.error("FAIL: owner override cannot be evaluated without a GitHub event payload.");
    process.exitCode = 1;
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository) {
    console.error("FAIL: GITHUB_TOKEN/GITHUB_REPOSITORY required for owner override validation.");
    process.exitCode = 1;
    return;
  }

  const event = readJson(path.resolve(eventPath));
  const override = await validateOwnerOverride({ manifest, event, token, repository });

  if (!override.ok) {
    for (const reason of override.reasons) console.error(`- ${reason}`);
    console.error("FAIL: locked standard change is not explicitly authorized.");
    process.exitCode = 1;
    return;
  }

  console.log(
    `PASS WITH OWNER OVERRIDE: ${manifest.standard_owner} approved exact HEAD ${override.headSha}; canonical + manifest updated.`,
  );
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
