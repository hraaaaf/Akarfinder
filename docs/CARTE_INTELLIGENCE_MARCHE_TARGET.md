# AkarFinder — Référentiel cible Carte intelligence marché

Date de gel : 2026-08-15

Ce document est le contrat cible du chantier Carte. Le résultat final doit converger vers le mockup validé par le produit : trois modes réels `Prix / Densité / Annonces`, heat map par quartier, légende contextuelle, fiche quartier riche et CTA Search. Aucun lot ne peut être déclaré 10/10 si un élément manque, est simulé ou repose sur une donnée non défendable.

## Référence visuelle canonique

Le JPEG fourni et validé par le produit est la **référence visuelle exacte** du chantier, pas une inspiration.

- dimensions source : **1448 × 1086 px** ;
- SHA-256 source canonique : `4b6912480c5ce7dce6b04c5d0f8848b0be319955d220db84d8365a76ca66eac7` ;
- aperçu repo : `docs/assets/carte-intelligence-marche-reference.webp` ;
- dimensions aperçu : **362 × 272 px** ;
- SHA-256 aperçu : `ca973a84f74badfcb10ba6dd9297fb659a19cc3467c55e4b16264bd80bf76cb4`.

L’aperçu repo est une dérivation légère destinée aux contrôles CI et aux comparaisons de composition. **Il ne remplace pas la source canonique 1448×1086**. Le hash source ci-dessus verrouille l’identité du mockup validé.

Le résultat final doit reproduire fidèlement sa composition, sa hiérarchie, ses états et son comportement :

1. **Vue Prix** — ville en tête, tabs `Prix / Densité / Annonces`, `Prix` actif, quartiers en choroplèthe à intensité prix, légende `Prix médian / m²`, fiche compacte du quartier sélectionné, KPI et CTA `Rechercher dans ce quartier`.
2. **Vue Densité** — même géométrie et même chrome, `Densité` actif, dégradé bleu, légende `Densité d’annonces / km²`, insight contextualisé seulement s’il est calculable, fiche compacte et CTA.
3. **Vue Annonces** — même géométrie et même chrome, `Annonces` actif, dégradé vert, légende `Nombre d’annonces`, volume mis en avant dans la fiche compacte et CTA.
4. **Fiche Quartier** — mini-carte/polygone en tête, `Prix médian / m²`, `Densité d’annonces`, `Nombre d’annonces`, `Confiance des données`, catégories dominantes, tendance seulement si défendable, CTA `Voir la page quartier` et `Rechercher cette zone`.
5. **Navigation mobile** — bottom-nav globale `Explorer / Favoris / Carte / Alertes / Compte`, `Carte` active, sans footer secondaire qui concurrence le viewport.
6. **Langage visuel** — fond clair, surfaces blanches premium, bleu AkarFinder, rayons/ombres sobres, contenu utile au-dessus de la ligne de flottaison, panneaux compacts et lisibles.

### Exactitude visuelle vs vérité des données

`Exactement conforme au mockup` signifie que la **structure visuelle, la hiérarchie, les modes, les interactions, les composants, les positions relatives, les palettes et les états** doivent converger vers ce référentiel.

Les valeurs illustratives du mockup (`18 000 MAD/m²`, `120`, `450/km²`, `+4,1 %`, etc.) ne sont **jamais hardcodées** pour imiter l’image. Elles sont remplacées au runtime par les vraies valeurs du scope sélectionné, ou par un état indisponible/neutre si la preuve est insuffisante. La vérité data prime sur la copie littérale d’un chiffre d’exemple.

La certification finale C7 doit contenir une comparaison côte à côte contre le référentiel aux viewports 390 / 430 / 768 / 1280. Une divergence structurelle visible non justifiée empêche le 10/10.

## Fondations déjà récupérées

Le chantier historique n’est pas perdu et ne doit pas être réécrit :

- PR #371 — P1B.1 : couche territoriale MapLibre + style AkarFinder.
- PR #376 — P1B.2 : mode prix exact, médiane/fourchette/n/confiance, sans interpolation.
- PR #382/#381 — P1B.3 : join read-only listings publics ↔ quartiers canoniques.
- PR #462 — P1B.15 : certification Geo fail-closed ; le choroplèthe quartier était explicitement bloqué faute de polygones neighborhood-grade certifiés.
- PR #463 — P1C.1 : Shadow Offer par quartier avec volume, transaction mix, typologies, médianes, surface et prix/m².
- PR #464/#465 — P1C.2 : moteur de fiabilité et preflights robustes.
- PR #466+ — activation publique maintenue OFF lorsque représentativité insuffisante.

