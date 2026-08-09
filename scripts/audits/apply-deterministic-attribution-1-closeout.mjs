import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, content) { fs.writeFileSync(path, content, "utf8"); }
function replaceOnce(path, source, before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected exactly one match, got ${count}`);
  return source.replace(before, after);
}

{
  const path = "README.md";
  let source = read(path);
  source = replaceOnce(
    path,
    source,
    "Prochaine étape UX/Search à formaliser : **attribution déterministe**.",
    "### DETERMINISTIC-ATTRIBUTION-1 ✅ PR #416\n\nLa provenance publique Search est désormais calculée par un resolver canonique fail-closed plutôt que rendue depuis des labels libres. Gateway dérive l'identité depuis `source_id` et la configuration source canonique ; les listings persistés utilisent les signaux structurés d'accès/display plus une allowlist de marques ; AkarInfo consomme le même resolver. Les noms bruts inconnus ne sont jamais réémis dans l'UI.\n\nCertification : head `ab4a05ec21434fb414628a181a11adddd68d8293`, **26/26 workflows exact-head verts**, preuve déterministe **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, 0 overflow, 0 prix tronqué et fixtures avec labels bruts empoisonnés sans fuite. Benchmark UX/Search Reviewer **PASS 9,4/10** (mobile 9,4 / desktop 9,3), Reviewer technique PASS (`4891678670`), Release Certifier GO (`4891679276`). Merge `80da5a2abf2d3a7d74dafa6c6043ffe7176929d7`.\n\nProchaine étape UX/Search à formaliser : **simplification des actions secondaires**."
  );
  write(path, source);
}

{
  const path = "docs/ROADMAP.md";
  let source = read(path);
  source = replaceOnce(
    path,
    source,
    "CONTEXUAL-VISUAL-ASSETS-1 ✅ PR #414 ; prochaine étape UX Search à formaliser = attribution déterministe",
    "CONTEXUAL-VISUAL-ASSETS-1 ✅ PR #414 ; DETERMINISTIC-ATTRIBUTION-1 ✅ PR #416 ; prochaine étape UX Search à formaliser = simplification des actions secondaires"
  );
  source = replaceOnce(
    path,
    source,
    "### Prochaine étape UX/Search\n\n**Attribution déterministe à formaliser** — aucun identifiant de LOT n’est créé tant que son contrat n’est pas verrouillé.",
    "## DETERMINISTIC-ATTRIBUTION-1 ✅ CLOSED — PR #416\n\nResponsabilité : **rendre l'attribution publique Search déterministe et fail-closed, sans exposer de labels source libres ni modifier les décisions métier**.\n\nRésultat certifié :\n\n- resolver canonique `lib/search/public-attribution.ts` partagé par la card Gateway, la card structurée et AkarInfo ;\n- Gateway : identité publique dérivée de `source_id → Search Gateway source config` ;\n- listings persistés : attribution dérivée des signaux structurés d'accès/display et d'une allowlist explicite de marques ;\n- source inconnue/non approuvée → libellé générique, jamais le texte brut reçu ;\n- predecessors Search Truth, Wording, Mobile Grid, UNIFIED et CONTEXTUAL réconciliés sans affaiblir leurs invariants ;\n- preuve Chromium déterministe **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** : 0 overflow, 0 prix tronqué, provenance avant action et 0 fuite des faux labels source injectés ;\n- **26/26 workflows exact-head verts** sur `ab4a05ec21434fb414628a181a11adddd68d8293` ;\n- Benchmark UX/Search Reviewer : **PASS 9,4/10** (mobile 9,4 / desktop 9,3) ; Reviewer technique PASS ; Release Certifier GO ;\n- merge `80da5a2abf2d3a7d74dafa6c6043ffe7176929d7`.\n\n### Prochaine étape UX/Search\n\n**Simplification des actions secondaires à formaliser** — aucun identifiant de LOT n’est créé tant que son contrat n’est pas verrouillé."
  );
  write(path, source);
}

{
  const path = "docs/SESSION.md";
  let source = read(path);
  source = replaceOnce(
    path,
    source,
    "**Lane UX/Search : SEARCH-UX-FAST-1 ✅ #390 ; SEARCH-WORDING-PURITY-1 ✅ #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ #394 ; PRICE-COVERAGE-RECOVERY-1 ✅ #395 ; RANKING-QUALITY-1 ✅ #403 production certifiée ; UNIFIED-LISTING-CARD-1 ✅ #407 ; CONTEXTUAL-VISUAL-ASSETS-1 ✅ #414 ; prochaine étape à formaliser = attribution déterministe**",
    "**Lane UX/Search : SEARCH-UX-FAST-1 ✅ #390 ; SEARCH-WORDING-PURITY-1 ✅ #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ #394 ; PRICE-COVERAGE-RECOVERY-1 ✅ #395 ; RANKING-QUALITY-1 ✅ #403 production certifiée ; UNIFIED-LISTING-CARD-1 ✅ #407 ; CONTEXTUAL-VISUAL-ASSETS-1 ✅ #414 ; DETERMINISTIC-ATTRIBUTION-1 ✅ #416 ; prochaine étape à formaliser = simplification des actions secondaires**"
  );
  source = replaceOnce(
    path,
    source,
    "Main canonique après CONTEXTUAL-VISUAL-ASSETS-1 : `ae3e254bcec3bb4e98b814b0f057141e84956d10` — merge PR #414. Le LOT n'introduit aucune migration ni write DATA ; preuve de release = exact-head `575f9510587cc244b2f1a3a6bf9aea7ad957fd83`, **24/24 workflows verts**, Chromium 4 viewports, Benchmark **9,3/10**, artefact `sha256:78cf4a742360b87683bd9697a465a15f898979b29dea9e384474baf8b0a7ca69`, présence du merge sur `main`.",
    "Main canonique après DETERMINISTIC-ATTRIBUTION-1 : `80da5a2abf2d3a7d74dafa6c6043ffe7176929d7` — merge PR #416. Le LOT n'introduit aucune migration ni write DATA ; preuve de release = exact-head `ab4a05ec21434fb414628a181a11adddd68d8293`, **26/26 workflows verts**, Chromium 5 viewports, Benchmark **9,4/10**, Reviewer technique `4891678670`, Release Certifier `4891679276`, présence du merge sur `main`."
  );
  source = replaceOnce(
    path,
    source,
    "- CONTEXTUAL-VISUAL-ASSETS-1 ✅ #414 — fallback ville exact/local → type reconnu → neutre, aucune inférence, Chromium 4 viewports, Benchmark PASS 9,3/10 ;",
    "- CONTEXTUAL-VISUAL-ASSETS-1 ✅ #414 — fallback ville exact/local → type reconnu → neutre, aucune inférence, Chromium 4 viewports, Benchmark PASS 9,3/10 ;\n- DETERMINISTIC-ATTRIBUTION-1 ✅ #416 — attribution publique centralisée, raw source labels interdits, 26/26 workflows, Chromium 5 viewports, Benchmark PASS 9,4/10 ;"
  );
  write(path, source);
}

console.log("DETERMINISTIC-ATTRIBUTION-1 docs closeout PASS");
