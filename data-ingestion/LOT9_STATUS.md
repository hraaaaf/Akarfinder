# Lot 9 Status — Mubawab Full Coverage

**Status: 🟡 OPEN — matrice classique éteinte à 29 741 IDs ; réconciliation catalogue vers 100 % en cours**

## Goal

Parcourir exhaustivement le périmètre Mubawab publiquement accessible, autorisé et pertinent, mesurer le stock réel d'annonces uniques disponible et réconcilier intégralement cet inventaire avec le catalogue public Mubawab avant d'ouvrir une deuxième source.

**Critère produit non négociable : Lot 9 ne se ferme pas à un seuil arbitraire de 30K, 50K ou 90K. La cible est 100 % des annonces Mubawab publiquement accessibles et pertinentes, dédupliquées par `source_id`, sous réserve des limites de sécurité et d'accès documentées ci-dessous.**

Le compteur marketing global Mubawab n'est pas assimilé aveuglément à un nombre d'URLs uniques : tout écart résiduel entre compteur public, surfaces accessibles et `source_id` uniques doit être expliqué et quantifié.

Le Lot 9 mesure des `source_id` uniques de discovery. Le passage complet en objets canoniques et la certification du dataset massif relèvent du Lot 10.

## Safety boundary

- aucun write production ;
- aucun déploiement Vercel ;
- aucun merge automatique ;
- aucun contournement CAPTCHA / authentification / contrôle d'accès ;
- contrôle robots avant toute requête live ;
- arrêt global sur 403 / 429 explicite ;
- aucune page détail dans les campagnes de discovery ;
- aucun téléchargement d'image ;
- ne jamais toucher à `scripts/scrapers/output/akarfinder.db` pendant les preuves.

## Périmètre classique certifié

- 12 villes ;
- 11 catégories activées ;
- 132 scopes initiaux `ville × catégorie` ;
- familles : appartement, terrain, villa, maison, commercial, riad ;
- vente + location classique ;
- bureaux `st` toujours désactivés tant que leurs routes distinctes ne sont pas vérifiées ;
- location vacances non couverte dans la matrice classique.

## Preuves structurantes

- planner : run `33881976620` ✅ ;
- bounded runner : run `33882260391` ✅ ;
- micro-vague live : run `33882641901` ✅ ;
- state/campaign persistants : run `33887383769` ✅ ;
- première campagne persistante : run `33889776735` ✅, 573 IDs uniques ;
- reprise inter-run : run `33890843084` ✅, cumul 889 IDs uniques ;
- policy de montée en charge : run `33890791066` ✅ ;
- scale-120 : run `33891104950` ✅, cumul 3 853 IDs uniques ;
- scale-180 : run `33891846308` ✅, cumul 6 599 IDs uniques ;
- scale-216 : run `33892580900` ✅, cumul 10 925 IDs uniques ;
- scale-288 : run `33893444230` ✅, cumul 18 294 IDs uniques ;
- extinction finale matrice classique : run `33899083917` ✅, **29 741 IDs uniques** ;
- artifact baseline finale : `9947122701`, digest `sha256:1b27ba2946bd671644e6ec1bf03a396df6c86a51706f5a17265466d041a0cb6d` ;
- probe national `sc/cc` : run `33900816318` ✅ ;
- artifact probe : `9947658003`, digest `sha256:76c7cc595ce60dda64e3d5dbb0978fc26f5493b72d5f6e36b757775ddb70f5f7` ;
- deep probe bureaux pages 3–10 : run `33905288725` ✅ ;
- artifact deep probe : `9949244830`, digest `sha256:b4bf60fab864007b8a0fa3824d28aca132701b5b074df6113c47093e4a541c6d`.

## Baseline classique finale

Run `33899083917` ✅ SUCCESS.

- **29 741 IDs uniques** dans le checkpoint final ;
- matrice classique arrivée à extinction technique ;
- ce checkpoint devient la baseline de comparaison pour toutes les surfaces catalogue supplémentaires ;
- aucune page détail, image, DB ou production impliquée dans les probes de réconciliation.

## Catalog reconciliation

Le compteur public Mubawab observé le 2026-09-04 oscille autour de **102K biens immobiliers** sur le site Maroc selon la variante de page.

Ce compteur n'est pas traité comme 102K annonces uniques exploitables. Il sert de référence de couverture obligatoire à réconcilier.

Écart apparent après extinction classique :

- catalogue public affiché : ~102K ;
- discovery classique certifiée : **29 741 IDs uniques** ;
- couverture brute apparente : ~29 % ;
- delta apparent : ~72K.

Cet écart interdit de fermer le Lot 9 sur la seule extinction des 132 scopes classiques.

## Probe national `sc/cc` — preuve du 2026-09-04

Run `33900816318` ✅ SUCCESS sur HEAD produit `a63740d66c379b335f266618c99c0e49079eb6fb`.

