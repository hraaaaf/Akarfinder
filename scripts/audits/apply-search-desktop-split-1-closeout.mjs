import { readFileSync, writeFileSync } from "node:fs";

function replaceExact(path, from, to) {
  const source = readFileSync(path, "utf8");
  if (!source.includes(from)) throw new Error(`${path}: closeout marker not found`);
  const next = source.replace(from, to);
  writeFileSync(path, next, "utf8");
}

const certification = `### SEARCH-DESKTOP-SPLIT-1 ✅ PR #423\n\nDernier lot de convergence BENCHMARK-SERP-1 : le mode \`Mixte\` desktop est désormais un vrai split **résultats + carte**, sans réintroduire les blocs secondaires \`Mon Projet AkarFinder\` et \`Ouvrir la carte complète\` dans la colonne Map. Mobile/tablette restent empilés et inchangés ; \`Liste\` et \`Carte\` conservent leurs contrats fonctionnels. Aucun changement ranking, filtres, éligibilité, ordre commercial, DATA, attribution ou état URL.\n\nCertification : head \`29b469e17eff6f4516bef18f7d5ed193726308f0\`, **26/26 workflows exact-head verts**, gate spécialisé contrat + predecessors + TypeScript + build + Chromium PASS. Preuve **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** : mobile/tablette empilés, desktop **654/558 px** puis **741/631 px** résultats/carte, **0 bloc secondaire desktop**, **0 overflow horizontal**, **0 prix tronqué**. Benchmark UX/Search Reviewer **PASS 9,5/10**, Reviewer technique PASS, Release Certifier GO. Artefact \`sha256:9811f9b4a62b8b571ff977953f240e3be5ac17fad41cf3ef87d8d8b30feedf8c\`. Merge \`6bcf402158539c547061a6a92d1b408df1da8d22\`.\n\n**BENCHMARK-SERP-1 — séquence de convergence terminée ✅.** Toute nouvelle évolution UX/Search doit désormais être formalisée comme un nouveau lot, avec benchmark et contrat propres.\n`;

replaceExact(
  "README.md",
  "Prochaine et dernière étape benchmark UX/Search à formaliser : **split Liste / Carte desktop sans surcharge**.\n",
  `${certification}\n`
);

replaceExact(
  "docs/ROADMAP.md",
  "SEARCH-ACTION-HIERARCHY-1 ✅ PR #418 ; prochaine et dernière étape benchmark UX Search à formaliser = split Liste / Carte desktop sans surcharge ; couche Offre quartier OFF",
  "SEARCH-ACTION-HIERARCHY-1 ✅ PR #418 ; SEARCH-DESKTOP-SPLIT-1 ✅ PR #423 ; BENCHMARK-SERP-1 convergence ✅ COMPLETE ; couche Offre quartier OFF"
);

replaceExact(
  "docs/ROADMAP.md",
  "### Prochaine étape UX/Search\n\n**Split Liste / Carte desktop sans surcharge à formaliser** — dernier chantier du benchmark SERP ; aucun identifiant de LOT n’est créé tant que son contrat n’est pas verrouillé.\n",
  `## SEARCH-DESKTOP-SPLIT-1 ✅ CLOSED — PR #423\n\nResponsabilité unique : **simplifier le mode Mixte desktop en un vrai split résultats + carte sans surcharge secondaire**, tout en conservant mobile/tablette, Liste, Carte, ranking, filtres, ordre commercial, DATA, attribution et état URL.\n\nRésultat certifié :\n\n- desktop Mixte = deux panes utiles ; les blocs secondaires Mon Projet / carte complète ne sont plus affichés dans cette vue ;\n- mobile/tablette restent empilés avec leurs contenus existants ;\n- Liste et Carte conservent leurs contrats fonctionnels ;\n- Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** : 0 overflow, 0 prix tronqué ; desktop **654/558 px** puis **741/631 px**, 0 bloc secondaire ;\n- **26/26 workflows exact-head verts** sur \`29b469e17eff6f4516bef18f7d5ed193726308f0\` ;\n- Benchmark UX/Search Reviewer **PASS 9,5/10** ; Reviewer technique PASS ; Release Certifier GO ;\n- merge \`6bcf402158539c547061a6a92d1b408df1da8d22\`, artefact \`sha256:9811f9b4a62b8b571ff977953f240e3be5ac17fad41cf3ef87d8d8b30feedf8c\`.\n\n**BENCHMARK-SERP-1 convergence = COMPLETE ✅.** Aucun nouveau lot UX/Search n’est pré-engagé dans cette roadmap ; le prochain chantier devra être formalisé séparément.\n`
);

replaceExact(
  "docs/SESSION.md",
  "SEARCH-ACTION-HIERARCHY-1 ✅ #418 ; prochaine et dernière étape benchmark à formaliser = split Liste / Carte desktop sans surcharge",
  "SEARCH-ACTION-HIERARCHY-1 ✅ #418 ; SEARCH-DESKTOP-SPLIT-1 ✅ #423 ; BENCHMARK-SERP-1 convergence ✅ COMPLETE"
);

replaceExact(
  "docs/SESSION.md",
  "Main canonique après P1B.6 : `304726a83e1ef4df5ddacb8ecba925ad2e1c1b30` — merge PR #424. P1B.6 est strictement read-only ; exact-head `311b00bb5d0273f04b4405395e5eb5be13050045`, **19/19 workflows verts**, specialized live gate PASS, Reviewer **9,6/10**, post-merge gate PASS.\n",
  "Main canonique après SEARCH-DESKTOP-SPLIT-1 : `6bcf402158539c547061a6a92d1b408df1da8d22` — merge PR #423. Head certifié `29b469e17eff6f4516bef18f7d5ed193726308f0`, **26/26 workflows exact-head verts**, Chromium 5 viewports PASS, Benchmark UX/Search Reviewer **9,5/10**, Reviewer PASS, Certifier GO. P1B.6 reste acquis et strictement read-only.\n"
);

replaceExact(
  "docs/SESSION.md",
  "- SEARCH-ACTION-HIERARCHY-1 ✅ #418 — une action forte par card tablette/desktop, Map/Compare retirés de la card mais capacités globales conservées, 24/24 workflows, Chromium 5 viewports, Benchmark PASS 9,5/10 ;\n",
  "- SEARCH-ACTION-HIERARCHY-1 ✅ #418 — une action forte par card tablette/desktop, Map/Compare retirés de la card mais capacités globales conservées, 24/24 workflows, Chromium 5 viewports, Benchmark PASS 9,5/10 ;\n- SEARCH-DESKTOP-SPLIT-1 ✅ #423 — desktop Mixte = résultats + carte sans blocs secondaires, mobile/tablette inchangés, 26/26 workflows, Chromium 5 viewports, Benchmark PASS 9,5/10, merge `6bcf402158539c547061a6a92d1b408df1da8d22` ;\n"
);

console.log("SEARCH-DESKTOP-SPLIT-1 docs closeout applied");
