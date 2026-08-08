# BENCHMARK-SERP-1 — AkarFinder Search Results Experience

**Date : 2026-08-08**  
**Statut : READ-ONLY — FIRST PASS COMPLETE**  
**Produit modifié : non**

## Verdict

AkarFinder possède une architecture et une différenciation potentielles supérieures à une SERP immobilière classique, mais `/search` expose trop de structure, de texte et de segmentation avant et entre les annonces.

Verdict du Benchmark Reviewer : **CHANGES_REQUIRED avant closeout UX Search**.

Direction recommandée :

`RECHERCHE → FILTRES COMPACTS → COMPTEUR/TRI → ANNONCE → ANNONCE → ANNONCE`

L’intelligence AkarFinder doit améliorer les résultats, pas devenir un obstacle visuel avant eux.

## Références benchmarkées

### Maroc
- Mubawab ;
- Agenz.

### International
- Zillow ;
- Rightmove.

Ces références servent à mesurer friction, hiérarchie d’information et efficacité. Elles ne sont pas des modèles à copier.

## Méthode et limites

AkarFinder a été audité sur la structure réelle de `/search` et ses composants publics. Les concurrents ont été observés via leurs surfaces publiques accessibles et documentation publique. Les scores sont heuristiques comparatifs, pas des mesures de conversion.

La certification du lot produit suivant devra ajouter des captures réelles 360/390/1280/1440 et mesures de viewport sur le head exact.

## Score comparatif — premier passage

| Produit | Score /10 | Force principale | Faiblesse principale |
|---|---:|---|---|
| AkarFinder actuel | **6,9** | différenciation, provenance, intelligence, Search↔Map | bruit avant résultats, segmentation, jargon, cards incohérentes |
| Mubawab | **7,1** | accès direct au flux d’annonces | densité parfois bruyante |
| Agenz | **7,9** | cards riches, prix/facts visibles, Liste/Carte | descriptions/badges parfois lourds |
| Rightmove | **8,7** | efficacité Search → filtres → résultats | intelligence différenciante limitée |
| Zillow | **8,8** | recherche/map/filtres intégrés | conventions US non transposables telles quelles |
| Potentiel AkarFinder après simplification | **9,3–9,5** | moteur + Property Graph + Geo + provenance avec UX rapide | dépend de la discipline de simplification |

## Findings P0

### F1 — Trop d’éléments avant la première annonce

La SERP actuelle affiche header, éventuel projet actif, grande zone de titre, compteur, filtres, lien Compagnon, deuxième zone de titre/récapitulatif, explication du tri, switch de vue et chips avant le flux.

**Recommandation : REMOVE / SIMPLIFY.** Première annonce dans le premier écran utile après la recherche, surtout mobile.

### F2 — Segmentation commerciale visible trop lourde

Conserver la logique promoteur premium → agence partenaire → direct AkarFinder → public, mais supprimer les gros blocs descriptifs qui cassent le scroll.

**Recommandation : KEEP + SIMPLIFY.** Flux continu, badge sur la card.

### F3 — Cards sans grammaire commune

Les annonces intégrées et les résultats externes utilisent des structures visuelles différentes.

**Recommandation : IMPROVE.** `IMAGE → PRIX → TITRE → LOCALISATION → 3–4 FACTS → PROVENANCE → ACTION`.

### F4 — Wording trop proche de l’architecture interne

Retirer ou réduire : catégorie de publication, annonces publiques indexées, analysé/analyse partielle lorsqu’une explication est nécessaire, offres observées comme grande section, explication textuelle du ranking.

**Recommandation : REMOVE.** Ne jamais expliquer ce que l’interface peut simplement exécuter.

### F5 — Prix dominant mais couverture vraie

Garder `PHOTO → PRIX`, mais traiter la récupération autorisée des prix manquants avant de pénaliser fortement les résultats réellement sans prix.

### F6 — Mobile comme contrainte de simplification

Concevoir 390 px d’abord : recherche compacte, filtres essentiels, compteur/tri, résultat. Le reste devient progressif.

### F7 — Desktop enrichit sans bruit

Desktop peut ajouter split Liste/Carte, davantage de facts et hover/preview, sans réintroduire les paragraphes supprimés sur mobile.

## Ce qu’il faut conserver

- priorité commerciale/provenance avec pertinence minimale ;
- séparation statut commercial / qualité objective ;
- grande image sur cards riches ;
- prix très visible ;
- localisation proche du titre ;
- facts essentiels compacts ;
- continuité Search ↔ Map ;
- provenance/lien source lorsque nécessaires ;
- intelligence AkarFinder disponible en profondeur, hors chemin critique.

## Opportunités AkarFinder

- flux aussi rapide qu’un portail classique avec provenance compréhensible ;
- Property Graph derrière une card simple ;
- Search ↔ Map ↔ Quartier cohérents ;
- comparaison plus intelligente ;
- illustrations contextuelles honnêtes pour les biens sans photo autorisée.

## Priorités recommandées

### P0
1. `SEARCH-UX-FAST-1` ;
2. `SEARCH-WORDING-PURITY-1` ;
3. `SEARCH-CONTINUOUS-FLOW-1` ;
4. `PRICE-COVERAGE-RECOVERY-1` ;
5. `RANKING-QUALITY-1` ;
6. `UNIFIED-LISTING-CARD-1`.

### P1
7. `CONTEXTUAL-VISUAL-ASSETS-1` ;
8. attribution déterministe ;
9. simplification actions secondaires ;
10. split Liste/Carte desktop sans surcharge.

## Décisions fondateur déjà verrouillées

- flux continu : GO ;
- mobile = référence : GO ;
- desktop = enrichissement sans bruit : GO ;
- Benchmark Reviewer avec `CHANGES_REQUIRED` : GO ;
- zéro jargon grand public : GO.

## Verdict mobile

Score actuel estimé : **6,2/10**. Objectif prochain lot : **≥9/10**.

## Verdict desktop

Score actuel estimé : **7,2/10**. Objectif : **≥9/10 sans dégrader mobile**.

## Conclusion

Le benchmark recommande d’abord de **retirer, fusionner et hiérarchiser**. AkarFinder peut dépasser les portails classiques en utilisant davantage d’intelligence pour produire une interface plus simple.

**Next product lot recommandé : `SEARCH-UX-FAST-1`.**