Conclusion : réutiliser ces contrats. Le chemin critique restant est `géométrie quartier certifiée → métriques publiques fail-closed → choroplèthe → UX cible → certification`.

### Baseline C1 vérifiée

- le dernier gate Geo historique #462 certifiait **0 binding de polygone quartier** ;
- les 16 géométries Casablanca existantes étaient des arrondissements OSM `admin_level=10`, pas des quartiers ;
- les données Carte Rabat actuelles sont des points/repères, pas les polygones exigés par le heat map ;
- le Registry actuel marque Agdal, Hay Riad et Hassan `map_eligible=true`, tandis que Souissi reste `map_eligible=false` ;
- aucune activation `map_eligible` ne vaut preuve de géométrie.

## Définitions canoniques

### Prix
- métrique d’affichage : médiane `DH/m²` ;
- calcul séparé par transaction ;
- jamais de moyenne naïve ;
- jamais d’imputation ;
- une zone sans preuve suffisante reste neutre/non colorée avec état explicite.

### Volume d’annonces
- nombre brut d’annonces éligibles dans le snapshot de marché courant ;
- dénominateur/version de snapshot exposé dans les preuves ;
- aucun doublon artificiel ne doit gonfler le volume.

### Densité
- `volume d’annonces éligibles / surface du polygone en km²` ;
- surface calculée uniquement sur une géométrie certifiée ;
- unité UI : `annonces/km²`.

### Quartier
- une zone colorée doit être liée à une géométrie neighborhood-grade sourcée, typée, topology-auditée et liée à une entité canonique ;
- arrondissement administratif ≠ quartier par défaut ;
- aucune géométrie dessinée à la main pour « faire comme le mockup » sans contrat de provenance.

## Roadmap d’exécution

La progression stricte du chantier Carte = lots `C0→C7` CLOSED / 8.

### C0 — Référentiel + audit de récupération
État : CURRENT.

Livrables :
- présent contrat cible ;
- identité du mockup source verrouillée par SHA-256 + aperçu repo vérifiable ;
- inventaire des PR historiques réutilisables ;
- distinction explicite entre fondation existante et gap réel ;
- smoke fonctionnel basique MapLibre conservé comme garde de régression.

Gate : aucune ambiguïté sur les 10 critères finaux ni sur le référentiel visuel exact.

### C1 — Géométrie quartier certifiée
Objectif : rendre possible un vrai heat map par quartier.

Pilotage initial : Rabat, aligné avec le mockup, avec au minimum Agdal, Hay Riad, Souissi et une définition canonique défendable de la zone centre affichée.

Livrables :
- sources/provenance par polygone ;
- type territorial exact ;
- binding entité canonique ↔ geometry ;
- topology checks ;
- aire km² certifiée ;
- API GeoJSON fail-closed.

Gate : 0 confusion arrondissement/quartier, 0 overlap incohérent, 0 polygon inventé.

### C2 — Dataset métriques quartier v2
Objectif : brancher les fondations P1C existantes sur les trois métriques cible.

Livrables :
- `price_median_mad_m2` ;
- `listing_count` ;
- `listing_density_km2` ;
- transaction scope ;
- sample count ;
- fraîcheur ;
- provenance ;
- confidence/reliability ;
- snapshot/version.

Gate : ventes/locations séparées, NULL conservé, dédup appliqué, densité impossible sans aire certifiée.

### C3 — API publique fail-closed + échelles de couleur
Objectif : produire un GeoJSON consommable par la Carte sans trahir la qualité des données.

Livrables :
- endpoint public read-only ;
- trois modes `price / density / listings` ;
- classification de couleurs déterministe ;
- zones insuffisantes = neutres ;
- légende calculée depuis la même échelle que les fills ;
- palette Prix conforme au référentiel ;
- palette Densité = dégradé bleu conforme au référentiel ;
- palette Annonces = dégradé vert conforme au référentiel ;
- cache/fraîcheur explicites.

Gate : la couleur d’un polygone doit être reproductible depuis le payload API et sa légende.

