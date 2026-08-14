# AkarFinder — Session courante

**Mise à jour : 2026-08-14**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

<!-- UI-POLISH-SEARCH-V1-START -->
## UI polish — Search v1 figé, reprise globale active

- **P0 Search ✅ TECHNIQUEMENT CLOSED** — PR #582 mergée (`599a85aa31da435faa23a4c81f1a549058b2f602`) ; ancienne #578 fermée sans merge.
- Head Search final certifié : `af8cd4106abaeda62faa3e95d9fe1a4de858c95e`.
- Workflow exact-head `31752327411` : **SUCCESS** avec `Product Design Reviewer — Full Search 10/10` + `Independent Release Certifier — Full Search 10/10`.
- Matrice réelle certifiée : **360×800 / 390×844 / 768×900 / 1024×800 / 1280×900 / 1440×900**.
- Preuves : artefact Product Design `9201430551`, digest `sha256:f2a2e5307dd61c97c1cde5fc7997f7a6fb65168a321cfc10bff656abfbcf4c74` ; artefact Release Certifier `9201481181`, digest `sha256:5c35ee26ce6595cecfa09601f6e8bc29c83c81e716b82a07fb57983ef55da1aa`.
- Référence persistante : `docs/UX_SEARCH_V1_REFERENCE.md`.
- **P1 NEXT : audit réel mobile 390 / 430 px** de `/search`, `/favorites`, `/map`, `/alerts`, `/compare`, `/mon-projet`, puis routes secondaires actives ; matrice Avant → Cible avant extraction du design system transversal.
- Mockup board = référence visuelle v1 ; Carte verrouillée sur **quartiers colorés + légende + pins prix + sélection quartier + card/bottom-sheet**.
- Ne pas rouvrir Search sans finding mesuré et ne pas modifier la lane DATA pour accélérer la reprise UI.
<!-- UI-POLISH-SEARCH-V1-END -->

<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-START -->
## Bibliothèque visuelle quartiers — Souissi Pilot ✅ CLOSED

- **P0.1→P0.5** : Modèle A verrouillé et trois scènes réelles Souissi certifiées (`signature / immobilier / lifestyle`) à partir de sources Wikimedia Commons vérifiées, sans génération ex nihilo.
- **P0.6 ✅** : les trois scènes ont été rejouées dans les vraies cards Search sur la matrice responsive ; gate humain final **9,2/10**, disclosure `Photo d’ambiance` et crédits/licences préservés.
- **P0.7 ✅ PR #506 + P0.7S #507** : bucket Supabase `neighborhood-visuals` matérialisé ; trois masters réels présents sous `rabat/souissi/{signature|immobilier|lifestyle}/master.jpg` ; les trois rows canoniques portent provenance/licence/attribution et `verified_location=true`.
- Le master source reste **intact**. Le traitement AkarFinder certifié du pilote est **non destructif et rendu en CSS/UI** ; aucun bitmap dérivé n’est requis, donc `transformed_asset_url = NULL` est l’état canonique attendu pour ces trois assets.
- La fonction d’ingestion P0.7 est désormais fail-closed (`410`) et l’extension temporaire `pg_net` a été supprimée après ingestion.
- **Aucune activation implicite du Visual Resolver V2** : la consommation généralisée de cette bibliothèque reste dans **P2**. Le pilote prouve source → droits → ingestion → rendu → QA → Storage/metadata, pas une nouvelle règle de ranking/publication.
- **Prochain LOT de cette lane : P1.1 — Agdal**, 3 scènes réelles selon le pipeline Souissi certifié.
<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-END -->

## Priorité d’exécution

### UI polish / mockup v1

