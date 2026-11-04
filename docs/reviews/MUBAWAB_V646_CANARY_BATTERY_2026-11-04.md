# Akarfinder — Batterie de canaries V6.4.6 (2026-11-04)

## Goal / Critère / Preuve
- **Goal** : détecter rapidement les régressions du parseur V646 P1 et des garde-fous avant tout essai réel, sur les **trois seuls shards du manifeste**.
- **Succès offline** : les scénarios passent sur le HEAD GitHub, y compris les échecs attendus des entrées invalides. Succès *ne signifie pas* qu'un accès réel au site a été testé.
- **Preuve** : `tests/test_canary_battery_offline.py`, [run CI #41747650430](https://github.com/hraaaaf/Akarfinder/actions/runs/41747650430), logs de tests et SHA du HEAD.

## Exécution et portée
Branche isolée `test/akar-v646-canary-battery-offline-20261104`, créée depuis `de63752613ef40b39de503c182ad1385495c9c4a` (branche de calibration longitudinale V646). Commit qui ajoute la batterie : `b8865059ba50d69c9b3386abcdd5589713be88de`.

**23 scénarios de régression hors réseau** dans 2 groupes : contrôle des baselines 32/32/33 ; pages synthétiques complètes Rabat / Maârif / Hay Salam ; troncatures 17/32, 22/32, 22/33 ; limite provisoire 23/32 ; quartiers absents ou marqueurs CSS renommés ; prix tous sur demande / prix « à partir de » / absence de surface ; typage appartement/villa/terrain ; interstitiel et page vide ; doublons ID ; shard non approuvé ; robots refusés ; 403 et 429 terminaux ; stabilité de DOM partiel et stabilisation normale.

Ces tests ne collectent **ni HTML réel ni photos** ; aucune IP ni proxy n'est modifié ; aucune navigation HTTP/Chromium réelle vers Mubawab, aucune pagination et aucune écriture dans la DB de production.

Les données de référence *réelles mais historiques, obtenues avant le correctif P1* restent : [canary live #41730963403](https://github.com/hraaaaf/Akarfinder/actions/runs/41730963403) : 32 IDs Rabat, 32 Casablanca Maârif, 33 Agadir Hay Salam, 97 ID-source sur 3 premières pages. Ces mesures ne doivent jamais être comptées comme nouveau canary du code corrigé.

## Limites et décisions
- **Aucune nouvelle vérification live V646 post-P1** : un précédent lancement de workflow immédiat a été bloqué par les contrôles de sécurité ; ne pas tenter de le contourner avec un autre outil. La vérification `robots.txt` disponible en lecture web peut être en cache ; elle n'équivaut pas au préflight robots frais du scraper.
- Les tests synthétiques prouvent des comportements de fonctions locales, **pas** les contraintes d'accès, la stabilité du site live ni la performance de collecte.
- Une page stable à 23/32 (≥70 % du référentiel) passe encore : **fausse complétude possible** ; seuil 70 % provisoire, nécessite calibration distincte.
- Les nouveaux types sont inférés du titre uniquement, pas vérifiés physiquement.
- Les 4 tests dépendant du DOM réel de novembre sont toujours ignorés faute de fixture originale.
- **NO-GO** publication, droits d'usage, 200k annonces, activité, unicité physique, merge et Vercel.

## Suite
1. Lire [CI #41747650430](https://github.com/hraaaaf/Akarfinder/actions/runs/41747650430), corriger si rouge et certifier le résultat final à l'aide des logs.
2. Mettre à jour Notion avec le SHA exact, les scénarios et le verdict.
3. Laisser les branches Draft PR #1150 et #1151 intactes ; la suite réelle doit se faire par un moyen autorisé et conforme à robots, avec un seul contrôle borné par shard.
4. Poursuivre la calibration statistique séparément ; ne jamais substituer les 23 scénarios synthétiques aux observations longitudinales indépendantes.
