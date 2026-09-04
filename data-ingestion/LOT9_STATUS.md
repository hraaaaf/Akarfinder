# Lot 9 Status — Mubawab Full Coverage

**Status: 🟡 OPEN — planner certified; bounded runner implemented; proof pending**

## Goal

Parcourir exhaustivement le périmètre Mubawab accessible et autorisé afin de mesurer le stock canonique réel disponible avant d’ouvrir une deuxième source.

Le Lot 9 ne cherche pas à forcer artificiellement 100K annonces depuis Mubawab. Il cherche à connaître le maximum réel, unique et exploitable de la source pilote.

## Safety boundary

- aucun write production ;
- aucun déploiement Vercel ;
- aucun merge automatique ;
- aucun contournement CAPTCHA / authentification / contrôle d’accès ;
- toute route live doit rester soumise au contrôle robots existant ;
- 403 / 429 explicites restent des signaux de blocage et doivent stopper le chemin concerné ;
- aucune collecte exhaustive avant certification de chaque étape de contrôle ;
- ne jamais toucher à `scripts/scrapers/output/akarfinder.db` pendant les preuves.

## Périmètre initial dérivé de la config

Config : `data-ingestion/sources/mubawab/config.json`.

État au démarrage du Lot 9 :

- 12 villes configurées ;
- 11 catégories activées ;
- 132 scopes initiaux `ville × catégorie` ;
- vente + location selon les catégories disponibles ;
- familles supportées : appartement, terrain, villa, maison, commercial, riad ;
- bureaux désactivés tant que leurs routes distinctes ne sont pas vérifiées.

## Étape 1 — Full Coverage planner ✅ CERTIFIED

Fichier : `data-ingestion/sources/mubawab/full-coverage.ts`.

Le planificateur :

- construit les scopes déterministes depuis la config ;
- crée des partitions stables par fenêtres de pages ;
- fenêtre initiale par défaut : 25 pages ;
- progression : `1–25 → 26–50 → ...` uniquement si la fenêtre précédente est épuisée ;
- checkpoint monotone `next_page` ;
- statuts `pending / running / completed / failed` ;
- compteurs pages / annonces découvertes / uniques ajoutées ;
- arrêt d’un scope sur `zero_new_unique_ids` ;
- arrêt également possible sur robots, source block ou kill-switch ;
- une partition failed n’avance jamais silencieusement vers la suivante.

### Preuve planner

- workflow : `Data Ingestion Lot 9 Full Coverage Planner Gate` ;
- run : `33881976620` ✅ SUCCESS ;
- job : `full-coverage-planner` ;
- job id : `101052543906` ;
- Discovery regression : ✅ SUCCESS ;
- planner contract : ✅ SUCCESS ;
- HEAD produit prouvé : `1f9f0ae095fd28b9821008dd33dfb83e120ff5b4`.

## Étape 2 — bounded Full Coverage runner

**Status : 🟡 IMPLEMENTED — dedicated proof queued**

Fichiers :

- `data-ingestion/sources/mubawab/full-coverage-runner.ts` ;
- `scripts/scrapers/__tests__/data-ingestion-lot9-full-coverage-runner.test.ts` ;
- `.github/workflows/data-ingestion-lot9-full-coverage.yml`.

Le runner :

- consomme uniquement des partitions `pending` ;
- borne chaque vague par `maxPartitions` ;
- maintient un set global de `source_id` ;
- déduplique entre pages et partitions ;
- checkpoint après chaque page ;
- arrête un scope sur zéro nouvel ID unique ;
- classe `robots_disallowed` et blocage source comme stops sécurité terminaux ;
- conserve les erreurs ordinaires en `failed` ;
- honore un kill-switch avant / entre les pages ;
- génère la fenêtre suivante uniquement après `window_exhausted` ;
- ne fait aucun write DB et aucune extraction de détail dans cette preuve synthétique.

### Gate runner

- workflow : `Data Ingestion Lot 9 Full Coverage Gate` ;
- run : `33882260391` ;
- HEAD produit : `83526761f40b68429349b2513c2d96862bf0de4a` ;
- état au dernier contrôle : `queued` ;
- job attendu : `full-coverage`.

Le gate exécute :

1. régression Discovery Mubawab ;
2. contrat du planner ;
3. contrat du bounded runner.

## Closure rule du Lot 9

Lot 9 ne sera CLOSED qu’après un vrai manifest Full Coverage final couvrant toutes les partitions découvertes du périmètre autorisé, avec couverture, doublons, erreurs, rejets, checkpoints et stock unique mesuré.

## Next exact

1. vérifier le run `33882260391` ;
2. si rouge, corriger la cause exacte ;
3. si vert, certifier le bounded runner ;
4. construire la persistance de manifest / checkpoint du Full Coverage run ;
5. autoriser ensuite seulement une vague live limitée utilisant les garde-fous robots / 403 / 429 du Lot 6 ;
6. mesurer cette vague ;
7. étendre progressivement jusqu’au manifest Full Coverage final.
