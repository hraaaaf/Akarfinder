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

## Verdict CI vérifié — 04/11/2026
- [Run #41747650430](https://github.com/hraaaaf/Akarfinder/actions/runs/41747650430), job `126304582738` : **completed/success** sur commit de tests `b8865059ba50d69c9b3386abcdd5589713be88de`.
- Logs : **Ran 123 tests in 1.046s — OK (skipped=4)**. Les **23 tests nouveaux** du fichier `test_canary_battery_offline.py` sont tous passés ; total suite **119 pass + 4 skipped, 0 fail, 0 expectedFailure**.
- Les 4 skipped restent les contrôles dépendants d'un DOM historique réel non disponible ; aucune inférence de comportement live.
- **Verdict** : **GO pour la batterie offline synthétique** et pour la préservation de la sécurité fail-closed ; **NO-GO pour la validation live post-P1 et l'objectif 200 000 annonces**.
- Prochaine vérification live : uniquement lorsque l'exécution peut se faire par un moyen autorisé ; n'utiliser ni rotation d'IP pour passer outre un refus ni un détournement du blocage de lancement déjà observé.

## Tentative de canary live post-P1 — BLOQUÉE — 04/11/2026

- **Verdict opérationnel : NO-GO de certification live V6.4.6 dans cette session**. Aucun canary post-P1 n'a été lancé; cela ne prouve ni un blocage de Mubawab ni un défaut du scraper.
- **Preuve offline prérequise :** [run #41747650430](https://github.com/hraaaaf/Akarfinder/actions/runs/41747650430), job `offline` #126304582738, completed/success; 123 tests, 119 pass et 4 skipped, sans requêtes au site. Le run est sur le commit de tests `b8865059ba50d69c9b3386abcdd5589713be88de`; le HEAD actuel de la PR #1152 est `0eb0a3a5b543c96c7945df49dc4a484ead306a1d`.
- **Code inspecté :** `live_canary.py` vérifie l'URL contre le manifeste fixe, puis lit robots avant navigation; produit un JSON même en cas de refus. `browser_fetcher.py` utilise Playwright Chromium ordinaire, une navigation, sans proxy ni contournement; 403/429 sont terminaux. `calibrate_page1.py` n'effectue aucun accès réseau; ses contraintes de 24 h et cinq observations servent à la calibration longitudinale uniquement. Conformément à la mission, un test fonctionnel hors cadence ne compterait pas dans la calibration.
- **Limite d'exécution observable :** le dépôt n'est pas présent dans le workspace. Le connecteur GitHub de cette session expose lecture et rerun de jobs, mais aucune action de dispatch manuel; le run #41747650430 est offline. Aucun résultat ne permet d'affirmer que le précédent refus venait de GitHub, d'OpenAI ou de Mubawab. Aucune nouvelle vérification robots ni navigation n'a été faite.
- **Preuve historique distincte :** le run #41730963403 contient une séquence offline puis trois canaries live, mais elle précède les correctifs P1 et ne certifie pas le HEAD corrigé.
- **Next exact :** déclencher le workflow V646 autorisé depuis un environnement fournissant le dépôt et une capacité officielle de dispatch GitHub Actions; faire le préflight robots, exécuter Rabat puis Maârif puis Hay Salam à une navigation chacune, s'arrêter au premier refus/challenge/échec qualité et archiver les trois JSON ainsi que le run. Ne pas réutiliser cette tentative pour la calibration si hors cadence.
