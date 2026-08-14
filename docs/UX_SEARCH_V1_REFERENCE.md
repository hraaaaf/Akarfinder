# AkarFinder — Search UI Reference v1

**Statut : CERTIFIED / référence visuelle de reprise**  
**Date : 2026-08-14**

## Baseline canonique

- PR finale : **#582** — `UX-PREMIUM-CARD-LAYOUT-SPECS-D — compact specs icons and card hierarchy polish`.
- Head certifié : `af8cd4106abaeda62faa3e95d9fe1a4de858c95e`.
- Merge dans `main` : `599a85aa31da435faa23a4c81f1a549058b2f602`.
- Ancienne PR équivalente **#578 fermée sans merge** après remplacement par #582.
- Scope #582 : **1 fichier CSS**, +18 / -0 ; aucune modification volontaire de DATA, ranking, Source Registry, déduplication, prix, ordre commercial, grid, header, toolbar ou bottom-nav.

## Certification exacte

Workflow exact-head : **31752327411 — UX-SEARCH-FINAL-10OF10-1 Full Page Certification — SUCCESS**.

Deux jobs indépendants ont terminé `success` :

1. `Product Design Reviewer — Full Search 10/10`
2. `Independent Release Certifier — Full Search 10/10`

Le replay a couvert les contrats Search figés, TypeScript, build production, Chromium, page Search complète, Visual Inventory réel, bottom navigation mobile et Footer.

Matrice Search complète : **360×800 / 390×844 / 768×900 / 1024×800 / 1280×900 / 1440×900**.

## Preuves archivées GitHub Actions

- `ux-search-final-10of10-product-design-proof`
  - artefact `9201430551`
  - digest `sha256:f2a2e5307dd61c97c1cde5fc7997f7a6fb65168a321cfc10bff656abfbcf4c74`
- `ux-search-final-10of10-release-certifier-proof`
  - artefact `9201481181`
  - digest `sha256:5c35ee26ce6595cecfa09601f6e8bc29c83c81e716b82a07fb57983ef55da1aa`

Les artefacts contiennent notamment les captures Search complètes des six viewports et les rapports machine associés.

## Règle de reprise UI

`/search` devient la **référence visuelle v1** pour la reprise transversale des autres pages. On ne rouvre pas Search sans finding mesuré.

Ordre UI de reprise :

`Audit réel mobile → Design system transversal → Favoris → Carte → Alertes → Comparer → Mon projet → pages secondaires → certification globale`.

Le mockup board fourni dans la conversation reste la cible visuelle v1, avec la règle Carte explicitement verrouillée : **quartiers colorés + légende + pins prix + sélection quartier + card/bottom-sheet**.

## Invariants

- aucun changement UI ne doit modifier silencieusement DATA/search/ranking ;
- aucun fait immobilier absent ne doit être inventé pour remplir une card ;
- mobile reste l’expérience de référence ;
- les lots suivants doivent réutiliser les primitives Search plutôt que créer des familles CSS indépendantes ;
- certification visuelle réelle avant merge pour chaque lot majeur.
