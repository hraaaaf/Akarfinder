import fs from "node:fs";

function replaceExact(path, source, before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected exactly one match, got ${count}`);
  return source.replace(before, after);
}

{
  const path = "README.md";
  let s = fs.readFileSync(path, "utf8");
  s = replaceExact(path, s,
    "Prochaine étape UX/Search à formaliser : **simplification des actions secondaires**.",
    `### SEARCH-ACTION-HIERARCHY-1 ✅ PR #418\n\nLa hiérarchie d’actions des cards Search a été simplifiée sans modifier ranking, priorité commerciale, éligibilité, DATA, attribution ou état Map. Sur tablette/desktop, une card interne expose désormais une seule action forte \`Voir le bien\`; les contrôles dédiés \`Repérer sur la carte\` et \`Comparer\` ont été retirés de la card, tandis que la continuité Search↔Map par hover/focus et le comparateur global restent disponibles. Lorsqu’une source originale existe, elle reste accessible comme lien discret de provenance au lieu d’un deuxième gros CTA. Mobile reste compact et inchangé.\n\nCertification : head \`a7ddb7d023eac1418eee50e03258f1d056184b64\`, **24/24 workflows exact-head verts**, Chromium déterministe **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900**, 0 overflow, 0 ancien CTA Map/Compare, 0 prix mobile tronqué. Benchmark UX/Search Reviewer **PASS 9,5/10** (mobile 9,6 / tablette 9,5 / desktop 9,5), Reviewer PASS, Release Certifier GO. Artefact visuel \`sha256:c9ec64465039168a44c81b8921ff0ac7e57ab7a25e65a54f91f06f480805a66f\`. Merge \`0987b89286d262e7d01ec8e3a868b2424d85c4d5\`.\n\nProchaine et dernière étape benchmark UX/Search à formaliser : **split Liste / Carte desktop sans surcharge**.`
  );
  fs.writeFileSync(path, s, "utf8");
}

{
  const path = "docs/ROADMAP.md";
  let s = fs.readFileSync(path, "utf8");
  s = replaceExact(path, s,
    "DETERMINISTIC-ATTRIBUTION-1 ✅ PR #416 ; prochaine étape UX Search à formaliser = simplification des actions secondaires",
    "DETERMINISTIC-ATTRIBUTION-1 ✅ PR #416 ; SEARCH-ACTION-HIERARCHY-1 ✅ PR #418 ; prochaine et dernière étape benchmark UX Search à formaliser = split Liste / Carte desktop sans surcharge"
  );
  s = replaceExact(path, s,
    `### Prochaine étape UX/Search\n\n**Simplification des actions secondaires à formaliser** — aucun identifiant de LOT n’est créé tant que son contrat n’est pas verrouillé.`,
    `## SEARCH-ACTION-HIERARCHY-1 ✅ CLOSED — PR #418\n\nResponsabilité : **réduire la concurrence entre actions dans les cards Search sans retirer les capacités globales de comparaison ou de continuité Search↔Map**.\n\nRésultat certifié :\n\n- mobile conservé compact, sans nouveau CTA ;\n- tablette/desktop : **1 CTA fort maximum par card** ;\n- card interne : \`Voir le bien\` reste l’action principale ;\n- \`Repérer sur la carte\` et le toggle \`Comparer\` sont retirés de la card ; le comparateur global et le shared selection context restent actifs ;\n- hover/focus card → Map reste actif, sans modifier ranking ni sélection métier ;\n- source originale disponible → lien discret dans la provenance au lieu d’un deuxième gros bouton ;\n- card externe observée conserve une seule action forte vers l’annonce originale ; Gateway inchangé ;\n- Chromium **360×800 / 390×844 / 768×900 / 1280×900 / 1440×900** : 0 overflow, 0 ancien CTA Map/Compare, mobile 0 prix tronqué ;\n- **24/24 workflows exact-head verts** sur \`a7ddb7d023eac1418eee50e03258f1d056184b64\` ;\n- Benchmark UX/Search Reviewer : **PASS 9,5/10** (mobile 9,6 / tablette 9,5 / desktop 9,5) ; Reviewer technique PASS ; Release Certifier GO ;\n- merge \`0987b89286d262e7d01ec8e3a868b2424d85c4d5\`, artefact \`sha256:c9ec64465039168a44c81b8921ff0ac7e57ab7a25e65a54f91f06f480805a66f\`.\n\n### Prochaine étape UX/Search\n\n**Split Liste / Carte desktop sans surcharge à formaliser** — dernier chantier du benchmark SERP ; aucun identifiant de LOT n’est créé tant que son contrat n’est pas verrouillé.`
  );
  fs.writeFileSync(path, s, "utf8");
}

{
  const path = "docs/SESSION.md";
  let s = fs.readFileSync(path, "utf8");
  s = replaceExact(path, s,
    "DETERMINISTIC-ATTRIBUTION-1 ✅ #416 ; prochaine étape à formaliser = simplification des actions secondaires",
    "DETERMINISTIC-ATTRIBUTION-1 ✅ #416 ; SEARCH-ACTION-HIERARCHY-1 ✅ #418 ; prochaine et dernière étape benchmark à formaliser = split Liste / Carte desktop sans surcharge"
  );
  s = replaceExact(path, s,
    "Main canonique après DETERMINISTIC-ATTRIBUTION-1 : `80da5a2abf2d3a7d74dafa6c6043ffe7176929d7` — merge PR #416. Le LOT n'introduit aucune migration ni write DATA ; preuve de release = exact-head `ab4a05ec21434fb414628a181a11adddd68d8293`, **26/26 workflows verts**, Chromium 5 viewports, Benchmark **9,4/10**, Reviewer technique `4891678670`, Release Certifier `4891679276`, présence du merge sur `main`.",
    "Main canonique après SEARCH-ACTION-HIERARCHY-1 : `0987b89286d262e7d01ec8e3a868b2424d85c4d5` — merge PR #418. Le LOT n'introduit aucune migration ni write DATA ; preuve de release = exact-head `a7ddb7d023eac1418eee50e03258f1d056184b64`, **24/24 workflows verts**, Chromium 5 viewports, Benchmark **9,5/10**, Reviewer technique PASS, Release Certifier GO, présence du merge sur `main`."
  );
  s = replaceExact(path, s,
    "- DETERMINISTIC-ATTRIBUTION-1 ✅ #416 — attribution publique centralisée, raw source labels interdits, 26/26 workflows, Chromium 5 viewports, Benchmark PASS 9,4/10 ;",
    "- DETERMINISTIC-ATTRIBUTION-1 ✅ #416 — attribution publique centralisée, raw source labels interdits, 26/26 workflows, Chromium 5 viewports, Benchmark PASS 9,4/10 ;\n- SEARCH-ACTION-HIERARCHY-1 ✅ #418 — une action forte par card tablette/desktop, Map/Compare retirés de la card mais capacités globales conservées, 24/24 workflows, Chromium 5 viewports, Benchmark PASS 9,5/10 ;"
  );
  fs.writeFileSync(path, s, "utf8");
}

console.log("SEARCH-ACTION-HIERARCHY-1 closeout PASS");