- **P0 Search closeout 🔄** — preuve persistante + canoniques + PR de closeout en cours ; Search ne doit plus être redessiné sans finding mesuré.
- **P1 Audit réel mobile ⏳ NEXT** — `/search`, `/favorites`, `/map`, `/alerts`, `/compare`, `/mon-projet`, puis routes secondaires utiles ; 390 / 430 px ; score, écarts, composants réutilisables, composants à harmoniser.
- **P2 Design system transversal ⏳** — header, glass bottom-nav, surfaces/cards, radius/shadows/blur, typo, chips/boutons, toolbar, spacing, loading/empty/error.
- **P3 Pages prioritaires ⏳** — Favoris → Carte → Alertes → Comparer → Mon projet/Compte.
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
- **P1.8 Océan 🔄 ACTIF — PR #559**.
  - branche `agent/neighborhood-visual-p1-8-ocean-source` ;
  - sourcing réel verrouillé : Phare de Rabat / Bab El Had / coucher de soleil associé au quartier Océan ;
  - source-discovery exact : `561b72a1093fd4fc207e573447f9de94330e66b1`, `33bc545195a8ba9904e9b68519cf2c4714af11b7`, `ec76f6f5f505a30bafc32810158e7bc014eb4983` ;
  - relations truth-safe : `nearby_context / edge_context / nearby_context` ; jamais de claim `inside Océan` ;
  - registry, route QA, fixture Search, audit six viewports, contract, reviewer et release-certifier en cours de certification ;
  - P1.8 reste read-only côté activation : Storage/DB/Search généralisé attend P2.
- **P1.9 Yacoub El Mansour ⏳ NEXT** après closeout P1.8.
- **P2 Visual Resolver integration ⏳** après P1 Rabat.
- **P3 national rollout ⏳** puis **P4 visual intelligence ⏳**.

### DATA MASS

- **MASS-1 ✅ CLOSED / 9,5/10** — réservoir qualifié à 101 domaines.
- **MASS-2 ✅ CLOSED / 100 %** — 101/101 audités ; 43 `PERMISSION_REQUIRED`, 58 `HOLD`.
- **MASS-3 ✅ CLOSED — PR #566** — fail-closed, 0 source admissible.
- **MASS-4 ✅ CLOSED — PR #568** — merge `4abc7fcee96f00fa5745937c4c12daea0b541b47` ; run `31726483908` SUCCESS ; artefact `9191563403` ; 5 284 sources actives, 0 admissible, 5 271 haute qualité mais policy-blocked ; 0 mutation.
- **MASS-5 ✅ CLOSED — PR #569** — merge `7b4503bf00ea7a99fb44f798748698d282cf3d8c` ; run `31727831232` SUCCESS ; artefact `9192248949` ; 7 nouveaux domaines, 148 URL representations, tous UNREGISTERED/non activables ; 0 mutation/fetch/permission inférée.
- **MASS-6 ✅ CLOSED — PR #572** — National Mass Engine shadow ; merge `471e792f0ea14b6a0bf54ef7fad09eff0d341030` ; exact head `b50e6275393043b736f35c783415b393b86751f9` ; run `31731327963` SUCCESS ; artefact `9196734887`, digest `sha256:48c0a4cdf3bf83dc9f8f4f1d9a7a37c48dc4ad636412a0a3b83817e49e0bc9e0` ; pipeline `DISCOVER → CLASSIFY → POLICY → INDEX → FRESHNESS → DEDUP → RANK` fail-closed, bloqué à `POLICY` ; 209 109 discovery rows, 109 domaines Source Factory, 8 nouveaux domaines post-baseline, 0 Registry admissible ; preuves MASS-1/4/5 read-only vérifiées ; 0 write/fetch/activation/permission inférée.
- Doctrine : attribution ≠ permission ; robots/sitemap/capability ≠ permission ; Source Registry autoritaire ; no-bypass.

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

**UI polish : terminer le closeout documentaire Search, puis lancer P1 Audit réel mobile 390 / 430 px.** La lane DATA reste indépendante et ne doit pas être écrasée par cette reprise UI.

**DATA MASS : MASS-1 → MASS-6 ✅ CLOSED.** Le National Mass Engine reste shadow/read-only et fail-closed à POLICY tant que le Source Registry ne contient aucune autorisation positive. Toute écriture DB/Registry/Search ou activation exige un feu vert humain explicite préalable.
