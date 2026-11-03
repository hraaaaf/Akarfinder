# Akarfinder — Mubawab V6.4.6 : calibration longitudinale page 1

**Date initiale :** 03/11/2026 (UTC). **Branche de travail :** `feat/akar-v646-longitudinal-calibration-20261103`.

## Goal / Succès / Preuve

- **Goal :** préparer une calibration reproductible du seuil d'alerte sur les pages tronquées, puis vérifier le correctif P1 en condition réelle, sans prétendre mesurer tout le stock national.
- **Succès observable immédiatement :** lecture hors ligne des trois JSON V6.4.6 du run `41730963403`, protocole reproductible par shard, rejet de preuves incomplètes, garde 24 h, tests offline sur la branche et archive traçable.
- **Preuve :** `calibrate_page1.py`, `tests/test_calibrate_page1.py`, `tests/test_browser_stability.py`, `calibration_snapshot_20261103.json`, GitHub Actions attachée au HEAD, artefacts JSON sources.
- **Succès différé :** au moins **5 observations P1 conformes par shard**, à intervalles **≥ 24 h**, avec au moins 4 jours d'étendue et identité de code stable. Cette condition permet **la revue humaine d'une baseline candidate**, mais ne certifie pas l'exhaustivité.

## État prouvé au 03/11 (sans nouvelle visite du site)

