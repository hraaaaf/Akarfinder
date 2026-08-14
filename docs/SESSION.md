# AkarFinder — Session courante

**Mise à jour : 2026-08-14**

Ce fichier est le handover opérationnel court. `README.md` porte l'identité/doctrine et `docs/ROADMAP.md` reste l'unique roadmap canonique.

## UI polish — Search v1

- P0 Search : PR #582 mergée ; #578 fermée sans merge.
- Head certifié : `af8cd4106abaeda62faa3e95d9fe1a4de858c95e`.
- Merge : `599a85aa31da435faa23a4c81f1a549058b2f602`.
- Workflow exact-head `31752327411` : SUCCESS.
- Product Design Reviewer + Independent Release Certifier : SUCCESS.
- Matrice certifiée : 360×800 / 390×844 / 768×900 / 1024×800 / 1280×900 / 1440×900.
- Release artifact `9201481181`, digest `sha256:5c35ee26ce6595cecfa09601f6e8bc29c83c81e716b82a07fb57983ef55da1aa`.
- `/search` devient la référence UI v1 ; ne pas rouvrir sans finding mesuré.
- Next : P1 audit réel 390 / 430 px de `/search`, `/favorites`, `/map`, `/alerts`, `/compare`, `/mon-projet`, puis routes secondaires actives.
- Mockup board = cible visuelle v1 ; Carte = quartiers colorés + légende + pins prix + sélection quartier + card/bottom-sheet.
- La lane DATA reste indépendante.

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

- **P0 Search closeout 🔄** — closeout documentaire et merge dédié.
- **P1 Audit réel mobile ⏳ NEXT** — 390 / 430 px, matrice Avant → Cible.
- **P2 Design system transversal ⏳**.
- **P3 Favoris → Carte → Alertes → Comparer → Mon projet ⏳**.
- **P4 Pages secondaires actives ⏳**.
- **P5 Certification globale ⏳**.

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
- **P1.8 Océan 🔄 ACTIF — PR #559**.
- **P1.9 Yacoub El Mansour ⏳ NEXT** après closeout P1.8.
- **P2 Visual Resolver integration ⏳** après P1 Rabat.
- **P3 national rollout ⏳** puis **P4 visual intelligence ⏳**.

### DATA MASS

- **MASS-1 ✅ CLOSED / 9,5/10**.
- **MASS-2 ✅ CLOSED / 100 %**.
- **MASS-3 ✅ CLOSED — PR #566**.
- **MASS-4 ✅ CLOSED — PR #568**.
- **MASS-5 ✅ CLOSED — PR #569**.
- **MASS-6 ✅ CLOSED — PR #572**.
- Doctrine : attribution ≠ permission ; robots/sitemap/capability ≠ permission ; Source Registry autoritaire ; no-bypass.

### UX/Search

- Convergence **UX-SEARCH-1 → UX-SEARCH-7 ✅ COMPLETE**.
- Header, Search controls, results toolbar, cards, visual inventory, mobile precision et bottom-nav disposent de gates exact-head dédiés.
- Toute réouverture exige un finding mesuré.

## Invariants opérationnels

- `code mergé dans main → SESSION/ROADMAP/README cohérents → lot suivant` ;
- zéro donnée, permission, géographie ou provenance inventée ;
- une responsabilité / branche / PR / merge par lot ;
- **aucune écriture DB sans feu vert humain explicite préalable** ;
- mutation production uniquement après preuve bornée + rollback lorsque applicable ;
- CI GitHub en cours n'interrompt pas le travail indépendant ;
- exact-head + preuve visuelle requise avant certification d'un lot visuel.

## Reprise exacte

**UI polish : terminer le closeout Search puis lancer P1 Audit réel mobile 390 / 430 px.**

**DATA MASS : MASS-1 → MASS-6 ✅ CLOSED.** Aucun MASS-7 canonique n’est défini.

En parallèle, **P1.8 Océan** reste une lane indépendante.
