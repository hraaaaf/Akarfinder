import { readFileSync, writeFileSync } from "node:fs";

const path = "docs/ROADMAP.md";
let text = readFileSync(path, "utf8");

const block = [
  "<!-- UI-ALL-PAGES-V1-CLOSEOUT-START -->",
  "## Audit Toutes Pages — v1 ✅ CLOSED",
  "",
  "- **Progression stricte : 5/5 jalons CLOSED = 100 %** après merge du closeout A5.",
  "- **A1 Inventaire ✅ PR #626** — 64 pages App Router = 57 statiques + 7 dynamiques ; 0 doublon ; 0 route dynamique non classée.",
  "- **A2 Baseline ✅ PR #630** — 252/252 captures ; 120 findings initiaux sur 19 routes.",
  "- **A3 Remédiation ✅ PR #631** — overflow `/vendre/dossier` corrigé ; redirects/401 attendus modélisés ; 208/208 captures ; 0 finding ; inspection humaine 390/430/768/1280 PASS.",
  "- **A4 Recertification stricte ✅ PR #633** — run `31824121689` SUCCESS ; 208/208 captures ; 0 finding ; artefact `9228248430` ; digest `sha256:7047553be163e3572e8b5d0b3d4d3613257010cddfbb43b19405e92a2b103f6a`.",
  "- **A5 Gouvernance / closeout ✅ PR #635** — archive `docs/UI_ALL_PAGES_V1_CERTIFICATION.md` ; dette suivie par issue #634.",
  "- Comptabilité finale : **64/64 patterns gouvernés** = **52 rendus + certifiés** et **12 blockers explicites**.",
  "- Blockers : 2 `DATA_FIXTURE_REQUIRED` (`/listings/[id]`, `/professionnels/[slug]`) + 10 `QA_FIXTURE_REQUIRED` sous `/visual-qa/*` faute d’assets `/__qa/*` matérialisés dans cette lane.",
  "- Cette clôture ne prétend pas que les 12 blockers ont été rendus visuellement ; elle garantit qu’aucune page n’est oubliée ou silencieusement exclue.",
  "- Viewports certifiés : 390×844 / 430×932 / 768×900 / 1280×900.",
  "<!-- UI-ALL-PAGES-V1-CLOSEOUT-END -->",
].join("\n");

const start = "<!-- UI-ALL-PAGES-V1-CLOSEOUT-START -->";
const end = "<!-- UI-ALL-PAGES-V1-CLOSEOUT-END -->";
const s = text.indexOf(start);
const e = text.indexOf(end);

if (s >= 0 && e >= s) {
  text = `${text.slice(0, s)}${block}${text.slice(e + end.length)}`;
} else {
  const oldStart = text.indexOf("## Audit Toutes Pages — nouveau chantier");
  const oldEnd = text.indexOf("## Bibliothèque visuelle quartiers — Rabat", oldStart);
  if (oldStart >= 0 && oldEnd > oldStart) {
    text = `${text.slice(0, oldStart)}${block}\n\n${text.slice(oldEnd)}`;
  } else {
    const anchor = "`README.md` définit l’identité/doctrine. `docs/SESSION.md` porte le handover court. Ce fichier est l’unique roadmap.";
    const at = text.indexOf(anchor);
    if (at < 0) throw new Error("ROADMAP canonical anchor not found");
    const insertAt = at + anchor.length;
    text = `${text.slice(0, insertAt)}\n\n${block}${text.slice(insertAt)}`;
  }
}

writeFileSync(path, text);