### C4 — Heat map interactive conforme au mockup
Objectif : faire correspondre l’écran Carte principal au référentiel canonique.

Livrables :
- tabs réelles `Prix / Densité / Annonces` avec géométrie et hiérarchie conformes au mockup ;
- commutation fluide et mémorisée dans l’URL/état canonique ;
- remplissage des polygones selon la métrique active ;
- légende `Bas → Élevé` contextuelle et positionnée comme le référentiel ;
- ville/zone conservées lors du changement de mode ;
- sélection d’un quartier au clic/touch ;
- selected state visuel clair ;
- fiche compacte basse conforme aux trois écrans du mockup ;
- bottom-nav Carte active ;
- aucun footer secondaire mobile.

Gate : aucune tab décorative ; chaque changement modifie réellement la métrique et le rendu. Les captures sont comparées côte à côte au mockup canonique.

### C5 — Fiche quartier riche
Objectif : reproduire fidèlement la 4e vue du référentiel.

Livrables :
- header quartier sélectionné avec navigation et actions cohérentes ;
- mini-carte avec polygone sélectionné ;
- prix médian/m² ;
- densité ;
- nombre d’annonces ;
- confiance des données + score si calculable ;
- catégories dominantes ;
- tendance 6 mois uniquement si historique suffisant ;
- CTA `Voir la page quartier` ;
- CTA `Rechercher cette zone` avec filtres cohérents.

Gate : aucun KPI inventé ; toute tendance absente reste explicitement indisponible ; la composition doit correspondre au 4e écran du mockup canonique.

### C6 — Fondation « nos annonces »
Objectif : rendre la même intelligence exploitable pour les futures annonces propres AkarFinder sans modifier le référentiel visuel actuel.

Livrables data :
- provenance `market / AkarFinder-owned / partner` ;
- agrégations filtrables par provenance ;
- capacité future de comparer marché total vs stock propre ;
- aucune UI supplémentaire obligatoire dans la cible C0→C7.

Gate : aucun changement de métrique de marché lorsque le scope provenance change.

### C7 — Certification 10/10 et closeout
Objectif : ne fermer la Carte qu’après preuve fonctionnelle, data et visuelle.

Matrice minimale : 390 / 430 / 768 / 1280.

Preuves :
- tests contrats ;
- TypeScript + production build ;
- smoke MapLibre ;
- smoke modes Prix/Densité/Annonces ;
- clic polygone → fiche ;
- CTA Search ;
- screenshots exact-head de chaque mode + fiche quartier ;
- comparaison côte à côte avec l’aperçu repo et revue humaine contre la source canonique 1448×1086 ;
- aucune erreur console bloquante ;
- aucun overflow.

## Contrat final 10/10

La Carte ne peut être déclarée 10/10 que si les 10 critères suivants sont tous prouvés :

1. Carte MapLibre charge et reste manipulable.
2. Polygones de quartier réellement certifiés et sourcés.
3. Mode Prix = heat map médiane DH/m² réelle et composition conforme à la Vue Prix canonique.
4. Mode Densité = annonces/km² réel et composition conforme à la Vue Densité canonique.
5. Mode Annonces = volume brut réel et composition conforme à la Vue Annonces canonique.
6. Les trois modes partagent une légende cohérente avec leurs couleurs et placée conformément au référentiel.
7. Un clic quartier ouvre une fiche correspondant exactement à la zone sélectionnée et un selected state conforme au mockup.
8. La fiche expose les KPI du référentiel sans donnée inventée et reproduit la composition de la Vue Fiche Quartier.
9. `Rechercher cette zone` transmet correctement le contexte à Search ; la navigation mobile reste celle du mockup.
10. Le rendu 390/430/768/1280 converge visuellement vers le référentiel sans divergence structurelle non justifiée, et la base de provenance permet les futures annonces propres.

Score de certification : `nombre de critères prouvés / 10`. **`10/10` exige 10 preuves.**

## Ordre critique

`C0 → C1 → C2 → C3 → C4 → C5 → C6 → C7`

C1 est le premier vrai bloqueur. La couche historique savait déjà calculer des métriques Shadow, mais le choroplèthe quartier public avait été volontairement bloqué faute de géométrie neighborhood-grade certifiée. On reprend exactement à cet endroit au lieu de reconstruire l’existant.
