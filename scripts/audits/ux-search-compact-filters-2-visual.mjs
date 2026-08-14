import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.UX_SEARCH_COMPACT_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = "data/audits/ux-search-compact-filters-2";

// UX-SEARCH-2 is a predecessor gate. The current Search UI has intentionally
// evolved through later certified lots, so this gate must not keep a competing
// copy of layout assertions. Replay the final canonical Search certification
// instead and keep a small receipt in the historical artifact directory.
process.env.BASE_URL = baseUrl;
process.env.AUDIT_VARIANT = "ux-search-2-predecessor-replay";
process.env.AUDIT_DIR = `${outputDir}/final-canonical-replay`;

await import("./ux-search-final-visual-certification-7.mjs");

await mkdir(outputDir, { recursive: true });
await writeFile(
  `${outputDir}/predecessor-replay.json`,
  `${JSON.stringify({
    lot: "UX-SEARCH-2",
    mode: "final-canonical-replay",
    canonicalAudit: "scripts/audits/ux-search-final-visual-certification-7.mjs",
    baseUrl,
    generatedAt: new Date().toISOString(),
  }, null, 2)}\n`,
  "utf8",
);

console.log("UX-SEARCH-2 predecessor gate passed by replaying the final canonical Search certification.");
