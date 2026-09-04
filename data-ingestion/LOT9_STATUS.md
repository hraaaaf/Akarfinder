# Lot 9 Status — Mubawab Full Coverage

**Status: 🟡 OPEN — matrice classique éteinte à 29 741 IDs ; réconciliation catalogue en cours**

## Goal

Parcourir exhaustivement le périmètre Mubawab accessible et autorisé, mesurer le stock réel d'annonces uniques disponible et expliquer quantitativement l'écart avec le catalogue public Mubawab avant d'ouvrir une deuxième source.

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
- artifact probe : `9947658003`, digest `sha256:76c7cc595ce60dda64e3d5dbb0978fc26f5493b72d5f6e36b757775ddb70f5f7`.

## Baseline classique finale

Run `33899083917` ✅ SUCCESS.

- **29 741 IDs uniques** dans le checkpoint final ;
- matrice classique arrivée à extinction technique ;
- ce checkpoint devient la baseline de comparaison pour toutes les surfaces catalogue supplémentaires ;
- aucune page détail, image, DB ou production impliquée dans les probes de réconciliation.

## Catalog reconciliation

Le compteur public Mubawab observé le 2026-09-04 affiche environ **102K biens immobiliers** sur le site Maroc.

Ce compteur n'est pas traité comme 102K annonces uniques exploitables. Il sert uniquement de référence de couverture à réconcilier.

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

### Décision

Les surfaces `sc/bureaux-et-commerces-a-vendre` et `sc/bureaux-et-commerces-a-louer` sont le meilleur signal de stock manquant : **126/126 IDs de l'échantillon étaient absents de la baseline classique**.

Cela ne justifie pas encore d'activer `office_sale/rent` dans la matrice `st`, car les routes `sc` sont agrégées `bureaux-et-commerces` et ne prouvent pas une taxonomie distincte Bureau vs Local commercial.

## Deep probe bureaux — en cours

HEAD : `cd932c0ba2b06400fc8dffcc22c24b639396c680`.

Le gate Lot 9 #63 exécute un probe borné uniquement sur les deux surfaces `sc` bureaux/commerces :

- pages 3 à 10 ;
- 8 pages par surface ;
- 16 requêtes max ;
- délai 2 750 ms ;
- robots vérifiés ;
- 403/429 transformé en blocage explicite ;
- 0 détail / 0 image / 0 DB / 0 prod.

Le code supporte désormais des fenêtres de pages bornées `start_page + pages`, avec garde de sécurité et tests dédiés.

## Closure rule

Lot 9 ne sera CLOSED que si les deux conditions suivantes sont satisfaites :

### A — Full Coverage technique

- toutes les partitions autorisées connues sont `completed`, ou arrêtées avec raison de sécurité documentée ;
- aucun checkpoint perdu ;
- manifest final avec pages, uniques, doublons, erreurs, stops et distribution par scope.

### B — Catalog reconciliation

- inventaire des familles / transactions / villes / zones réellement présentes sur Mubawab ;
- mesure des catégories manquantes dans la matrice actuelle ;
- extension uniquement pour les routes vérifiées, autorisées et sémantiquement sûres ;
- comparaison finale `catalogue public affiché ↔ IDs accessibles ↔ IDs uniques discovery` ;
- tout delta résiduel important doit être expliqué et quantifié.

## Next exact

1. certifier le deep probe bureaux pages 3–10 ;
2. mesurer son rendement marginal et l'overlap avec la baseline 29 741 ;
3. si le rendement reste élevé, construire une campagne `sc` persistante et bornée jusqu'à extinction de ces surfaces ;
4. conserver la taxonomie Bureau/Local commercial indépendante de la simple route agrégée ;
5. auditer ensuite villes/zones manquantes, location vacances et neuf/projets ;
6. produire la réconciliation finale avant fermeture Lot 9 ;
7. seulement ensuite ouvrir Lot 10.
