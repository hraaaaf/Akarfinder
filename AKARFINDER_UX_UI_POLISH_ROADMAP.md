# AKARFINDER_UX_UI_POLISH_ROADMAP.md

## Chantier
AkarFinder — UX/UI Global Polish

Dernière mise à jour : 2026-08-28

## Goal
Polir l’ensemble du site page par page sans refonte inutile, en améliorant en priorité la hiérarchie, la densité, la cohérence inter-pages, les états vides et la qualité perçue mobile/desktop.

## Succès observable
Pour chaque lot UI :
1. BEFORE certifié aux viewports 390×844 / 430×932 / 768×900 / 1280×900 ;
2. Goal visuel écrit ;
3. référence/mockup défini ;
4. implémentation ciblée ;
5. AFTER aux mêmes viewports ;
6. comparaison directe + tests ;
7. score visuel justifié, jamais déclaré sans preuve.

Contraintes globales :
- pas de régression fonctionnelle ;
- pas de modification ranking/data/DB sauf chantier explicitement séparé ;
- pas de déploiement Vercel sans autorisation explicite ;
- composants partagés harmonisés seulement si la preuve montre un gain transversal net.

## Baseline audit
Audit initial : 70 routes × 4 viewports = 280 captures.

Constats transversaux :
- styles inter-pages encore hétérogènes ;
- densité et rythme vertical variables ;
- certains états vides trop dominants ;
- pages outil (`/map`, `/pro`, `/vendre/dossier`) plus datées visuellement que les meilleures pages du site ;
- pages SEO locales trop utilitaires ;
- pages éditoriales parfois trop génériques.

# ROADMAP

## P0 — Polish impact utilisateur direct

### P0.1 — Map : hiérarchie panneau / carte
Pages : `/map`

Goal : faire passer la page d’un rendu "outil interne" à une expérience de recherche immobilière premium, avec une hiérarchie claire entre recherche, filtres, résultats et carte.

Succès :
- panneau décisionnel plus compact et plus lisible ;
- actions primaires/secondaires clairement hiérarchisées ;
- carte visuellement dominante ;
- mobile sans empilement confus ;
- aucun changement logique de recherche.

Référence : langage visuel AkarFinder premium déjà validé sur les cartes Search indexées + rythme/espacement des meilleures pages éditoriales actuelles.

BEFORE :
- captures `/map` 390×844 / 430×932 / 768×900 / 1280×900 inspectées ;
- source : dernier artifact all-pages disponible avant le lot P0.1 ;
- les fichiers `/map` observés sont inchangés par rapport à la base de la branche P0 ;
- findings de cet artifact : 0.

Implémentation P0.1 :
- mobile : toolbar raccourcie en supprimant le titre redondant déjà porté par le sélecteur ville ;
- mobile : contrôles plus compacts ;
- mobile : decision sheet réduite aux informations/actions essentielles ;
- tablette : decision sheet limitée pour rendre davantage de carte visible ;
- desktop : rail ramené à 360 px fixes au lieu d’un split 60/40 trop large ;
- desktop : chrome et espacements du rail resserrés ;
- logique métier, data, ranking et DB inchangés.

HEAD fonctionnel P0.1 : `2b722755ef988eff16d5de09bd194390c5f75f56`.

État : IMPLEMENTED — AFTER exact-head + comparaison aux 4 viewports requis avant clôture.

### P0.2 — Search : état vide + densité résultats
Pages : `/search`

Goal : rendre l’état vide utile et compact, puis assurer une densité cohérente dès qu’il y a des résultats.

Succès :
- état vide moins massif ;
- meilleure continuité filtre → résultats ;
- pas de rupture avec les cartes indexées certifiées ;
- responsive 390/430/768/1280.

Dépendance : ne pas créer de conflit avec le lot Search Indexed Visual tant que PR #947 n’est pas mergée.

### P0.3 — Projet utilisateur
Pages : `/mon-projet`, `/profil-recherche`

Goal : réduire les espaces morts, clarifier progression et actions, rendre les écrans plus équilibrés.

Succès :
- densité cohérente ;
- CTA principal évident ;
- progression compréhensible sans lecture exhaustive ;
- mobile plus compact.

### P0.4 — Vendre / dossier
Pages : `/vendre/dossier`

Goal : simplifier la charge visuelle et réduire la compétition entre contenu principal et colonne d’accompagnement.

Succès :
- priorité de lecture nette ;
- colonne secondaire moins lourde ;
- formulaire/étapes plus respirants ;
- mobile sans surcharge.

### P0.5 — Pro / Leads
Pages : `/pro`, `/pro/leads`

Goal : aligner l’espace Pro avec le niveau visuel du front public tout en conservant son caractère opérationnel.

Succès :
- architecture visuelle modernisée ;
- contraste et densité maîtrisés ;
- tableaux/cartes/actions plus cohérents ;
- pas de perte de lisibilité métier.

### P0.6 — SEO local premium
Pages : `/immobilier/[city]/[district]`, `/quartiers/[city]/[neighborhood]`

Goal : sortir du rendu purement utilitaire et créer une page locale éditoriale crédible sans gonfler artificiellement le contenu.

Succès :
- hero/local context plus qualitatif ;
- sections mieux rythmées ;
- listings et contenu éditorial clairement séparés ;
- cohérence avec `/immobilier` et `/quartiers`.

## P1 — Harmonisation des familles de pages
- `/acheter`, `/louer`, `/neuf`
- `/immobilier`, `/quartiers`
- `/favorites`, `/compare`, `/alerts`
- `/investir`, `/mre`, `/credit`
- `/accompagnement`, `/faq`, `/contact`, `/a-propos`

Goal : harmoniser rythme, cards, headers secondaires, états vides, CTA et personnalité de marque.

## P2 — Système global / détails fins
- rayons ;
- ombres ;
- largeurs max ;
- rythme vertical ;
- headers secondaires ;
- CTA secondaires ;
- états vides ;
- cohérence typographique ;
- petits écarts responsive ;
- pages légales conservées sobres.

## Ordre d’exécution
1. P0.1 Map
2. P0.2 Search
3. P0.3 Projet utilisateur
4. P0.4 Vendre dossier
5. P0.5 Pro / Leads
6. P0.6 SEO local
7. P1
8. P2

## État actuel
- branche : `feat/ux-ui-polish-p0`
- PR : `#949` draft.
- P0.1 : IMPLEMENTED — AFTER exact-head requis.
- P0.2 : WAIT dependency PR #947.
- aucun déploiement Vercel.

## NEXT EXACT
Obtenir la CI/artifact du HEAD P0.1, inspecter AFTER `/map` 390/430/768/1280, comparer au BEFORE et au contrat visuel, corriger si nécessaire, puis clôturer P0.1 avant P0.2.
