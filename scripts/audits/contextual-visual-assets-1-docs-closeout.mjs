import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(path, from, to) {
  const source = readFileSync(path, "utf8");
  const first = source.indexOf(from);
  if (first < 0) throw new Error(`${path}: marker not found`);
  if (source.indexOf(from, first + from.length) >= 0) throw new Error(`${path}: marker is not unique`);
  writeFileSync(path, source.replace(from, to), "utf8");
}

const head = "575f9510587cc244b2f1a3a6bf9aea7ad957fd83";
const merge = "ae3e254bcec3bb4e98b814b0f057141e84956d10";
const artifact = "sha256:78cf4a742360b87683bd9697a465a15f898979b29dea9e384474baf8b0a7ca69";

replaceOnce(
  "README.md",
  "Prochain lot UX/Search séparé : **CONTEXTUAL-VISUAL-ASSETS-1**.",
  `### CONTEXTUAL-VISUAL-ASSETS-1 ✅ PR #414\n\nLes résultats Gateway sans thumbnail autorisée utilisent désormais un fallback contextuel déterministe et truth-safe : thumbnail autorisée d’abord ; sinon illustration de ville uniquement sur \`normalized_city\` exact et allowlist locale ; sinon artwork du type normalisé reconnu ; sinon état neutre \`Annonce indexée\`. Aucun parsing titre/snippet, fuzzy matching, hasard, réseau ou lookup d’image externe.\n\nCertification : head \`${head}\`, **24/24 workflows exact-head verts**, Property Type Visual Option A + UNIFIED predecessor + Search Truth + TypeScript + build PASS. Chromium **360×800 / 390×844 / 768×900 / 1280×900** : 0 label tronqué, 0 prix tronqué, 0 overflow horizontal. Benchmark UX/Search Reviewer **PASS 9,3/10**, Reviewer PASS, Release Certifier GO. Artefact visuel \`${artifact}\`. Merge \`${merge}\`.\n\nProchaine étape UX/Search à formaliser : **attribution déterministe**.`
);

replaceOnce(
  "docs/ROADMAP.md",
  "**Statut : UX/Carte P1B.4 ✅ production certifiée ; BENCHMARK-SERP-1 ✅ ; SEARCH-UX-FAST-1 ✅ PR #390 ; SEARCH-WORDING-PURITY-1 ✅ PR #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ PR #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ PR #394 ; PRICE-COVERAGE-RECOVERY-1 ✅ PR #395 ; RANKING-QUALITY-1 ✅ PR #403 production certifiée ; UNIFIED-LISTING-CARD-1 ✅ PR #407 ; prochain lot UX Search = CONTEXTUAL-VISUAL-ASSETS-1 ; couche Offre quartier OFF ; DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 ✅ ; P0.4 ✅ ; P0.5 Registry Activation Readiness Gate ✅ CLOSED ; freshness reconciler hardening ✅ PR #396**",
  "**Statut : UX/Carte P1B.4 ✅ production certifiée ; BENCHMARK-SERP-1 ✅ ; SEARCH-UX-FAST-1 ✅ PR #390 ; SEARCH-WORDING-PURITY-1 ✅ PR #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ PR #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ PR #394 ; PRICE-COVERAGE-RECOVERY-1 ✅ PR #395 ; RANKING-QUALITY-1 ✅ PR #403 production certifiée ; UNIFIED-LISTING-CARD-1 ✅ PR #407 ; CONTEXTUAL-VISUAL-ASSETS-1 ✅ PR #414 ; prochaine étape UX Search à formaliser = attribution déterministe ; couche Offre quartier OFF ; DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 ✅ ; P0.4 ✅ ; P0.5 Registry Activation Readiness Gate ✅ CLOSED ; freshness reconciler hardening ✅ PR #396**"
);

