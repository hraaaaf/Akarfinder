import { readFileSync, writeFileSync } from "node:fs";

function replaceExact(path, before, after) {
  const current = readFileSync(path, "utf8");
  if (!current.includes(before)) {
    throw new Error(`${path}: closeout marker not found`);
  }
  if (current.indexOf(before) !== current.lastIndexOf(before)) {
    throw new Error(`${path}: closeout marker is not unique`);
  }
  writeFileSync(path, current.replace(before, after), "utf8");
}

const head = "6ddde621f03ccca1f25b8dc5dd34fdded090044b";
const merge = "7ad1b7af2a0e7dc268b0b3ea032e083f7ccbb193";
const artifact = "sha256:784182dd2c8d4f5eca46e907eeedd38493e0f63d586bd99151010fae6b3e542b";

replaceExact(
  "README.md",
  "Prochain lot UX/Search séparé : **UNIFIED-LISTING-CARD-1**.",
  `### UNIFIED-LISTING-CARD-1 ✅ PR #407\n\nLa card Gateway/externe a été alignée sur la grammaire canonique \`IMAGE → PRIX → TITRE → LOCALISATION → FACTS → PROVENANCE → ACTION\`, sans modifier ranking, priorité commerciale, éligibilité, acquisition, Source Registry, policy thumbnails ou schéma. Les états inconnus restent explicites et truth-safe : \`Prix non communiqué\`, \`Localisation non précisée\`, \`Informations à compléter\`.\n\nCertification : head \`${head}\`, **23/23 workflows PR verts**, gate spécialisé contrat + Search Truth + TypeScript + build PASS, Chromium déterministe **360×800 / 390×844 / 768×900 / 1280×900**, 0 overflow, 0 prix tronqué. Benchmark UX/Search Reviewer **PASS 9,2/10**, Reviewer PASS, Release Certifier GO. Artefact visuel \`${artifact}\`. Merge \`${merge}\`.\n\nProchain lot UX/Search séparé : **CONTEXTUAL-VISUAL-ASSETS-1**.`
);

replaceExact(
  "docs/ROADMAP.md",
  "RANKING-QUALITY-1 ✅ PR #403 production certifiée ; prochain lot UX Search = UNIFIED-LISTING-CARD-1 ;",
  "RANKING-QUALITY-1 ✅ PR #403 production certifiée ; UNIFIED-LISTING-CARD-1 ✅ PR #407 ; prochain lot UX Search = CONTEXTUAL-VISUAL-ASSETS-1 ;"
);

replaceExact(
  "docs/ROADMAP.md",
  `### Prochains lots UX/Search — ordre strict\n\n1. **UNIFIED-LISTING-CARD-1** — grammaire unique des cards ;\n2. **CONTEXTUAL-VISUAL-ASSETS-1** — visuels contextuels déterministes et truth-safe.`,
  `## UNIFIED-LISTING-CARD-1 ✅ CLOSED — PR #407\n\nResponsabilité : unifier la hiérarchie visible des résultats Gateway/externes avec la card Search canonique, sans changer ranking, ordre commercial, éligibilité, acquisition, publication, Source Registry ni policy thumbnails.\n\nRésultat certifié :\n\n- grammaire \`IMAGE → PRIX → TITRE → LOCALISATION → FACTS → PROVENANCE → ACTION\` ;\n- états inconnus explicites, sans donnée fabriquée ;\n- \`Source externe\`, prudence de comparaison et CTA vers la source originale conservés ;\n- fallback visuel déterministe : thumbnail autorisée, sinon artwork type de bien connu, sinon visuel neutre ;\n- finding mobile corrigé avant certification : \`Prix non communiqué\` reste entièrement lisible à 360 px ;\n- preuve Chromium dédiée : **360×800 / 390×844 / 768×900 / 1280×900**, 0 overflow, 0 prix tronqué, provenance avant action ;\n- gate permanent \`UNIFIED-LISTING-CARD-1 Gate\` : contrat + Search Truth + TypeScript + build + preuve visuelle externe ;\n- **23/23 workflows PR verts** sur \`${head}\` ;\n- Benchmark UX/Search Reviewer : **PASS 9,2/10** ; Reviewer PASS ; Release Certifier GO ;\n- merge \`${merge}\`, artefact \`${artifact}\`.\n\n### Prochains lots UX/Search — ordre strict\n\n1. **CONTEXTUAL-VISUAL-ASSETS-1** — visuels contextuels déterministes et truth-safe.`
);

replaceExact(
  "docs/SESSION.md",
  "**Lane UX/Search : SEARCH-UX-FAST-1 ✅ #390 ; SEARCH-WORDING-PURITY-1 ✅ #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ #394 ; PRICE-COVERAGE-RECOVERY-1 ✅ #395 ; RANKING-QUALITY-1 ✅ #403 production certifiée ; prochain lot = UNIFIED-LISTING-CARD-1**",
  "**Lane UX/Search : SEARCH-UX-FAST-1 ✅ #390 ; SEARCH-WORDING-PURITY-1 ✅ #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ #394 ; PRICE-COVERAGE-RECOVERY-1 ✅ #395 ; RANKING-QUALITY-1 ✅ #403 production certifiée ; UNIFIED-LISTING-CARD-1 ✅ #407 ; prochain lot = CONTEXTUAL-VISUAL-ASSETS-1**"
);

replaceExact(
  "docs/SESSION.md",
  "Main canonique après DATA-4.5A : `a4710d6f5a88218db7d0751adb775a145a8b04d2` — merge PR #410 ; post-merge DATA-4.5A gate PASS.",
  `Main canonique après UNIFIED-LISTING-CARD-1 : \`${merge}\` — merge PR #407. Le LOT n'introduit aucune migration ni write DATA ; le gate spécialisé est PR-only, donc la preuve de release est l'exact-head PR certifié + la présence du merge sur \`main\`.`
);

replaceExact(
  "docs/SESSION.md",
  "- RANKING-QUALITY-1 ✅ #403 — 14 007 rows stale resynchronisées, policy drift production = 0, Ranking V2 inchangé ;",
  `- RANKING-QUALITY-1 ✅ #403 — 14 007 rows stale resynchronisées, policy drift production = 0, Ranking V2 inchangé ;\n- UNIFIED-LISTING-CARD-1 ✅ #407 — card Gateway alignée sur la grammaire canonique, preuve visuelle 4 viewports, 0 overflow/prix tronqué, Benchmark PASS 9,2/10 ;`
);

replaceExact(
  "docs/SESSION.md",
  `- RANKING-QUALITY-1 ✅ #403 — production certifiée, \`policy_drift_rows=0\`, 15 438 LISTING publics ;\n- prochain lot : **UNIFIED-LISTING-CARD-1** uniquement.\n\nPuis : \`CONTEXTUAL-VISUAL-ASSETS-1\`.`,
  `- RANKING-QUALITY-1 ✅ #403 — production certifiée, \`policy_drift_rows=0\`, 15 438 LISTING publics ;\n- UNIFIED-LISTING-CARD-1 ✅ #407 — head \`${head}\`, **23/23 workflows PR verts**, Chromium 4 viewports, Benchmark **9,2/10**, merge \`${merge}\` ;\n- prochain lot : **CONTEXTUAL-VISUAL-ASSETS-1** uniquement.`
);

console.log(JSON.stringify({
  lot: "UNIFIED-LISTING-CARD-1",
  head,
  merge,
  next: "CONTEXTUAL-VISUAL-ASSETS-1",
  files: ["README.md", "docs/ROADMAP.md", "docs/SESSION.md"],
}, null, 2));
