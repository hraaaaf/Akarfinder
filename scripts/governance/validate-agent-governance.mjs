import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  ".agents/README.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/agent-governance-gate.yml",
  "scripts/governance/validate-pr-governance.mjs",
  ".skills/lot-execution/SKILL.md",
  ".skills/search-ranking-review/SKILL.md",
  ".skills/data-acquisition-provenance/SKILL.md",
  ".skills/geo-map-certification/SKILL.md",
  ".skills/ux-ui-certification/SKILL.md",
  ".skills/security-review/SKILL.md",
  ".skills/migrations-database/SKILL.md",
  ".skills/release-certification/SKILL.md",
];

const skillHeadings = [
  "## Purpose",
  "## When it applies",
  "## Required inspection",
  "## Mandatory evidence",
  "## Blockers",
  "## PASS / FAIL criteria",
  "## Forbidden shortcuts",
  "## Required final report",
];

const failures = [];
for (const path of requiredFiles) {
  if (!existsSync(path)) failures.push(`missing required governance file: ${path}`);
}

if (existsSync("AGENTS.md")) {
  const agents = readFileSync("AGENTS.md", "utf8");
  for (const token of [
    "Builder ≠ Reviewer",
    "Reviewer ≠ Release Certifier",
    "18 étapes",
    "Exact-head CI",
    "Post-merge CI",
    "strictement > 9.0/10",
    "population avant",
    "contenu réellement inédit vs déjà visible",
    "Reviewer général indépendant",
    "CHANGES_REQUIRED",
    "head attendu",
  ]) {
    if (!agents.toLowerCase().includes(token.toLowerCase())) failures.push(`AGENTS.md missing invariant: ${token}`);
  }
  for (const skill of requiredFiles.filter((path) => path.startsWith(".skills/"))) {
    if (!agents.includes(skill)) failures.push(`AGENTS.md does not route to ${skill}`);
  }
}

for (const path of requiredFiles.filter((p) => p.startsWith(".skills/") && existsSync(p))) {
  const content = readFileSync(path, "utf8");
  for (const heading of skillHeadings) {
    if (!content.includes(heading)) failures.push(`${path} missing heading: ${heading}`);
  }
}

if (existsSync("CLAUDE.md") && !readFileSync("CLAUDE.md", "utf8").includes("AGENTS.md")) {
  failures.push("CLAUDE.md must point to AGENTS.md");
}

if (existsSync(".github/workflows/agent-governance-gate.yml")) {
  const workflow = readFileSync(".github/workflows/agent-governance-gate.yml", "utf8");
  for (const command of [
    "node scripts/governance/validate-agent-governance.mjs",
    "node scripts/governance/validate-pr-governance.mjs",
  ]) {
    if (!workflow.includes(command)) failures.push(`Agent Governance Gate missing command: ${command}`);
  }
}

for (const path of ["README.md", "docs/ROADMAP.md", "docs/SESSION.md"]) {
  if (!existsSync(path)) failures.push(`canonical doc missing: ${path}`);
}

if (failures.length) {
  console.error("Agent governance validation FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Agent governance validation PASS (${requiredFiles.length} required files, ${skillHeadings.length} headings/skill)`);
