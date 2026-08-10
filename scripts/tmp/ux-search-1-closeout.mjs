import { readFile, writeFile } from "node:fs/promises";

const roadmapPath = "docs/ROADMAP.md";
const sessionPath = "docs/SESSION.md";

let roadmap = await readFile(roadmapPath, "utf8");
let session = await readFile(sessionPath, "utf8");

const roadmapStatusNeedle = "RABAT-REAL-PHOTO-LIBRARY-1 ✅ PR #468 ; BENCHMARK-SERP-1 convergence";
if (!roadmap.includes("UX-SEARCH-1 ✅ PR #479")) {
  if (!roadmap.includes(roadmapStatusNeedle)) throw new Error("ROADMAP status anchor missing");
  roadmap = roadmap.replace(
    roadmapStatusNeedle,
    "RABAT-REAL-PHOTO-LIBRARY-1 ✅ PR #468 ; UX-SEARCH-1 ✅ PR #479 ; BENCHMARK-SERP-1 convergence",
  );
}

const roadmapInsertAnchor = "Les 6 villes contextualisées disposent désormais chacune de **12 variantes = 72 IDs contextuels uniques**.";
const roadmapSection = `## UX-SEARCH-1 — Density First ✅ CLOSED — PR #479\n\nResponsabilité unique : **faire de /search un vrai moteur de scan immobilier à forte densité sur desktop sans dégrader le mobile**, sans modifier DATA, ranking, filtres métier, dédup, attribution ni logique Carte.\n\nRésultat certifié :\n\n- mobile **390×844 = 2 colonnes** conservées, 0 overflow ;\n- tablette **768×900 = 2 colonnes** conservées ;\n- desktop intermédiaire **1024×800 = 3 colonnes** ;\n- desktop large **1280×800 / 1440×900 = 4 colonnes** ;\n- à 1440×900 : **4 annonces complètes sur la première ligne + deuxième ligne significativement visible** ;\n- cartes liste desktop compactées à **381 px** de haut dans le scénario de certification ; gros CTA redondant retiré en mode Liste dense, tandis que image/titre restent des liens directs ;\n- prix, titre, localisation, facts, fraîcheur, provenance et informations de confiance restent visibles ;\n- mode Mixte conserve sa carte et son traitement lisible séparé ;\n- premier passage rejeté par le Product Design Reviewer : **474 px** par carte à 1280, densité insuffisante ; correction appliquée puis re-certification ;\n- exact-head **8e75bc8cf43bd094850c6dbf3453ff6f996d4954** : **23/23 workflows SUCCESS**, TypeScript PASS, build production PASS, Search Truth / Dedup / ODM / Accessibility PASS ;\n- `UX-SEARCH-1 Density First Certification` : Product Design Reviewer PASS + **Independent Release Certifier PASS** ;\n- audit visuel humain sur captures finales : **Density 9,6/10 ; Scan 9,4/10 ; Desktop 9,3/10 ; Mobile 9,4/10 ; global 9,4/10**.\n\n**Prochain lot UX/Search : UX-SEARCH-2 — Compact Search & Filters.** Réduire la surface recherche/filtres/modes/tri/compteur ; desktop compact de référence sur une ligne autant que possible, mobile = recherche compacte + filtres puis compteur + tri. Même règle : score UX cible **≥9/10** avant clôture.\n\n`;
if (!roadmap.includes("## UX-SEARCH-1 — Density First ✅ CLOSED — PR #479")) {
  if (!roadmap.includes(roadmapInsertAnchor)) throw new Error("ROADMAP insertion anchor missing");
  roadmap = roadmap.replace(roadmapInsertAnchor, `${roadmapSection}${roadmapInsertAnchor}`);
}

const oldRoadmapNext = "**Prochain lot UX/Search : CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1.** Audit read-only de la couverture de rendu réelle après #468 : thumbnail autorisée / **Rabat real-photo district** / `city_type` / `city` / fallback type / neutre, distribution ville/type/quartier, répétition effective et taux d'échec des photos distantes. Aucun nouvel asset ni changement DATA/Registry/ranking/Map. Le district du catalogue d'illustrations historique reste OFF ; le signal quartier est utilisé uniquement par la bibliothèque Rabat bornée.";
const newRoadmapQueued = "**CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1 reste en file UX/Search read-only**, après la séquence de convergence Search en cours : mesurer thumbnail autorisée / Rabat real-photo district / `city_type` / `city` / fallback type / neutre, répétition effective et taux d'échec distant avant tout nouvel asset. Aucun changement DATA/Registry/ranking/Map.";
if (roadmap.includes(oldRoadmapNext)) roadmap = roadmap.replace(oldRoadmapNext, newRoadmapQueued);