Sécurité :

- 6 surfaces ;
- 2 pages par surface ;
- 12 requêtes max ;
- délai 2 750 ms ;
- robots vérifiés ;
- 0 détail / 0 image / 0 DB / 0 prod.

Résultat global :

- **334 IDs uniques observés** ;
- **173 déjà présents** dans la baseline classique ;
- **161 réellement nouveaux** ;
- **44 doublons inter-surfaces**.

Détail :

- `cc-all-sale` : 62 uniques, 49 connus, **13 nouveaux**, overlap 79,0 % ;
- `cc-all-rent` : 64 uniques, 45 connus, **19 nouveaux**, overlap 70,3 % ;
- `sc-apartment-sale` : 62 uniques, 48 connus, **14 nouveaux**, overlap 77,4 % ;
- `sc-office-sale` : 62 uniques, 0 connu, **62 nouveaux**, overlap **0 %** ;
- `sc-office-rent` : 64 uniques, 0 connu, **64 nouveaux**, overlap **0 %** ;
- `sc-commercial-rent` : 64 uniques, 59 connus, **5 nouveaux**, overlap 92,2 %.

## Deep probe bureaux — preuve du 2026-09-04

Run `33905288725` ✅ SUCCESS.

Sécurité :

- 2 surfaces ;
- pages 3 à 10 ;
- 8 pages par surface ;
- 16 requêtes max ;
- délai 2 750 ms ;
- robots vérifiés ;
- 0 détail / 0 image / 0 DB / 0 prod.

Résultat :

- `sc-office-sale` pages 3–10 : **248 IDs uniques, 248 nouveaux vs baseline 29 741, overlap 0 %** ;
- `sc-office-rent` pages 3–10 : **256 IDs uniques, 256 nouveaux vs baseline 29 741, overlap 0 %** ;
- total deep probe : **504 IDs uniques, 504 nouveaux vs baseline, 0 doublon inter-surface**.

Important : ce deep probe a été comparé à la baseline classique, pas à l'artifact du premier probe `sc/cc`. Le cumul global exact entre les deux probes n'est donc pas encore certifié. Le prochain état cumulatif doit persister les listes de `source_id` et faire une union globale explicite avant d'afficher un compteur total unique.

### Décision

Les surfaces `sc/bureaux-et-commerces-a-vendre` et `sc/bureaux-et-commerces-a-louer` sont un réservoir confirmé de stock manquant.

Cela ne justifie toujours pas d'activer `office_sale/rent` dans la matrice `st`, car les routes `sc` sont agrégées `bureaux-et-commerces` et ne prouvent pas une taxonomie distincte Bureau vs Local commercial.

## Closure rule — 100 % Mubawab

Lot 9 ne sera CLOSED que si les conditions suivantes sont satisfaites :

### A — Full Coverage technique

- toutes les partitions autorisées connues sont `completed`, ou arrêtées avec raison de sécurité documentée ;
- aucun checkpoint perdu ;
- manifest final avec pages, uniques, doublons, erreurs, stops et distribution par scope.

### B — Catalog reconciliation exhaustive

- inventaire complet des familles / transactions / villes / zones réellement présentes sur Mubawab ;
- couverture de toutes les routes publiques, autorisées, pertinentes et sémantiquement sûres ;
- pagination de chaque surface jusqu'à extinction mesurable (`zero_new_unique_ids` ou fin de catalogue) ;
- union globale persistante de tous les `source_id` afin d'éviter tout double comptage entre `st`, `sc`, `cc`, vacances et autres surfaces ;
- comparaison finale `catalogue public affiché ↔ IDs accessibles ↔ IDs uniques discovery` ;
- aucun delta significatif non expliqué.

### C — Interdiction de faux 100 %

Un ratio de couverture ne peut être annoncé comme 100 % que si son dénominateur est prouvé. Si le compteur public inclut des projets, unités, doublons, annonces non indexables ou contenus non accessibles, ces éléments doivent être quantifiés séparément au lieu d'être artificiellement comptés comme annonces uniques.

## Next exact

1. transformer les probes `sc/cc` en état cumulatif persistant qui conserve les `source_id` eux-mêmes ;
2. recalculer l'union exacte `baseline 29 741 + probe national + deep probe bureaux` ;
3. crawler les surfaces bureaux `sc` par fenêtres bornées jusqu'à extinction ;
4. auditer et couvrir villes/zones manquantes ;
5. auditer et couvrir location vacances ;
6. auditer immobilier neuf / projets et déterminer ce qui représente des annonces unitaires vs des agrégats de projet ;
7. auditer les agrégats `cc` pour détecter tout stock encore absent après les surfaces spécialisées ;
8. poursuivre jusqu'à une réconciliation complète du catalogue public ;
9. seulement ensuite fermer Lot 9 et ouvrir Lot 10.
