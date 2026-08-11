import { readFileSync, writeFileSync } from "node:fs";

const CLOSEOUT = [
  "<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-START -->",
  "## Bibliothèque visuelle quartiers — Souissi Pilot ✅ CLOSED",
  "",
  "- **P0.1→P0.5** : Modèle A verrouillé et trois scènes réelles Souissi certifiées (`signature / immobilier / lifestyle`) à partir de sources Wikimedia Commons vérifiées, sans génération ex nihilo.",
  "- **P0.6 ✅** : les trois scènes ont été rejouées dans les vraies cards Search sur la matrice responsive ; gate humain final **9,2/10**, disclosure `Photo d’ambiance` et crédits/licences préservés.",
  "- **P0.7 ✅ PR #506 + P0.7S #507** : bucket Supabase `neighborhood-visuals` matérialisé ; trois masters réels présents sous `rabat/souissi/{signature|immobilier|lifestyle}/master.jpg` ; les trois rows canoniques portent provenance/licence/attribution et `verified_location=true`.",
  "- Le master source reste **intact**. Le traitement AkarFinder certifié du pilote est **non destructif et rendu en CSS/UI** ; aucun bitmap dérivé n’est requis, donc `transformed_asset_url = NULL` est l’état canonique attendu pour ces trois assets.",
  "- La fonction d’ingestion P0.7 est désormais fail-closed (`410`) et l’extension temporaire `pg_net` a été supprimée après ingestion.",
  "- **Aucune activation implicite du Visual Resolver V2** : la consommation généralisée de cette bibliothèque reste dans **P2**. Le pilote prouve source → droits → ingestion → rendu → QA → Storage/metadata, pas une nouvelle règle de ranking/publication.",
  "- **Prochain LOT de cette lane : P1.1 — Agdal**, 3 scènes réelles selon le pipeline Souissi certifié.",
  "<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-END -->",
].join("\n");

function upsertBlock(path, anchor) {
  let text = readFileSync(path, "utf8");
  const start = "<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-START -->";
  const end = "<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-END -->";
  const s = text.indexOf(start);
  const e = text.indexOf(end);

  if (s >= 0 && e >= s) {
    text = `${text.slice(0, s)}${CLOSEOUT}${text.slice(e + end.length)}`;
  } else {
    const at = text.indexOf(anchor);
    if (at < 0) throw new Error(`${path}: anchor not found`);
    const insertAt = at + anchor.length;
    text = `${text.slice(0, insertAt)}\n\n${CLOSEOUT}${text.slice(insertAt)}`;
  }
  writeFileSync(path, text);
}

upsertBlock(
  "README.md",
  "`code mergé dans main → README.md → ROADMAP.md → SESSION.md → specs techniques → preuves historiques`.",
);
upsertBlock(
  "docs/ROADMAP.md",
  "`README.md` définit l’identité/doctrine. `docs/SESSION.md` porte le handover court. Ce fichier est l’unique roadmap.",
);
upsertBlock(
  "docs/SESSION.md",
  "Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.",
);

const visualPath = "docs/NEIGHBORHOOD_VISUAL_LIBRARY_ROADMAP.md";
let visual = readFileSync(visualPath, "utf8");