replaceOnce(
  "docs/ROADMAP.md",
  "### Prochains lots UX/Search — ordre strict\n\n1. **CONTEXTUAL-VISUAL-ASSETS-1** — visuels contextuels déterministes et truth-safe.",
  `## CONTEXTUAL-VISUAL-ASSETS-1 ✅ CLOSED — PR #414\n\nResponsabilité : améliorer les fallbacks visuels des résultats Gateway sans photo autorisée, sans fabriquer de représentation du bien et sans modifier les décisions métier.\n\nRésultat certifié :\n\n- thumbnail provider autorisée reste prioritaire ;\n- contexte ville uniquement depuis \`normalized_city\` exact, allowlist locale Agadir/Casablanca/Fès/Marrakech/Rabat/Tanger ;\n- aucune inférence depuis titre/snippet/description, aucun fuzzy, hasard, fetch réseau ou lookup externe ;\n- ville non reconnue + type reconnu → \`PropertyTypeArtwork\` existant ; contexte absent → état neutre \`Annonce indexée\` ;\n- disclosure permanente : \`Illustration\` sur mobile, \`Visuel illustratif · Ville\` sur tablette/desktop ;\n- finding 360 px corrigé avant certification : aucun label illustratif tronqué ;\n- Chromium **360×800 / 390×844 / 768×900 / 1280×900** : 0 label tronqué, 0 prix tronqué, 0 overflow horizontal ;\n- gate permanent \`CONTEXTUAL-VISUAL-ASSETS-1 Gate\` : truth contract + UNIFIED predecessor + Search Truth + TypeScript + build + Chromium ;\n- **24/24 workflows exact-head verts** sur \`${head}\` ;\n- Benchmark UX/Search Reviewer : **PASS 9,3/10** ; Reviewer PASS ; Release Certifier GO ;\n- merge \`${merge}\`, artefact \`${artifact}\`.\n\n### Prochaine étape UX/Search\n\n**Attribution déterministe à formaliser** — aucun identifiant de LOT n’est créé tant que son contrat n’est pas verrouillé.`
);

replaceOnce(
  "docs/SESSION.md",
  "**Lane UX/Search : SEARCH-UX-FAST-1 ✅ #390 ; SEARCH-WORDING-PURITY-1 ✅ #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ #394 ; PRICE-COVERAGE-RECOVERY-1 ✅ #395 ; RANKING-QUALITY-1 ✅ #403 production certifiée ; UNIFIED-LISTING-CARD-1 ✅ #407 ; prochain lot = CONTEXTUAL-VISUAL-ASSETS-1**  ",
  "**Lane UX/Search : SEARCH-UX-FAST-1 ✅ #390 ; SEARCH-WORDING-PURITY-1 ✅ #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ #394 ; PRICE-COVERAGE-RECOVERY-1 ✅ #395 ; RANKING-QUALITY-1 ✅ #403 production certifiée ; UNIFIED-LISTING-CARD-1 ✅ #407 ; CONTEXTUAL-VISUAL-ASSETS-1 ✅ #414 ; prochaine étape à formaliser = attribution déterministe**  "
);

replaceOnce(
  "docs/SESSION.md",
  "Main canonique après UNIFIED-LISTING-CARD-1 : `7ad1b7af2a0e7dc268b0b3ea032e083f7ccbb193` — merge PR #407. Le LOT n'introduit aucune migration ni write DATA ; le gate spécialisé est PR-only, donc la preuve de release est l'exact-head PR certifié + la présence du merge sur `main`.",
  `Main canonique après CONTEXTUAL-VISUAL-ASSETS-1 : \`${merge}\` — merge PR #414. Le LOT n'introduit aucune migration ni write DATA ; preuve de release = exact-head \`${head}\`, **24/24 workflows verts**, Chromium 4 viewports, Benchmark **9,3/10**, artefact \`${artifact}\`, présence du merge sur \`main\`.`
);

replaceOnce(
  "docs/SESSION.md",
  "- UNIFIED-LISTING-CARD-1 ✅ #407 — card Gateway alignée sur la grammaire canonique, preuve visuelle 4 viewports, 0 overflow/prix tronqué, Benchmark PASS 9,2/10 ;",
  "- UNIFIED-LISTING-CARD-1 ✅ #407 — card Gateway alignée sur la grammaire canonique, preuve visuelle 4 viewports, 0 overflow/prix tronqué, Benchmark PASS 9,2/10 ;\n- CONTEXTUAL-VISUAL-ASSETS-1 ✅ #414 — fallback ville exact/local → type reconnu → neutre, aucune inférence, Chromium 4 viewports, Benchmark PASS 9,3/10 ;"
);

replaceOnce(
  "docs/SESSION.md",
  "- prochain lot : **CONTEXTUAL-VISUAL-ASSETS-1** uniquement.",
  `- CONTEXTUAL-VISUAL-ASSETS-1 ✅ #414 — head \`${head}\`, **24/24 workflows exact-head verts**, Chromium 4 viewports, Benchmark **9,3/10**, merge \`${merge}\` ;\n- prochaine étape : **attribution déterministe à formaliser**, sans identifiant de LOT inventé.`
);

console.log(JSON.stringify({ lot: "CONTEXTUAL-VISUAL-ASSETS-1", head, merge, artifact, files: ["README.md", "docs/ROADMAP.md", "docs/SESSION.md"] }, null, 2));
