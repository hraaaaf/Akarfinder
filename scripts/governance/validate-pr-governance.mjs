import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.log("PR governance validation skipped: GITHUB_EVENT_PATH is not set");
  process.exit(0);
}

const event = JSON.parse(readFileSync(eventPath, "utf8"));
if (!event.pull_request) {
  console.log("PR governance validation skipped: event is not a pull_request");
  process.exit(0);
}

const body = event.pull_request.body ?? "";
const headSha = event.pull_request.head?.sha ?? "";
const baseSha = event.pull_request.base?.sha ?? "";
const failures = [];

function field(label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`^- ${escaped}:\\s*(.+)$`, "mi"));
  return match?.[1]?.trim() ?? "";
}

function meaningful(value) {
  return Boolean(value) && !/^(pending|tbd|n\/a|none|-)$/i.test(value.replace(/`/g, "").trim());
}

function changedFiles() {
  if (!baseSha || !headSha) return [];
  try {
    return execFileSync("git", ["diff", "--name-only", `${baseSha}...${headSha}`], { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch (error) {
    failures.push(`unable to derive changed files from exact PR SHAs: ${error.message}`);
    return [];
  }
}

for (const heading of [
  "## LOT",
  "## Acceptance criteria",
  "## Reviewer routing",
  "## Builder evidence",
  "## Exact-head evidence",
  "## Release Certifier — pre-merge",
  "## Merge / post-merge",
]) {
  if (!body.includes(heading)) failures.push(`missing PR governance heading: ${heading}`);
}

const lotId = field("LOT ID");
const responsibility = field("Responsibility (one only)");
const builder = field("Builder");
const expectedHead = field("Expected head SHA").replace(/`/g, "");
const requiredReviewers = field("Required specialist reviewer(s)");
const independentReviewer = field("Independent Reviewer identity/pass");
const reviewerVerdict = field("Reviewer verdict").replace(/`/g, "");
const applicableSkills = field("Applicable skills loaded");
const roadMap = field("ROADMAP updated");

for (const [label, value] of [
  ["LOT ID", lotId],
  ["Responsibility (one only)", responsibility],
  ["Builder", builder],
  ["Required specialist reviewer(s)", requiredReviewers],
  ["Independent Reviewer identity/pass", independentReviewer],
  ["Applicable skills loaded", applicableSkills],
]) {
  if (!meaningful(value)) failures.push(`${label} must be explicitly populated`);
}

if (builder && independentReviewer && independentReviewer.toLowerCase().includes(builder.toLowerCase())) {
  failures.push("Builder and Independent Reviewer must not identify as the same role/person");
}

const files = changedFiles();
const routing = [
  {
    reviewer: "Search & Ranking Reviewer",
    skill: ".skills/search-ranking-review/SKILL.md",
    match: (path) => /^(app\/api\/search|lib\/(search|search-gateway)\/)/.test(path) || /(ranking|typesense|dedup)/i.test(path),
  },
  {
    reviewer: "Data Acquisition & Provenance Reviewer",
    skill: ".skills/data-acquisition-provenance/SKILL.md",
    match: (path) => /^scripts\/scrapers\//.test(path) || /(sitemap|common.?crawl|openserp|serper|freshness|source.registry|acquisition|ingestion)/i.test(path),
  },
  {
    reviewer: "Geo & Map Reviewer",
    skill: ".skills/geo-map-certification/SKILL.md",
    match: (path) => /^lib\/(geo|map)\//.test(path) || /(district|neighborhood|maplibre|geometry)/i.test(path),
  },
  {
    reviewer: "UX/UI Auditor",
    skill: ".skills/ux-ui-certification/SKILL.md",
    match: (path) => /^components\//.test(path) || /^app\/.*\.(tsx|css)$/.test(path) || /(responsive|accessibility|a11y)/i.test(path),
  },
  {
    reviewer: "Security & Privacy Reviewer",
    skill: ".skills/security-review/SKILL.md",
    match: (path) => /^\.github\/workflows\//.test(path) || /(auth|security|secret|permission|rate.?limit|middleware|rls)/i.test(path),
  },
  {
    reviewer: "Database & Migration Reviewer",
    skill: ".skills/migrations-database/SKILL.md",
    match: (path) => /^supabase\/migrations\//.test(path) || /(schema|migration|postgres|database|index)/i.test(path),
  },
];

const requiredByDiff = routing.filter((route) => files.some(route.match));
if (requiredByDiff.length === 0) {
  if (!requiredReviewers.includes("Reviewer général indépendant")) {
    failures.push("diff has no specialist route; Reviewer général indépendant is mandatory");
  }
} else {
  for (const route of requiredByDiff) {
    if (!requiredReviewers.includes(route.reviewer)) {
      failures.push(`changed files require reviewer: ${route.reviewer}`);
    }
    if (!applicableSkills.includes(route.skill)) {
      failures.push(`changed files require skill: ${route.skill}`);
    }
  }
}

for (const skill of [
  ".skills/lot-execution/SKILL.md",
  ".skills/release-certification/SKILL.md",
]) {
  if (!applicableSkills.includes(skill)) failures.push(`every LOT must declare applicable skill: ${skill}`);
}

if (reviewerVerdict !== "PASS") failures.push("Reviewer verdict must be PASS before exact-head governance gate can pass");
if (!expectedHead || expectedHead !== headSha) failures.push(`Expected head SHA must equal PR head SHA (${headSha})`);
if (!/^yes\b/i.test(roadMap)) failures.push("ROADMAP updated must be yes before Reviewer PASS gate");
if (/^- \[ \]/m.test(body)) failures.push("Acceptance criteria contain unchecked items");

if (failures.length) {
  console.error("PR governance validation FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PR governance validation PASS for ${lotId} at ${headSha}`);
console.log(`Changed files inspected: ${files.length}`);