const exactReplacements = [
  ["**Statut : PLANNED**", "**Statut : P0 SOUISSI PILOT CLOSED ✅ — P1.1 AGDAL NEXT**"],
  [
    "`VRAIE PHOTO → vérification lieu → vérification droits/licence → ingestion du fichier original → transformation AkarFinder → comparaison original/résultat → score fidélité → stockage → intégration Search`",
    "`VRAIE PHOTO → vérification lieu → vérification droits/licence → ingestion du master intact → traitement AkarFinder non destructif au rendu (bitmap dérivé seulement si nécessaire) → comparaison source/rendu → score fidélité/UX → Storage + métadonnées → intégration Search`",
  ],
  [
    "Source pilote prioritaire : `Avenue Mohamed VI Souissi Rabat -1.jpg` — Wikimedia Commons.",
    "Source pilote certifiée : `Avenue Mohamed VI Souissi Rabat.jpg` — Wikimedia Commons, version paysage 3072×1728.",
  ],
  [
    "Responsabilité unique : transformer réellement la source P0.2 selon Modèle A.",
    "Responsabilité unique : appliquer réellement le Modèle A à la source P0.2 sans altérer le master. Le pilote a retenu un traitement CSS/UI non destructif ; aucun bitmap dérivé n’est créé lorsque le rendu suffit.",
  ],
  [
    "- toute transformation visuelle majeure doit atteindre **≥ 9/10** avant validation ;",
    "- tout traitement visuel majeur doit atteindre **≥ 9/10** avant validation ;\n- un traitement CSS/UI non destructif est canonique lorsqu’il suffit : dans ce cas le master reste intact et `transformed_asset_url = NULL` est attendu ;",
  ],
  ["- transformer selon Modèle A ;", "- appliquer le Modèle A au rendu, ou créer un dérivé uniquement si un traitement pixel est réellement nécessaire ;"],
  ["Gate : **UX/UI ≥9/10**.", "Gate : **UX/UI ≥9/10**. Pilote Souissi final : **9,2/10 PASS**."],
  [
    "- stocker originaux et transformations séparément ;\n- compléter provenance/licence/attribution ;\n- renseigner source path + transformed asset URL ;\n- renseigner fidélité et statut style ;",
    "- stocker les originaux certifiés dans `neighborhood-visuals` ;\n- stocker séparément un dérivé uniquement lorsqu’un vrai bitmap transformé existe ;\n- compléter provenance/licence/attribution ;\n- renseigner `image_storage_path` ; `transformed_asset_url` reste `NULL` pour le traitement CSS/UI non destructif certifié du pilote ;\n- conserver les notes de fidélité et le statut du rendu ;",
  ],
  ["Sortie : **Souissi 3/3 READY**.", "Sortie : **Souissi 3/3 READY ✅** — 3 masters physiques + 3 rows canoniques vérifiées."],
  ["Sortie : **SOUISSI PILOT CLOSED**.", "Sortie : **SOUISSI PILOT CLOSED ✅**."],
  [
    "`source réelle → droits → geo vérification → ingestion → transformation Modèle A → score ≥9 → DB`",
    "`source réelle → droits → geo vérification → ingestion du master → traitement Modèle A non destructif (dérivé seulement si nécessaire) → score ≥9 → DB/Storage`",
  ],
  [
    "`Neighborhood Registry → source discovery → rights/license → geo verification → DB slots → ingestion → transformation → fidelity QA → Search QA`",
    "`Neighborhood Registry → source discovery → rights/license → geo verification → DB slots → ingestion master → traitement non destructif ou dérivé justifié → fidelity QA → Search QA`",
  ],
  [
    "**État actuel : P0.1 Modèle A choisi ; formalisation production à certifier. Souissi DB possède déjà 3 slots (`signature / immobilier / lifestyle`), sans transformation finale validée.**",
    "**État actuel : P0 Souissi Pilot CLOSED ✅. Trois masters réels sont stockés et trois rows canoniques sont réconciliées ; le rendu Modèle A est non destructif et certifié en Search à 9,2/10 ; `transformed_asset_url` reste volontairement `NULL`. Prochain LOT : P1.1 Agdal.**",
  ],
];
for (const [from, to] of exactReplacements) {
  if (visual.includes(from)) visual = visual.replace(from, to);
}

for (const heading of [
  "P0.1 — Template Lock",
  "P0.2 — Souissi Signature Source",
  "P0.3 — Souissi Signature Asset",
  "P0.4 — Souissi Immobilier Source + Asset",
  "P0.5 — Souissi Lifestyle Source + Asset",
  "P0.6 — Visual Gate Search",
  "P0.7 — DB & Storage Integration",
  "P0.8 — Production Certification",
]) {
  const bare = `## ${heading}`;
  if (visual.includes(`${bare}\n`)) visual = visual.replace(`${bare}\n`, `${bare} ✅ CLOSED\n`);
}

// Normalize residue from older non-idempotent runs.
visual = visual.replace(/(?: ✅ CLOSED){2,}/g, " ✅ CLOSED");
visual = visual.replace(
  /(?: Pilote Souissi final : \*\*9,2\/10 PASS\*\*\.){2,}/g,
  " Pilote Souissi final : **9,2/10 PASS**.",
);

const p0Closeout = [
  "<!-- SOUISSI-PILOT-EVIDENCE-START -->",
  "## Preuves de clôture P0 — Souissi",
  "",
  "- P0.6 : vraies cards Search, mobile + desktop, score humain **9,2/10** ; aucun asset fictif accepté.",
  "- P0.7 : PR #506 mergée ; trois masters publics stockés dans le bucket `neighborhood-visuals`.",
  "- P0.7S : PR #507 mergée ; ingestion one-shot fermée et `pg_net` supprimé.",
  "- Storage paths : `rabat/souissi/signature/master.jpg`, `rabat/souissi/immobilier/master.jpg`, `rabat/souissi/lifestyle/master.jpg`.",
  "- Source/licence : Wikimedia Commons ; Signature et Lifestyle CC BY-SA 4.0, Immobilier CC BY-SA 3.0 ; attribution et ShareAlike conservés.",
  "- Doctrine finale du pilote : **master intact + identité AkarFinder au rendu**. Un bitmap transformé n’est jamais fabriqué uniquement pour remplir une colonne DB.",
  "- P2 reste la frontière d’activation du resolver bibliothèque quartier.",
  "<!-- SOUISSI-PILOT-EVIDENCE-END -->",
].join("\n");

if (!visual.includes("<!-- SOUISSI-PILOT-EVIDENCE-START -->")) {
  const p1Anchor = "---\n\n# P1 — RABAT PILOT SCALE";
  const idx = visual.indexOf(p1Anchor);
  if (idx < 0) throw new Error("visual roadmap P1 anchor not found");
  visual = `${visual.slice(0, idx)}${p0Closeout}\n\n${visual.slice(idx)}`;
}

writeFileSync(visualPath, visual);
