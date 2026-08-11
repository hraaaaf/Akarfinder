import { readFileSync, writeFileSync } from "node:fs";

const files = {
  readme: "README.md",
  roadmap: "docs/ROADMAP.md",
  session: "docs/SESSION.md",
};

const readmeBlock = `
### UX-LISTING-NAV-FEEDBACK-1 ✅ CERTIFIED — PR #486

Finding utilisateur distinct après la convergence UX-SEARCH-1→7 : l’action principale d’une annonce ouvrait un nouvel onglet, cassant la continuité naturelle du bouton Précédent, et les navigations lentes n’exprimaient aucun état d’attente.

- ouverture principale des résultats internes, observés et Gateway **dans le même onglet** ; le bouton Précédent du navigateur revient donc au Search précédent ;
- les liens secondaires explicitement externes (source originale secondaire, crédit/licence photo) restent en nouvel onglet ;
- feedback global AkarFinder **pin + radar** uniquement si la navigation dépasse **280 ms**, non bloquant et sans flash sur les transitions rapides ;
- reset sur changement de route/query, \`pageshow\`/BFCache et \`popstate\` ; \`prefers-reduced-motion\` respecté ;
- aucun changement de ranking, DATA, Source Registry, dédup, prix, densité, ordre commercial ou Map ;
- head comportemental \`ea36ca6650af9774c5bca778069c7997766ce43c\` : gate dédié \`UX Listing Navigation Feedback Gate\` run \`31490771461\` **PASS** — contrat navigation/loading + TypeScript ; les predecessor gates du PR sont rejoués avant merge.
`;

const roadmapBlock = `
<!-- UX-LISTING-NAV-FEEDBACK-1-CLOSEOUT-START -->
## UX-LISTING-NAV-FEEDBACK-1 — Same-tab navigation & branded loading ✅ CERTIFIED — PR #486

Responsabilité unique : **restaurer une navigation d’annonce compatible avec Précédent et rendre les navigations lentes immédiatement compréhensibles**, sans rouvrir la convergence visuelle UX-SEARCH-1→7 ni modifier les décisions métier.

Résultat :

- action principale des cards internes, observées et Gateway = navigation même onglet ;
- retour navigateur/BFCache revient au Search précédent ;
- liens secondaires explicites source/crédit restent externes en nouvel onglet ;
- loader global AkarFinder = pin + radar, affiché seulement après **280 ms**, non bloquant, failsafe borné, reset route/query/\`pageshow\`/\`popstate\` ;
- reduced-motion supporté ; liens hash/mail/tel/download/modifier-click et nouveaux onglets exclus du feedback ;
- ancien contrat UNIFIED réconcilié : la sécurité/provenance et la policy thumbnail restent protégées sans imposer \`target=\"_blank\"\` à l’action principale ;
- nouveau gate permanent \`UX Listing Navigation Feedback Gate\` ; run \`31490771461\` PASS avec contrat dédié + TypeScript sur head comportemental \`ea36ca6650af9774c5bca778069c7997766ce43c\` ;
- 0 changement ranking, DATA, Registry, dédup, prix, ordre commercial, densité Search ou Map.

Ce finding est fermé comme micro-lot UX distinct. Il **ne rouvre pas** UX-SEARCH-1→7. Le prochain lot UX/Search planifié reste \`CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1\`.
<!-- UX-LISTING-NAV-FEEDBACK-1-CLOSEOUT-END -->
`;

const sessionBlock = `
<!-- UX-LISTING-NAV-FEEDBACK-1-CLOSEOUT-START -->
## UX-LISTING-NAV-FEEDBACK-1 ✅ CERTIFIED — PR #486

- finding utilisateur : ouverture d’annonce en nouvel onglet + absence de feedback perceptible pendant une navigation lente ;
- action principale Search/Gateway désormais **même onglet** ; Précédent revient au Search précédent ;
- liens secondaires source/crédit restent volontairement \`target=\"_blank\"\` ;
- loader AkarFinder pin/radar après **280 ms**, non bloquant, reset route/query/Back/BFCache, reduced-motion ;
- gate permanent \`UX Listing Navigation Feedback Gate\` run \`31490771461\` PASS : contrat + TypeScript ; head comportemental \`ea36ca6650af9774c5bca778069c7997766ce43c\` ;
- ranking, DATA, Registry, dédup, prix, densité, ordre commercial et Map inchangés ;
- la convergence UX-SEARCH-1→7 reste fermée ; prochain lot planifié = \`CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1\`.
<!-- UX-LISTING-NAV-FEEDBACK-1-CLOSEOUT-END -->
`;

function insertAfter(path, marker, uniqueMarker, block) {
  const current = readFileSync(path, "utf8");
  if (current.includes(uniqueMarker)) return false;
  if (!current.includes(marker)) throw new Error(`Missing marker ${marker} in ${path}`);
  writeFileSync(path, current.replace(marker, `${marker}\n${block}`));
  return true;
}

function updateRoadmapStatus() {
  const path = files.roadmap;
  const current = readFileSync(path, "utf8");
  const token = "UX-SEARCH-7 ✅ PR #485 ;";
  const replacement = "UX-SEARCH-7 ✅ PR #485 ; UX-LISTING-NAV-FEEDBACK-1 ✅ PR #486 ;";
  if (current.includes(replacement)) return false;
  if (!current.includes(token)) throw new Error(`Missing roadmap status token: ${token}`);
  writeFileSync(path, current.replace(token, replacement));
  return true;
}

const changes = [];
if (insertAfter(files.readme, "<!-- UX-SEARCH-CONVERGENCE-CURRENT-END -->", "### UX-LISTING-NAV-FEEDBACK-1 ✅ CERTIFIED — PR #486", readmeBlock)) changes.push(files.readme);
if (updateRoadmapStatus()) changes.push(`${files.roadmap}:status`);
if (insertAfter(files.roadmap, "<!-- UX-SEARCH-7-CLOSEOUT-END -->", "<!-- UX-LISTING-NAV-FEEDBACK-1-CLOSEOUT-START -->", roadmapBlock)) changes.push(files.roadmap);
if (insertAfter(files.session, "Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.", "<!-- UX-LISTING-NAV-FEEDBACK-1-CLOSEOUT-START -->", sessionBlock)) changes.push(files.session);

console.log(JSON.stringify({ changed: changes }, null, 2));
