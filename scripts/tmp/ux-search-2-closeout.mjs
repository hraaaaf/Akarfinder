import { readFile, writeFile } from "node:fs/promises";

const roadmapPath = "docs/ROADMAP.md";
const sessionPath = "docs/SESSION.md";
const head = "7226fe892d109c847dd704a73dc90b013ef4fb31";
const run = "31438758126";

const block = `<!-- UX-SEARCH-2-CLOSEOUT-START -->
## UX-SEARCH-2 — Compact Search & Filters ✅ CERTIFIED — PR #480

Responsabilité unique : **réduire la hauteur et la fragmentation des contrôles avant l’inventaire sur /search**, sans modifier DATA, ranking, Source Registry, dédup, prix, ordre commercial ni logique Map.

Résultat certifié :

- mobile **360×800 / 390×844** : recherche + Filtres sur **une seule ligne de 48 px**, puis compteur + vue + tri sur une seule barre compacte ;
- transaction mobile/tablette reste intégralement accessible dans le panneau Filtres ; desktop conserve Acheter / Louer / Neuf directement sur la ligne primaire ;
- mobile : modes Liste/Mixte/Carte passent par un select compact **48 px** au lieu de l’ancien segmented control sticky ;
- première annonce à **240 px** sur 360/390, contre **347 px** au début de UX-SEARCH-1 ;
- tablette 768 : première annonce **252 px** ; desktop 1024/1280/1440 : première annonce **250 px** ;
- contrat de densité UX-SEARCH-1 préservé : **390=2 colonnes / 768=2 / 1024=3 / 1280=4 / 1440=4** ;
- quick filters fermés : **48 px mobile/tablette, 46 px desktop** ; toolbar résultats : **59 px mobile, 61 px tablette/desktop** ;
- touch targets critiques mobile recherche / filtres / vue / tri = **48 px** ;
- **0 overflow horizontal** sur les 6 viewports ; aucune information de confiance/source retirée ;
- les anciens contrats Search/A11y/Mobile ont été réconciliés avec le nouveau pattern sans affaiblir leur intention : états ARIA conservés, bottom sheet safe-area conservée, Option A reste derrière Filtres ;
- exact-head comportemental ${head} : **31 workflows SUCCESS** ; Search Truth, dedup, accessibility, mobile ergonomics, SEARCH-UX-FAST, UX-SEARCH-1 predecessor, TypeScript et build production verts ;
- run spécialisé ${run} : **Product Design Reviewer PASS + Independent Release Certifier PASS** sur deux builds/replays indépendants ;
- audit visuel humain des captures 390×844 et 1440×900 : **9,5/10** — gate ≥9/10 atteint.

**Prochain LOT UX/Search : UX-SEARCH-3 — Card Architecture.** Objectif : converger la hiérarchie interne des cards vers IMAGE → PRIX → TITRE → LOCALISATION → FACTS → PROVENANCE, préserver transparence/trust AkarFinder et maintenir la densité certifiée. Gate UX ≥9/10 avant clôture.
<!-- UX-SEARCH-2-CLOSEOUT-END -->`;

let roadmap = await readFile(roadmapPath, "utf8");
if (!roadmap.includes("UX-SEARCH-2 — Compact Search & Filters ✅ CERTIFIED — PR #480")) {
  const anchor = "<!-- UX-SEARCH-1-CLOSEOUT-END -->";
  if (!roadmap.includes(anchor)) throw new Error("ROADMAP UX-SEARCH-1 closeout anchor missing");
  roadmap = roadmap.replace(anchor, `${anchor}\n\n${block}`);
}
if (!roadmap.includes("UX-SEARCH-2 ✅ PR #480")) {
  roadmap = roadmap.replace(
    "RABAT-REAL-PHOTO-LIBRARY-1 ✅ PR #468 ; BENCHMARK-SERP-1 convergence",
    "RABAT-REAL-PHOTO-LIBRARY-1 ✅ PR #468 ; UX-SEARCH-1 ✅ PR #479 ; UX-SEARCH-2 ✅ PR #480 ; BENCHMARK-SERP-1 convergence",
  );
}
await writeFile(roadmapPath, roadmap, "utf8");

let session = await readFile(sessionPath, "utf8");
if (!session.includes("UX-SEARCH-2 — Compact Search & Filters ✅ CERTIFIED — PR #480")) {
  const anchor = "<!-- UX-SEARCH-1-CLOSEOUT-END -->";
  if (!session.includes(anchor)) throw new Error("SESSION UX-SEARCH-1 closeout anchor missing");
  session = session.replace(anchor, `${anchor}\n\n${block}`);
}
const oldNext = "- Prochain LOT UX/Search : **CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1**, read-only ; mesurer couverture/répétition réelle **après #468**, y compris le tier Rabat real-photo et son taux d'échec distant, avant tout nouvel asset. Le district du catalogue d'illustrations historique reste OFF.";
const newNext = "- Prochain LOT UX/Search : **UX-SEARCH-3 — Card Architecture** ; la convergence Search continue avant le coverage audit illustrations. `CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1` reste queued read-only, sans nouvel asset par intuition.";
if (session.includes(oldNext)) session = session.replace(oldNext, newNext);
const oldLane = "- UX/Search : `CONTEXTUAL-ILLUSTRATIONS-SCALE-2` ✅ #453 + `RABAT-REAL-PHOTO-LIBRARY-1` ✅ #468 ; prochain LOT = **CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1** read-only ; Search reste canonique.";
const newLane = "- UX/Search : `UX-SEARCH-1` ✅ #479 + `UX-SEARCH-2` ✅ #480 ; prochain LOT = **UX-SEARCH-3 — Card Architecture** ; `CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1` reste queued read-only ; Search reste canonique.";
if (session.includes(oldLane)) session = session.replace(oldLane, newLane);
await writeFile(sessionPath, session, "utf8");

console.log("UX-SEARCH-2 closeout docs updated");