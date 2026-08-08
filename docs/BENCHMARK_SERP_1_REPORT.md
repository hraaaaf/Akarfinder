# BENCHMARK-SERP-1 — AkarFinder Search Results Experience

**Date : 2026-08-08**  
**Statut : READ-ONLY — FIRST PASS COMPLETE**  
**Produit modifié : non**

## 1. Verdict

AkarFinder possède une architecture de données et une différenciation potentielle supérieures à une SERP immobilière classique, mais l’expérience actuelle de `/search` expose trop de structure, de texte et de segmentation avant et entre les annonces.

Verdict du Benchmark Reviewer : **CHANGES_REQUIRED avant tout closeout UX Search**.

Le problème principal n’est pas le manque de fonctionnalités. C’est l’ordre de présentation : AkarFinder demande à l’utilisateur de comprendre le produit avant de lui permettre de consommer rapidement les résultats.

Direction recommandée :

`RECHERCHE → FILTRES COMPACTS → COMPTEUR/TRI → ANNONCE → ANNONCE → ANNONCE`

L’intelligence AkarFinder doit améliorer les résultats, pas constituer un obstacle visuel avant eux.

## 2. Références benchmarkées

### Maroc

- Mubawab — SERP appartements Agdal/Rabat ;
- Agenz — SERP appartements Rabat/Agdal et expérience Liste/Carte ;
- contexte secondaire : applications et promesses de recherche locales observables publiquement.

### International

- Zillow — recherche par localisation, filtres, map/list et recherche mobile ;
- Rightmove — recherche par zone, filtres persistants, tri et bascule carte/liste.

Ces références ne sont pas des modèles à copier. Elles servent à mesurer la friction et la hiérarchie d’information.

## 3. Méthode et limites de preuve

AkarFinder a été audité sur le `main` courant à partir de la structure réelle de `/search` et de ses composants publics. Les références concurrentes ont été auditées sur leurs surfaces publiques indexables et leur documentation publique de recherche disponible le 2026-08-08.

Les scores sont des **scores UX heuristiques comparatifs**, pas des mesures scientifiques de conversion.

Le premier passage établit la direction produit. Une certification finale d’un futur lot devra ajouter des captures réelles 360/390/1280/1440 et des mesures de viewport sur le head exact du lot.

## 4. Score comparatif — premier passage

| Produit | Score global /10 | Force principale | Faiblesse principale |
|---|---:|---|---|
| AkarFinder actuel | **6,9** | différenciation, provenance, intelligence, Search↔Map | bruit avant les résultats, segmentation, jargon, incohérence de cards |
| Mubawab | **7,1** | accès direct à un grand flux d’annonces | densité parfois bruyante, nombreux CTA/extras |
| Agenz | **7,9** | cards riches, prix/facts visibles, Liste/Carte | descriptions et badges peuvent devenir lourds |
| Rightmove | **8,7** | efficacité Search → filtres → résultats | différenciation intelligence limitée face au potentiel AkarFinder |
| Zillow | **8,8** | recherche/map/filtres extrêmement intégrés | conventions et catégories propres au marché US, non transposables telles quelles |
| Potentiel AkarFinder après simplification | **9,3–9,5** | moteur + Property Graph + Geo + provenance avec UX plus rapide | dépend de la discipline de simplification |

## 5. Findings prioritaires

### F1 — Trop d’éléments avant la première annonce — P0

**OBSERVATION**  
La SERP actuelle affiche header, éventuel projet actif, grande zone de titre, compteur, filtres, lien Compagnon, deuxième zone de titre/récapitulatif, explication du tri, switch de vue et chips avant le flux de biens.

**POURQUOI CELA ÉCHOUE**  
L’utilisateur a déjà exprimé son intention en lançant la recherche. Réexpliquer le fonctionnement retarde la gratification principale : voir des biens.

**IMPACT**  
Perception de lourdeur et de produit complexe.

**OPPORTUNITÉ AKARFINDER**  
Conserver la profondeur du moteur mais supprimer sa présence éditoriale dans le chemin critique.

**RECOMMANDATION : REMOVE / SIMPLIFY**  
Première annonce dans le premier écran utile après la recherche, surtout sur mobile.

### F2 — La segmentation commerciale casse le scroll — P0

**OBSERVATION**  
L’ordre actuel est volontairement : promoteur premium → agence partenaire → direct AkarFinder → public, avec sous-groupes de niveau d’information.

**POURQUOI CELA ÉCHOUE VISUELLEMENT**  
La logique d’ordre est valable, mais de gros titres/descriptions entre catégories transforment la SERP en rapport explicatif.

**RECOMMANDATION : KEEP + SIMPLIFY**  
Conserver la priorité en logique de classement, mais présenter **un flux continu**. Le badge de la card suffit à signaler l’origine utile.

### F3 — Les cards n’ont pas une grammaire commune — P0/P1

**OBSERVATION**  
Les annonces intégrées utilisent une grande image puis prix/titre/localisation/facts. Les résultats Gateway externes utilisent une autre card avec image plus petite, source, labels, snippet, similarité, attribution, URL et passeport.

**IMPACT**  
Le flux donne l’impression de mélanger plusieurs produits.

**RECOMMANDATION : IMPROVE**  
Une seule grammaire :

`IMAGE → PRIX → TITRE → LOCALISATION → 3–4 FACTS → PROVENANCE → ACTION`

Les permissions changent selon l’origine ; la structure visuelle principale reste stable.

### F4 — Le wording expose trop notre architecture mentale — P0

Expressions à retirer ou fortement réduire des surfaces transactionnelles :

