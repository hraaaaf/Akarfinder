# AkarFinder — Session courante

**Mise à jour : 2026-08-14**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

<!-- UI-POLISH-SEARCH-V1-START -->
## UI polish — Search v1 figé, audit global mesuré

- **P0 Search ✅ CLOSED** — PR #582 mergée (`599a85aa31da435faa23a4c81f1a549058b2f602`) ; baseline persistée par PR #596 (`bd3132bbbcb474bd1e4eb3bce5b22789f0c07cbd`).
- Head Search final certifié : `af8cd4106abaeda62faa3e95d9fe1a4de858c95e`.
- Workflow exact-head `31752327411` : **SUCCESS** avec Product Design Reviewer + Independent Release Certifier.
- Référence persistante : `docs/UX_SEARCH_V1_REFERENCE.md`.
- **P1 Audit réel mobile ✅ CLOSED — PR #597**, merge `9edf7241142fc9239d7fdd7d882ee07decf285d4`.
- P1 : **12/12 captures réelles** sur `/search`, `/favorites`, `/map`, `/alerts`, `/compare`, `/mon-projet`, en **390×844 / 430×932**, HTTP 200 partout, **0 overflow horizontal**.
- Preuves P1 : Product Design artefact `9203817261`, Independent Release Certifier artefact `9203859194`.
- Scores visuels réels : Favoris **7,5/10** ; Carte **8,0/10** ; Alertes **6,5/10** ; Comparer **7,0/10** ; Mon Projet **8,0/10** ; Search reste la référence certifiée.
- Findings : `/compare` n'activait aucun item de bottom-nav ; correction engagée dans P2 en rattachant Comparer à Favoris. Le `401` de `/api/me/continuity` sur Mon Projet hors session est conforme au contrat d'authentification et n'est pas un bug produit.
- **P2 Design system transversal 🔄 ACTIF — PR #601** : primitives premium communes, glass bottom-nav, contrat design system v1 et harness P3 20 captures.
- **P3 Pages prioritaires 🔄 PRÉPARÉES en parallèle sur #601** : Favoris #602 ; Carte #603 ; Alertes #604 ; Comparer #606 ; Mon Projet #607. Chaque lot reste à certifier visuellement exact-head avant merge.
- Mockup board = référence visuelle v1 ; Carte verrouillée sur **quartiers colorés + légende + pins prix + sélection quartier + card/bottom-sheet**.
- La lane DATA et la bibliothèque visuelle quartiers restent indépendantes et ne doivent pas être écrasées par la reprise UI.
<!-- UI-POLISH-SEARCH-V1-END -->

<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-START -->
## Bibliothèque visuelle quartiers — Souissi Pilot ✅ CLOSED

- **P0.1→P0.5** : Modèle A verrouillé et trois scènes réelles Souissi certifiées (`signature / immobilier / lifestyle`) à partir de sources Wikimedia Commons vérifiées, sans génération ex nihilo.
- **P0.6 ✅** : les trois scènes ont été rejouées dans les vraies cards Search sur la matrice responsive ; gate humain final **9,2/10**, disclosure `Photo d’ambiance` et crédits/licences préservés.
- **P0.7 ✅ PR #506 + P0.7S #507** : bucket Supabase `neighborhood-visuals` matérialisé ; trois masters réels présents sous `rabat/souissi/{signature|immobilier|lifestyle}/master.jpg` ; les trois rows canoniques portent provenance/licence/attribution et `verified_location=true`.
- Le master source reste **intact**. Le traitement AkarFinder certifié du pilote est **non destructif et rendu en CSS/UI** ; aucun bitmap dérivé n’est requis, donc `transformed_asset_url = NULL` est l’état canonique attendu pour ces trois assets.
- La fonction d’ingestion P0.7 est désormais fail-closed (`410`) et l’extension temporaire `pg_net` a été supprimée après ingestion.
- **Aucune activation implicite du Visual Resolver V2** : la consommation généralisée de cette bibliothèque reste dans **P2**. Le pilote prouve source → droits → ingestion → rendu → QA → Storage/metadata, pas une nouvelle règle de ranking/publication.
- **P1 Rabat désormais terminé jusqu’à P1.9** ; prochaine étape de cette lane : **P2 Visual Resolver integration**.
<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-END -->

