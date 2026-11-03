# Akarfinder — Arbitrage contradictoire Claude V6.4.6, 03/11/2026

## Goal
Corriger les défauts P0/P1 démontrés du scraper/canary, sans exploration réseau supplémentaire, et conserver un chemin de preuve reproductible. **Aucun merge, déploiement, publication ou modification de DB produit.**

## Provenance et état initial
- Source de travail : branche `sandbox/akar-v646-parser-benchmark-20261102` au commit `f08eb78c9d0a4005dd020401679dbd3c282f3f36` ; les fichiers source fonctionnels n'ont pas changé depuis le pack Claude `57c96ab73ee5c832212a10c501459a8dd4728939` (diff GitHub : seulement documentation).
- Source externe : rapport contradictoire de Claude reçu dans la conversation du 03/11/2026 et fichier `CLAUDE_V646_REVIEW_patches_and_tests.zip`, archivé sous `docs/reviews/vendor/` sur cette branche.
- Historique V645 : 97 IDs source distincts/core-complets selon les champs, sans preuve d'activité ni de droits ; [CI 41549175495](https://github.com/hraaaaf/Akarfinder/actions/runs/41549175495).
- Live V646 précédent, avant ces correctifs : 1 shard Rabat, 32 IDs distincts/core-complets, 29 prix numériques et 3 sur demande, [canary 41611908342](https://github.com/hraaaaf/Akarfinder/actions/runs/41611908342). Ce n'est PAS une mesure de débit durable.

## Correctifs sélectionnés
1. **P0 / correctif 02** : HTTP 403/429 terminal en un seul essai ; aucune escalade Chromium en mode auto ; crash inattendu du main en exit 4 + rapport `fatal_error`.
2. **P0 / correctif 01** : canary exit 0 uniquement quand `parsed_quality_pass` ; aucun déclenchement push du canary live ; provenance (SHA du commit et SHA-256 du code), IDs source, métriques observées même en échec, temps navigateur séparés ; comparaison offline d'observations.
3. **P1 / correctif 03** : statistiques prix numérique / sur-demande mutuellement exclusives, compteur prix numérique conservé mais périmé, journal append-only des changements de champs non nuls dans la même transaction SQL.
4. **P1 additionnel — correctif de la revue** : `compare_observations` refuse explicitement un rapport échoué, la qualité rejetée, un JSON historique sans liste d'IDs ou des IDs malformés/dupliqués : **pas de faux net nouveau**. CLI exit 2 sur preuve insuffisante. Test adversarial ajouté.

## Vérification locale (sans réseau)
- Les trois diffs du ZIP ont été passés à `patch -p1 --dry-run` puis appliqués sur une **copie exacte** du pack GitHub.
- `python -m unittest discover -s tests -q` : **66 tests exécutés, OK ; 4 tests DOM réel ignorés faute de fixture externe ; 3 `expectedFailure` intentionnels** (`property_type`, baseline de carte, dérive localité). Résultats locaux et non encore résultat CI sur la branche.
- Les changements en base dans ces tests utilisent SQLite éphémère / mémoire, **aucun accès base produit**.

## Corrections laissées ouvertes — pas de claim de complétude produit
- **P1 :** fiabilité localité et seuil d'une page tronquée — non implémentés car calibration/DOM fidèle nécessaires.
- **P1 :** `property_type_observed` pour éviter de traiter villas/cabinets/terrains comme appartements — non implémenté ; classification à valider sur données fidèles.
- **P2 :** archive des tests dépendant de l'artefact V645, scalability JSON à partir de dizaines de milliers de fiches.
- **LIMITES :** Ces patches ne certifient ni unicité physique, ni annonces actives, ni fraîcheur, ni droits de publication, ni 200 000 biens disponibles.

## Suite
Vérifier la CI offline **sur le HEAD de cette branche**, comparer ses résultats exacts aux 66 tests locaux, diagnostiquer si échec. Aucun run live automatique : canary désormais `workflow_dispatch` seulement ; tout nouveau pilote réel doit être explicitement planifié dans le respect du robots et de la borne existante. Comparaison net-nouveau possible uniquement avec 2 JSON contenant les listes d'IDs, et aucun ancien JSON n'a ces listes.