- catégorie de publication ;
- annonces publiques indexées ;
- analysé / analyse partielle lorsque cela exige une explication ;
- offres observées sur le web comme grande section ;
- explication textuelle de l’ordre de ranking.

**RECOMMANDATION : REMOVE**  
Ne jamais expliquer un comportement que l’interface peut simplement exécuter correctement.

### F5 — Le prix doit dominer visuellement, mais sa couverture doit être vraie — P0

**OBSERVATION**  
Agenz et Mubawab mettent le prix très tôt dans la lecture des biens. AkarFinder possède une bonne hiérarchie de prix sur sa card riche, mais certaines observations externes arrivent sans prix alors que la page source peut en contenir un.

**RECOMMANDATION : KEEP + IMPROVE**  
Garder `PHOTO → PRIX` comme axe principal, mais traiter la récupération autorisée du prix avant de pénaliser fortement les résultats réellement sans prix.

### F6 — Mobile doit devenir la contrainte qui simplifie tout — P0

**OBSERVATION**  
Les meilleurs patterns observés permettent d’affiner la recherche puis de voir immédiatement liste/carte. Les filtres secondaires sont regroupés derrière une action compacte.

**RECOMMANDATION : AKARFINDER_ADVANTAGE**  
Concevoir 390 px d’abord : barre recherche compacte, 3–4 chips essentiels, compteur/tri, puis résultat. Tout le reste devient progressif.

### F7 — Desktop doit exploiter l’espace, pas ajouter des explications — P1

**RECOMMANDATION**  
Desktop peut gagner une split-view Liste/Carte, davantage de facts et hover/preview. Il ne doit pas réintroduire les paragraphes supprimés sur mobile.

## 6. Ce qu’il faut conserver

- priorité commerciale/provenance déjà codée, avec pertinence minimale ;
- distinction claire entre provenance commerciale et qualité objective ;
- grande image sur les cards riches ;
- prix très visible ;
- localisation immédiatement sous le titre ;
- faits essentiels sous forme compacte ;
- continuité Search ↔ Map ;
- provenance et lien source lorsque nécessaires ;
- intelligence AkarFinder disponible en profondeur, mais hors chemin critique.

## 7. Ce qu’AkarFinder peut faire mieux que les références

### A. Flux unique + provenance compréhensible

Un flux aussi rapide qu’un portail classique, mais avec provenance et droits d’affichage fiables sans transformer la page en documentation.

### B. Property Graph derrière une card simple

Déduplication, historique, plusieurs sources et incohérences peuvent enrichir un bien après sélection plutôt que surcharger chaque card.

### C. Search ↔ Map ↔ Quartier

AkarFinder peut rendre la carte et le contexte quartier profondément cohérents avec la recherche structurée, sans forcer la carte à l’utilisateur.

### D. Comparaison plus intelligente

Comparer les biens, les sources et le contexte géographique depuis un flux visuel beaucoup plus simple.

### E. Illustrations contextuelles honnêtes

Pour les biens sans photo autorisée : bibliothèque déterministe ville/quartier/type, clairement illustrative, au lieu du même fallback répété.

## 8. Priorités recommandées issues du benchmark

### P0

1. `SEARCH-UX-FAST-1` — premier résultat immédiatement accessible ;
2. `SEARCH-WORDING-PURITY-1` — zéro jargon / suppression des explications de plomberie ;
3. `SEARCH-CONTINUOUS-FLOW-1` — catégories internes, flux visuel continu ;
4. `PRICE-COVERAGE-RECOVERY-1` — comprendre/récupérer les prix réellement disponibles quand autorisé ;
5. `RANKING-QUALITY-1` — compléter ensuite le ranking qualité/prix ;
6. `UNIFIED-LISTING-CARD-1` — même grammaire visuelle toutes origines.

### P1

7. `CONTEXTUAL-VISUAL-ASSETS-1` — illustrations ville/quartier/type ;
8. attribution déterministe des visuels ;
9. simplification des actions secondaires card ;
10. optimisation split Liste/Carte desktop sans surcharge.

### P2

11. exploitation plus poussée du Property Graph dans preview/détail/comparaison ;
12. personnalisation et signaux avancés uniquement après stabilisation du flux principal.

## 9. Décisions fondateur

Aucune nouvelle question n’est nécessaire pour ce premier passage : les décisions utiles ont déjà été verrouillées pendant le brainstorming.

- flux continu : **GO** ;
- mobile = référence : **GO** ;
- desktop = enrichissement sans bruit : **GO** ;
- Benchmark Reviewer avec `CHANGES_REQUIRED` : **GO** ;
- zéro jargon grand public : **GO**.

Une question A/B/C ne devra être posée que si un futur prototype révèle une décision non couverte par ces règles.

## 10. Verdict mobile

**Score actuel estimé : 6,2/10.**

Cause principale : la quantité de structure avant le flux de biens et le nombre de concepts concurrents dans un espace court.

Objectif prochain lot : **≥9/10**.

## 11. Verdict desktop

**Score actuel estimé : 7,2/10.**

Le desktop absorbe mieux la densité actuelle mais ne justifie pas les explications ni la fragmentation du flux.

Objectif : **≥9/10 sans dégrader mobile**.

## 12. Conclusion

Le benchmark ne recommande pas d’ajouter des fonctions à la SERP actuelle. Il recommande d’abord de **retirer, fusionner et hiérarchiser**.

AkarFinder peut dépasser les portails classiques non pas en montrant davantage d’intelligence à l’écran, mais en utilisant davantage d’intelligence pour produire une interface plus simple.

**Next product lot recommandé : `SEARCH-UX-FAST-1`.**