## Priorité d’exécution

### UI polish / mockup v1

- **P0 Search closeout ✅ CLOSED** — baseline Search persistée ; aucun redesign sans finding mesuré.
- **P1 Audit réel mobile ✅ CLOSED — PR #597** — 12/12 captures réelles, 390 / 430 px, 0 overflow, scores et findings persistés dans `docs/UI_POLISH_P1_AUDIT.md`.
- **P2 Design system transversal 🔄 ACTIF — PR #601** — primitives partagées + navigation glass + correction active state `/compare` + harness P3 390 / 430 / 768 / 1280.
- **P3 Pages prioritaires 🔄 PRÉPARÉES** — Favoris #602 → Carte #603 → Alertes #604 → Comparer #606 → Mon Projet #607 ; certification visuelle requise avant chaque merge.
- **P4 Pages secondaires ⏳** — seulement routes publiques réellement actives.
- **P5 Certification globale ⏳** — 390 / 430 / 768 / 1280, FR + AR si concerné, zéro overflow, accessibilité, navigation/bottom-nav cohérentes, aucun conflit DATA/search/ranking.

### Bibliothèque visuelle quartiers — Rabat

Doctrine verrouillée : **photos réelles uniquement**, provenance/licence défendables, aucun visuel généré dans la bibliothèque certifiée, aucune photo d’ambiance présentée comme photo du bien, activation Search généralisée toujours fail-closed jusqu’à P2.

- **P0 Souissi ✅ CLOSED** — pilote source → droits → rendu → QA → Storage/metadata certifié.
- **P1.1 Agdal ✅ CLOSED**.
- **P1.2 Akkari ✅ CLOSED**.
- **P1.3 Aviation ✅ CLOSED**.
- **P1.4 Hassan ✅ CLOSED**.
- **P1.5 Hay Riad ✅ CLOSED**.
- **P1.6 Les Orangers ✅ CLOSED**.
- **P1.7 Médina ✅ CLOSED — PR #556**.
  - merge `6cff1970131d7660337d1b9fe6588ade07791e14` ;
  - exact head certifié `1916999fa71d1c5b1407769f94f85dbc4dffbff3` ;
  - 3 sources réelles distinctes `signature / immobilier / lifestyle` ;
  - Product Design Reviewer ✅ ; Independent Release Certifier ✅ ; contrats/baselines exact-head ✅ ;
  - QA machine **10/10** sur 360 / 390 / 768 / 1024 / 1280 / 1440 ;
  - gate visuel humain **9,1/10** ;
  - correctif QA : la navigation mobile globale ne se rend plus sur `/visual-qa/*`, avec les gates bottom-nav exact-head restés verts ;
  - aucune activation Search implicite.
- **P1.8 Océan ✅ CLOSED — PR #588**.
  - merge `48188de7f62c80da163ff157040940712e45c93f` ;
  - exact head `3dc9a6daa6aa56192d8237cd9d79a727f9a65475` ;
  - 3 sources réelles `signature / immobilier / lifestyle`, Product Design Reviewer ✅, Independent Release Certifier ✅ ;
  - QA machine **10/10** sur 360 / 390 / 768 / 1024 / 1280 / 1440 ;
  - aucune activation Search implicite.
