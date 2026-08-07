# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-4.2 — Reservoir Prioritization ✅ PR #344**  
**Prochain lot DATA : DATA-4.3A — Dar Agadir Bounded Canonical-Link Activation Audit**  
**Lot UX acquis : CARTE-QUARTIER-P1A.2 — Search Geo Contract ✅ PR #334**  
**Prochain lot UX : CARTE-QUARTIER-P1A.3 — Map State & Navigation**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

`main` inclut notamment :

- CARTE-QUARTIER-P1A.0 ✅ PR #327 ;
- CARTE-QUARTIER-P1A.1 ✅ PR #328, score **9,5/10** ;
- CARTE-QUARTIER-P1A.2 ✅ PR #334 ;
- DATA-1.1 → DATA-1.6B ✅ ;
- DATA-4.0 ✅ PR #341, score **9,6/10** ;
- DATA-4.1A ✅ PR #343 ;
- DATA-4.2 ✅ PR #344, merge `19dcd7d`.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search reste canonique et Map son complément spatial.

# DATA — acquis récents

## DATA-4.0 ✅

Avito + Mubawab : **35 134 normalized**, **3 588 technical display**, **0 policy-activable**. Avito : 22 227 `unavailable`; Mubawab : gap public→normalized borné à 95 738, sans droit de crawl implicite.

## DATA-4.1A ✅ PR #343

Audit Avito strictement interne, sans réseau/source fetch :

- `unavailable` : **22 227** ;
- immobilier canonique : **1 098** ;
- bruit/non-immobilier : **21 129 (95,06 %)** ;
- type compatible catégorie : **804** ;
- type compatible + intent + geo : **73** ;
- evidence insuffisante : **1 025** ;
- prix : **0** ; surface : **0** ;
- policy-activable : **0**.

Décision : ne pas investir maintenant dans un Shadow Recovery Avito pour seulement 73 lignes internes et non publiables.

## DATA-4.2 ✅ PR #344

Live ranking paginé et read-only :

- normalized evidence rows lues : **56 803** ;
- display evidence rows : **22 426** ;
- Source Registry rows : **35** ;
- candidats classés : **14** ;
- DB writes / source requests / policy changes / public activations : **0**.

### Lane ADMISSIBLE_GROWTH

1. **daragadir.com** — score **71,75** ; 6 533 normalized ; 6 319 core-structured ; 6 528 technical display ; policy `canonical_link_only / external_tail_link_only`.
2. promoimmomarrakech.com — 67,91.
3. aykana.ma — 53,09.
4. limmobiliersansfrontieres.com — 47,91.

### Lane PARTNERSHIP_UPSIDE

1. **agenz.ma** — score **58,93** ; 4 490 normalized ; 1 227 fresh ; 1 146 decision-structured ; policy `internal_signal_only / hidden`.
2. mouldar.com — 53,56.
3. masaken.ma — 48,73.

Un plancher de **500 lignes normalisées** est requis pour gagner cette lane afin d’éviter qu’un petit catalogue très propre soit pris pour un multiplicateur vers 20K.

# Prochain lot DATA — DATA-4.3A

## Dar Agadir Bounded Canonical-Link Activation Audit

Objectif : déterminer si la profondeur déjà détenue de `daragadir.com` peut être représentée plus utilement dans AkarFinder **sans réutilisation de contenu ni fetch détail**, uniquement dans la frontière déjà enregistrée :

`public_sitemap_canonical_link → canonical_link_only → external_tail_link_only`.

Scope strict :

- données déjà détenues + facts URL/sitemap autorisés par Registry ;
- aucun fetch de page détail ;
- aucune image/contact/description réutilisée ;
- aucune modification de Source Registry ;
- aucun passage automatique à une fiche AkarFinder complète ;
- mesurer fraîcheur, duplication, qualité minimale, vérité city/type/intent et volume de canonical outbound links réellement admissibles ;
- produire un shadow activation report ;
- **0 activation production dans 4.3A**.

Gate : `canonical_link_only` signifie lien sortant borné et provenance explicite, jamais contenu partenaire ou annonce réhébergée.

# Lane business parallèle

**Agenz** devient la priorité partenariat/feed parmi les réservoirs connus. Tant qu’aucune autorisation écrite ne change le Registry, son corpus reste `hidden/internal_signal_only`.

# UX — handover

P1A.3 reste le prochain lot UX : état URL `/map`, conservation `city/district/layer/project_id`, Back/Forward et transitions Map ↔ Search sans perte de contexte.