- Dernière navigation : [run GitHub #41730963403](https://github.com/hraaaaf/Akarfinder/actions/runs/41730963403), code V6.4.6 **avant P1**, les trois pages avec succès le 03/11 vers 22:28 UTC.
- Rabat : **32** cartes éligibles, observation à 22:28:05 UTC.
- Casablanca Maârif : **32** éligibles, observation à 22:28:09 UTC.
- Agadir Hay Salam : **33** éligibles, observation à 22:28:14 UTC.
- Calibration à partir des pièces : **1 observation historique acceptée par shard, 0 observation post-P1**. **Aucune baseline recalibrée**, aucune fiche physiquement unique ou active certifiée.
- Premier créneau admissible sur les trois shards : **04/11/2026 après 22:28:14 UTC** ; choisir une marge ≥ quelques minutes avant de déclencher.

## Corrections préparatoires (offline)

1. `browser_fetcher.py` : attendre que le nombre de `.listingBox` se stabilise sur une fenêtre d'observation bornée (sans navigation supplémentaire). **Limite :** un nombre stable n'est pas une preuve de page complète ; la baseline P1 reste le second garde-fou.
2. `live_canary.py` : inclure dans la provenance les empreintes SHA-256 du manifeste des baselines et de `pilot-urls.txt`, en plus des scripts et du commit GitHub.
3. `calibrate_page1.py` : lecture exclusivement locale, sans requête HTTP/Chromium ni écriture SQLite ; contrôle status 200/robots, provenance, ensemble d'IDs source avec hash, cohérence des compteurs et cadence 24 h. Un statut bloqué ne peut pas devenir un succès statistique. Un refus de site consomme aussi le délai de sécurité.
4. `tests/` : rejets adversariaux, dernière valeur datée, version incohérente, données absentes, page partielle, stabilisation et garde sans bypass.

## Protocole live borné — prochaine action autorisée

- **Pas de nouvelle navigation le 03/11** : la limite 24 h est encore active. Le prochain run est volontairement différé.
- **Une seule navigation de liste par ville** dans l'ordre Rabat → Casablanca Maârif → Agadir Hay Salam. Chaque ville fait un préflight robots frais ; 403/429/challenge/quality fail = arrêt, sans retry, sans navigateur de contournement ni nouvelle URL. Aucun détail, photo, pagination, proxy ou écriture DB.
- Exécuter la CI offline sur le SHA exact **avant** le run live. Archiver **tous** les JSON avec `if: always()`, même en échec. Lire les statuts et les listes d'IDs avant toute conclusion.
- Pour obtenir 5 observations P1 par shard, répéter seulement sous contrôle du délai et de la politique d'arrêt, sans extension de la cible. Le délai entre runs doit être contrôlé sur les timestamps réels, pas simplement sur les dates calendaires.
- **Ne jamais écraser automatiquement** `quality_baselines_v646_20261103.json`. La calibration fournit des médianes candidates et une recommandation **pour revue**, pas une valeur de vérité.

## Limites et NO-GO

- Trois premières pages d'annonces choisies à l'avance ne constituent pas un échantillonnage aléatoire du Maroc.
- Les dénominateurs « vus » et « éligibles » ne prouvent ni la totalité des résultats ni le caractère résidentiel effectif.
- Le seuil actuel **70 %** est une hypothèse de sécurité provisoire, non calibrée sur plusieurs jours ; le garder inchangé pour le prochain test.
- **NO-GO** : 200 000 annonces démontrées, doublons physiques, statut actif, droits d'exploitation et publication. **Aucun merge, déploiement Vercel ni écriture base de production.**

## Reprise exacte

Lire ce document et `docs/reviews/MUBAWAB_V646_P1_QUALITY_GATES_2026-11-03.md`, vérifier `repo=hraaaaf/Akarfinder`, branche et HEAD, PR #1150 et CI ; dès que le délai est écoulé, un seul run live contrôlé sur le HEAD approuvé, puis comparer les JSON et actualiser Notion Akarfinder (page `40c77c66-3362-81e8-b50f-ddde1076eea5`). Arrêter toute continuation live si un garde échoue.

## Certification offline et planification contrôlée — 03/11/2026

- [CI GitHub #41741667180](https://github.com/hraaaaf/Akarfinder/actions/runs/41741667180) : **completed/SUCCESS** sur commit de code `300b1523328e1e54d805a248da692a8bab2932a1`, **100 tests = 96 PASS + 4 skipped, 0 expectedFailure / fail**. Le job a audité l'ancien SQLite V645 hors ligne ; **0 nouvelle navigation Mubawab dans cette CI**.
- [PR Draft #1151](https://github.com/hraaaaf/Akarfinder/pull/1151), base `fix/akar-v646-p1-quality-gates-20261103` (elle-même PR #1150 Draft), non mergée. Fichiers de code et tests transférés sur GitHub avec empreintes Git blob vérifiées contre leurs originaux locaux.
- Le snapshot d'analyse [`docs/evidence/MUBAWAB_V646_CALIBRATION_INPUT_20261103.json`](https://github.com/hraaaaf/Akarfinder/blob/feat/akar-v646-longitudinal-calibration-20261103/docs/evidence/MUBAWAB_V646_CALIBRATION_INPUT_20261103.json) conclut **0 observation strict P1** pour les 3 shards, candidats de baseline `null`, sans rejet d'archive. Pré-P1 = 1 observation/shard. Les données sont insuffisantes.
- **Automation bornée enregistrée** : ID `6aea728eed648191bcd66dc3914328e6`, début **04/11/2026 22:45 UTC**, jusqu'à **5 déclenchements au maximum espacés de 25 h**. À chaque déclenchement, le worker doit vérifier le **délai effectif ≥ 24 h**, la CI du HEAD et la politique robots puis au plus 3 navigations de page 1 (une par ville, en séquence), et stopper dès un refus. Un arrêt bloquant doit mettre en pause l'automate ; zéro nouvelle URL, aucun retry, aucune pagination, aucun contournement. La création de l'automate est vérifiée ; **les futures visites ne sont PAS encore exécutées ni prouvées**.
- **Next exact** : première vérification de délai et de CI, puis éventuel run unique borné le 04/11 à partir de 22:45 UTC, lecture des vrais JSON, mise à jour GitHub et Notion. Un échec de garde donne **NO-GO** ; toute nouvelle baseline devra être approuvée par une revue humaine.
