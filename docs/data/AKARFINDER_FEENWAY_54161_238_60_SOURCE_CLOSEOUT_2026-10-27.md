# AkarFinder — FeenWay 54 161 / 231 candidates — closeout read-only du 27 octobre 2026

## Résultat exact, preuve

- Inventaire de **54 161 URL FeenWay** issues de six sitemaps XML complets : [run 40478471659](https://github.com/hraaaaf/Akarfinder/actions/runs/40478471659) **SUCCESS 5/5 tests**, [artifact 12721712627](https://github.com/hraaaaf/Akarfinder/actions/runs/40478471659/artifacts/12721712627) extrait et SHA256 manifeste et ZIP contrôlés. Les 54 161 sont des **liens**, aucune garantie de 54 161 biens réellement actifs.
- Échantillon 240, 2 identifiants FeenWay déjà analysés exclus, **238** nouvelles fiches examinées : **237** liens et IDs sources, **1** sans URL originale, **4** programmes /pa/, **2** identifiants sources connus dans l'archive Neon de 151 900 sources, **231** identifiants non présents dans les snapshots vérifiés. Toutes les **231** sont **review uniquement**.
- [Données vérifiables](feenway-next238-origin-reconciled-neon-2026-10-27.jsonl). **0** source à nouveau répétée dans ces 237 ; aucun match avec canari précédent 100 ; les 2 IDs connus Neon sont `191671` et `220237`. Cela ne prouve pas qu'il n'y a aucun doublon physique parmi les 231.
- **CI spéciale qualité** : [run 40480314641](https://github.com/hraaaaf/Akarfinder/actions/runs/40480314641) **SUCCESS** sur HEAD test `a20f5d596d27d4e2e6d6ecbf8789607cdc4c5612`. Logs des jobs : **8+4+4=16 tests PASS, 0 FAIL** (canari 81 + archivage Neon 47 + origines 238).

## Premier contrôle des pages sources, 60/231

- [Registre 60](feenway-next231-primary60-source-signals-2026-10-27.jsonl) : 60 URLs originales stratifiées (**24 Mubawab, 24 Avito, 4 Sarouty, 4 Yakeey, 2 Agenz, 2 Masaken**).
- **58** pages retournées, **2** erreurs primaire (une Sarouty 410, une Yakeey bloquée — pas de contournement). **55** identités sources conservées dans l'URL finale ou le bloc de référence.
- Heuristique conservatrice **non certifiante** : **32** signaux de prix principal, **45** signaux de superficie, **20** pages avec les deux signaux, **26** métadonnées `published_date`. Le parseur de cette passe ne gère pas complètement les nombreux formats et produit des **faux négatifs** : il ne donne **PAS** de taux de complétude cinq champs, même pour les 20. Aucune date ne prouve la disponibilité.
- Toutes les 60 : `primary_5fields_certified=false`, `eligible=false`. Avant admissibilité : correctifs de parsing par site, ville + quartier + transaction strictes, prix unitaire/période, date/activité vérifiée, doublons physiques et droits.

## Risques et mesures

L'outil de consultation a temporairement atteint sa limite de **150 URL/min** ; nous avons respecté le quota et repris sans contournement. Le premier script de liaison FeenWay a eu un faux négatif pour 80 pages dû à un constructeur URL indisponible, corrigé puis recontrôlé (**79/80** liens). Aucune fiche hors de la liste blanche d'origine, aucune API privée, image, contact ou publication.

Le gel historique **226 286 URL** reste indisponible après HTTP 410 sur l'artifact `10910779576` ; les 151 900 fiches d'archive ne lui sont pas substituées. **Aucune écriture Neon/DB, aucun Vercel, aucun merge**.

## Next exact / séquence restante

1. Rendre le parseur primaire **par portail** fidèle aux différents blocs prix/surface/ville/quartier/transaction et aux cas économiques atypiques ; valider sur des fixtures et contrôles ponctuels, sans faux positifs.
2. Exécuter par lots bornés sur les **171** autres candidates et réexaminer les 60 avec le parseur corrigé, dédupliquer face à l'archive Neon en read-only puis recertifier activité/fraîcheur et droits avant tout statut `eligible`.
3. Continuer l'acquisition multi-source pour le cap 200K, mais convertir d'abord les URL en identités et fiches techniquement contrôlées ; pas d'extrapolation brute.
4. Maintenir [handover principal](../handovers/2026-10-05-200k-fresh-listings-parser-v2-handover.md), [PR #1105](https://github.com/hraaaaf/Akarfinder/pull/1105), CI exacte et gate deployment explicite.

**Statut global 200K : non certifié.**
