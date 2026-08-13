# AkarFinder — Session courante

**Mise à jour : 2026-08-13**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

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
- **MASS-2 ✅ CLOSED / 100 %** — 101/101 audités ; 43 `PERMISSION_REQUIRED`, 58 `HOLD`, 0 permission positive/activation inférée.
- **MASS-3 ✅ CLOSED — PR #566** — merge `604306a82e646596fd320fed88b4256f5caca49f`; 35 Registry rows, 0 policy-admissible, 0 canary, 0 write/activation/fetch/permission inférée ; artefact final `9188818350`, digest `sha256:2e09090dfec5bd9bec304221889ee0e3e4304fb9e7f16f54c25a2bd80e97a047`.
- **MASS-4 🔄 NEXT — Mass Reclassification read-only**.
- Doctrine : attribution ≠ permission ; robots/sitemap/capability ≠ permission ; candidate ≠ authorization ; Source Registry autoritaire ; no-bypass.

### UX/Search

- Convergence **UX-SEARCH-1 → UX-SEARCH-7 ✅ COMPLETE**.
- Header, Search controls, results toolbar, cards, visual inventory, mobile precision et bottom-nav disposent de gates exact-head dédiés.
- Toute réouverture exige un finding mesuré ; ne pas casser les predecessor gates pour accélérer une lane indépendante.

## Invariants opérationnels

- `code mergé dans main → SESSION/ROADMAP/README cohérents → lot suivant` ;
- zéro donnée, permission, géographie ou provenance inventée ;
- une responsabilité / branche / PR / merge par lot ;
- **aucune écriture DB sans feu vert humain explicite préalable** ;
- mutation production uniquement après preuve bornée + rollback lorsque applicable ;
- CI GitHub en cours n'interrompt pas le travail indépendant ;
- exact-head + preuve visuelle requise avant certification d'un lot visuel.

## Reprise exacte

**DATA MASS-4** : figer le contrat Mass Reclassification read-only → classifier le stock historique sans mutation → distinguer qualité, éligibilité et permission → preuve/artefact → closeout. Zéro écriture DB/Registry/Search.

En parallèle, **P1.8 Océan** reste une lane indépendante et ne doit pas être cassée par le lot DATA.