- **P1.9 Yacoub El Mansour / Hay El Fath ✅ CLOSED — PR #595**.
  - merge `ab8f283c727f14b23f6f5717b6cadac5450ad07a` ; head certifié `9fbd8f18dd15ca538469ee4cbaaf2e8b8f9152b9` ;
  - 3 scènes réelles : deux contextes résidentiels Hay El Fath via KartaView + une scène Atlantique Wikimedia Commons explicitement associée à Yacoub El Mansour ;
  - SHA-1 verrouillés : `18a08e3074db9881953a8ad348f29fb33d5c5743`, `531354e2a02ddf5e936aa5eb3754643b129154d4`, `e9951191d89fcba47159bd021143ab9be76145a2` ;
  - Contract `31759100755` ✅ ; Product Design Reviewer `31759100703` ✅ ; Independent Release Certifier `31759100686` ✅ ;
  - preuves : artefact Product Design `9204072131`, artefact Independent Release `9204061400` ;
  - QA machine **10/10** sur 360 / 390 / 768 / 1024 / 1280 / 1440, zéro overflow, trois backgrounds distincts ;
  - human gate **PASS** ; aucune activation Search implicite.
- **P2 Visual Resolver integration 🔄 NEXT** — intégrer la bibliothèque certifiée sans contourner les truth boundaries ni la doctrine d’activation.
- **P3 national rollout ⏳** puis **P4 visual intelligence ⏳**.

### DATA MASS

- **MASS-1 → MASS-6 ✅ CLOSED** — programme national fail-closed déjà certifié.
- **MASS-X5 ✅ CLOSED — PR #609** — Exact Reconciliation Shadow v2 ; merge `3f1724faf03fd3c93fdafc2f522d61465d377e5b` ; exact head `f66c5578c433df52da37a00dc36d9a39010846ae` ; run `31762998799` SUCCESS ; artefact `9205427369`, digest `sha256:d3aeb0f481e985c8a7662553ee3e5e589148af724586ad1ed68122dc2f126d43`.
- Résultat exact : **51 169 candidats uniques = 36 732 overlaps + 14 437 net-new**.
- Invariants : **0 DB write / 0 Registry write / 0 Search activation / 0 source-page fetch / 0 WARC / 0 permission inference** ; `candidate_grants_authorization=false`.
- #599/run `31759264360` est conservé comme preuve historique superseded ; #609 est la recertification canonique sur main courant.
- **DATA MASS est réellement CLOSED.** Toute activation ou mutation production est hors scope et exige un gate humain explicite.

### UX/Search

- Convergence **UX-SEARCH-1 → UX-SEARCH-7 ✅ COMPLETE**.
- Header, Search controls, results toolbar, cards, visual inventory, mobile precision et bottom-nav disposent de gates exact-head dédiés.
- La baseline finale de reprise est documentée dans `docs/UX_SEARCH_V1_REFERENCE.md` et ne se rouvre qu’avec un finding mesuré.

## Invariants opérationnels

- `code mergé dans main → SESSION/ROADMAP/README cohérents → lot suivant` ;
- zéro donnée, permission, géographie ou provenance inventée ;
- une responsabilité / branche / PR / merge par lot ;
- **aucune écriture DB sans feu vert humain explicite préalable** ;
- mutation production uniquement après preuve bornée + rollback lorsque applicable ;
- CI GitHub en cours n'interrompt pas le travail indépendant ;
- exact-head + preuve visuelle requise avant certification d'un lot visuel.

## Reprise exacte

**UI polish : P1 Audit réel mobile est CLOSED. P2 Design System #601 est le chemin critique. Les cinq lots P3 sont préparés en parallèle : #602 Favoris, #603 Carte, #604 Alertes, #606 Comparer, #607 Mon Projet.** Search v1 reste la référence visuelle figée.

**Bibliothèque visuelle : P1.1 → P1.9 ✅ CLOSED. Prochaine action exacte : P2 Visual Resolver integration.** Search généralisé reste fail-closed tant que P2 n’a pas été certifié.

**DATA MASS : programme CLOSED, MASS-X5 PR #609 certifié et mergé.** Aucune écriture DB/Registry/Search ni activation n’a été effectuée ; toute mutation production future exige un feu vert humain explicite préalable.
