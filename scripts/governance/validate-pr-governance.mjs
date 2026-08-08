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
const failures = [];

function field(label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`^- ${escaped}:\\s*(.+)$`, "mi"));
  return match?.[1]?.trim() ?? "";
}

function meaningful(value) {
  return Boolean(value) && !/^(pending|tbd|n\/a|none|-)$/i.test(value.replace(/`/g, "").trim());
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
const roadMap = field("ROADMAP updated");

for (const [label, value] of [
  ["LOT ID", lotId],
  ["Responsibility (one only)", responsibility],
  ["Builder", builder],
  ["Required specialist reviewer(s)", requiredReviewers],
  ["Independent Reviewer identity/pass", independentReviewer],
]) {
  if (!meaningful(value)) failures.push(`${label} must be explicitly populated`);
}

if (builder && independentReviewer && independentReviewer.toLowerCase().includes(builder.toLowerCase())) {
  failures.push("Builder and Independent Reviewer must not identify as the same role/person");
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