const sessionInsertAnchor = "- Rabat real-photo : **40 vraies photos = 8 × Agdal/Hay Riad/Souissi/Océan/Hassan** ; bibliothèque séparée, activation uniquement sur signal `listing.neighborhood` structuré + `fallback_visual`, sans inférence texte.";
const sessionBullet = "- `UX-SEARCH-1 — Density First` ✅ PR #479 : exact-head `8e75bc8cf43bd094850c6dbf3453ff6f996d4954`, **23/23 workflows SUCCESS**, Product Design Reviewer PASS après un premier rejet à 474 px/card, Independent Release Certifier PASS ; final = mobile 2 cols, tablette 2, 1024 px 3, 1280/1440 px 4, cartes desktop 381 px, 0 overflow ; audit visuel global **9,4/10**.";
if (!session.includes("`UX-SEARCH-1 — Density First` ✅ PR #479")) {
  if (!session.includes(sessionInsertAnchor)) throw new Error("SESSION insertion anchor missing");
  session = session.replace(sessionInsertAnchor, `${sessionInsertAnchor}\n${sessionBullet}`);
}

const oldSessionNext = "- Prochain LOT UX/Search : **CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1**, read-only ; mesurer couverture/répétition réelle **après #468**, y compris le tier Rabat real-photo et son taux d'échec distant, avant tout nouvel asset. Le district du catalogue d'illustrations historique reste OFF.";
const newSessionNext = "- Prochain LOT UX/Search : **UX-SEARCH-2 — Compact Search & Filters** ; réduire recherche/filtres/modes/tri/compteur, avec desktop compact et mobile recherche compacte + filtres puis compteur + tri. Gate : **≥9/10** avant clôture. `CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1` reste queued en read-only après la séquence de convergence Search.";
if (session.includes(oldSessionNext)) session = session.replace(oldSessionNext, newSessionNext);

const uxSectionAnchor = "## UX/Search — illustrations contextuelles + Rabat real-photo certifiées ✅";
if (session.includes(uxSectionAnchor) && !session.includes("## UX/Search — Density First certifié ✅")) {
  const densitySection = `## UX/Search — Density First certifié ✅\n\n- PR **#479**, exact-head **8e75bc8cf43bd094850c6dbf3453ff6f996d4954**.\n- Premier Product Design gate : rejet légitime à **474 px/card** sur 1280 ; compactage repris.\n- Final : **390=2 cols / 768=2 / 1024=3 / 1280=4 / 1440=4** ; desktop cards **381 px** ; deuxième ligne visible dès 1024 et sur desktop large ; 0 overflow.\n- Informations de confiance/source conservées ; suppression du gros CTA redondant uniquement en Liste dense ; Mixte non altéré.\n- **23/23 workflows exact-head SUCCESS** ; Product Design Reviewer PASS ; Independent Release Certifier PASS.\n- Audit final : **Density 9,6 / Scan 9,4 / Desktop 9,3 / Mobile 9,4 / Global 9,4**.\n- Prochain : **UX-SEARCH-2 — Compact Search & Filters**.\n\n`;
  session = session.replace(uxSectionAnchor, `${densitySection}${uxSectionAnchor}`);
}

const oldOtherLane = "- UX/Search : `CONTEXTUAL-ILLUSTRATIONS-SCALE-2` ✅ #453 + `RABAT-REAL-PHOTO-LIBRARY-1` ✅ #468 ; prochain LOT = **CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1** read-only ; Search reste canonique.";
const newOtherLane = "- UX/Search : `UX-SEARCH-1 — Density First` ✅ #479 après double certification ; prochain LOT = **UX-SEARCH-2 — Compact Search & Filters** ; `CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1` reste queued read-only ; Search reste canonique.";
if (session.includes(oldOtherLane)) session = session.replace(oldOtherLane, newOtherLane);

await writeFile(roadmapPath, roadmap, "utf8");
await writeFile(sessionPath, session, "utf8");
console.log("UX-SEARCH-1 closeout docs updated");
