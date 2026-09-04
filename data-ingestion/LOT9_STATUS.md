# Lot 9 Status — Mubawab Full Coverage

**Status: 🟡 OPEN — partition planner certified; bounded runner next**

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
- step Discovery regression : ✅ SUCCESS ;
- step Lot 9 planner contract : ✅ SUCCESS ;
- HEAD produit prouvé : `1f9f0ae095fd28b9821008dd33dfb83e120ff5b4`.

Le planner est donc certifié. Cette preuve n’autorise pas encore un crawl exhaustif.

## Étape 2 — bounded Full Coverage runner

**Status : 🟡 NEXT**

Le runner doit :

- consommer les partitions certifiées ;
- exécuter seulement une vague bornée ;
- conserver un set global de `source_id` uniques ;
- checkpoint après chaque page ;
- arrêter un scope sur zéro nouvel ID unique ;
- classifier robots / source block / erreur retryable ;
- produire un résumé de vague ;
- générer la partition suivante uniquement après `window_exhausted` ;
- ne faire aucun write DB et aucune extraction de détail pendant cette première preuve d’orchestration.

## Closure rule du Lot 9

Lot 9 ne sera CLOSED qu’après un vrai manifest Full Coverage final couvrant toutes les partitions découvertes du périmètre autorisé, avec couverture, doublons, erreurs, rejets, checkpoints et stock unique mesuré.

## Next exact

1. construire le bounded Full Coverage runner ;
2. le prouver avec fetchers synthétiques, sans réseau ;
3. ensuite seulement autoriser une vague live limitée utilisant les garde-fous robots / 403 / 429 du Lot 6 ;
4. mesurer la vague ;
5. étendre progressivement jusqu’au manifest Full Coverage final.
