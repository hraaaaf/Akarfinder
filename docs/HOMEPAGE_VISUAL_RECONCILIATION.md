# Homepage Visual Reconciliation

Issue: #849

## Goal

Réconcilier `/` avec la référence visuelle validée le 2026-08-22, en reprenant environ 80–85 % de sa direction visuelle sans recopier de métriques fictives.

## Référence visuelle verrouillée

Mockup 1536×864 fourni et validé dans le chantier. Signature visuelle attendue :

- header blanc ;
- HERO dominant avec `1er moteur de recherche immobilier au Maroc` ;
- desktop : moteur à gauche, `AkarFinder Intelligence` à droite ;
- recherche + intents Acheter / Louer / Neuf ;
- `Explorer le Maroc` immédiatement après ;
- `Biens récents` très tôt dans la page ;
- `Comprendre avant de choisir` ;
- double CTA acheteur / vendeur ;
- bloc Professionnels ;
- bandeau final de bénéfices ;
- palette blanc / navy / bleu ;
- une seule famille d’icônes Lucide ;
- mobile : Intelligence descend sous le moteur et ne concurrence pas le HERO.

Aucune valeur du mockup (`1M+`, volumes, prix moyens, variations, densité, indice) n’est une donnée produit tant qu’elle n’est pas prouvée par la source réelle.

## BEFORE

Baseline produit certifiée par P11 :

- run `32559337861` — SUCCESS ;
- artifact `9472405507` ;
- digest `sha256:4dc2ca941ba81aac4f8d72f3a633989f6aff4f24f6bec9fd9d8beadd181351b2` ;
- captures homepage : `p3-accueil-390x844.png`, `p3-accueil-430x932.png`, `p3-accueil-768x900.png`, `p3-accueil-1280x900.png` ;
- base main au démarrage HVR : `05f74e8892b8d8958d86bbf2b2247e69b98d276f` ;
- le commit main post-certification P11 est documentation-only.

## Lots

### HVR-1 — Header + HERO + search + Intelligence

Goal : rapprocher la zone au-dessus de la ligne de flottaison de la référence.

Succès observable :

- header blanc desktop ;
- HERO plus compact mais dominant ;
- desktop 2 colonnes, moteur à gauche / Intelligence à droite ;
- H1 exact conservé ;
- recherche + Acheter / Louer / Neuf ;
- Intelligence sans métrique inventée ;
- mobile : ordre moteur puis Intelligence ;
- aucun overflow 390 / 430 / 768 / 1280.

Preuve : comparaison BEFORE → référence → AFTER + tests ciblés.

### HVR-2 — Explorer le Maroc + Biens récents

Succès : deux modules visibles tôt, cartes premium, vraies données/images si disponibles, fallback propre.

### HVR-3 — Comprendre + CTA + Professionnels

Succès : hiérarchie proche de la référence, aucune duplication KPI artificielle.

### HVR-4 — Iconographie + design system + bénéfices

Succès : Lucide homogène, tailles/strokes/espacements cohérents.

### HVR-5 — Responsive + polish + certification finale

Succès : 390 / 430 / 768 / 1280, 0 overflow, audit accessibilité/build, score visuel final visé ≥ 9/10 et human visual gate avant merge.

## Invariants

- pas de métrique inventée ;
- pas de changement backend/DB hors lecture des données existantes strictement nécessaire ;
- pas de changement de ranking/source ;
- pas de déploiement Vercel sans autorisation explicite.

## Flow de chaque lot UI

BEFORE → Goal → référence → implémentation → AFTER → tests → score → human gate.
