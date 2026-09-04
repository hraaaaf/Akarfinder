# Lot 9 Status — Mubawab Full Coverage

**Status: 🟡 OPEN — partition planner implemented; dedicated proof running**

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
- aucune collecte exhaustive avant certification du planificateur de partitions ;
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

## Implémentation Lot 9 — étape 1

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

## Dedicated proof

Workflow : `Data Ingestion Lot 9 Full Coverage Planner Gate`.

Run initial : `33881976620`.

Le gate doit prouver :

1. la régression Discovery Mubawab existante ;
2. la matrice complète de 132 scopes ;
3. unicité des `scope_id` / `partition_id` ;
4. création déterministe de la fenêtre suivante ;
5. arrêt sur zéro nouvel ID unique ;
6. checkpoint monotone ;
7. erreur explicite sur transitions invalides ;
8. absence d’avancement silencieux après failed ;
9. URLs de découverte conformes aux routes source configurées.

## Closure rule de l’étape planner

Le planificateur n’est certifié que lorsque le workflow dédié est GREEN sur le HEAD produit qui contient :

- `full-coverage.ts` ;
- son test ;
- le workflow Lot 9.

La certification du planner ne ferme PAS le Lot 9 complet. Elle autorise seulement l’étape suivante : un dry-run / crawl Full Coverage progressif avec manifests et checkpoints, toujours hors production.

## Next exact

1. obtenir le verdict du run `33881976620` ;
2. si rouge, corriger la cause exacte ;
3. si vert, enregistrer la preuve du planner ;
4. construire le runner Full Coverage reprenable utilisant ces partitions et les garde-fous Lot 6 ;
5. démarrer par une vague limitée de partitions avant toute extension exhaustive ;
6. mesurer couverture, doublons, erreurs et stock unique ;
7. ne fermer Lot 9 qu’après manifest Full Coverage final.
