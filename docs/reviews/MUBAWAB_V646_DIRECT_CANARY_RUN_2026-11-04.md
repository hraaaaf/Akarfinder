# Akarfinder V6.4.6 — lanceur direct des trois canaries (04/11/2026)

> **État du 04/11/2026 : LIVE P1 = 3/3 PASS sur le code historique ; protocole réseau corrigé ensuite, non certifié en live.** Les sections ci-dessous conservent les mesures et l'historique; lire d'abord la reprise réseau.

## Reprise du 04/11/2026 — correction du réseau, sans nouveau canary

**Goal :** combler la faille Playwright constatée par test synthétique : une image demandée via `fetch()` possède `resource_type=fetch`, pas `image`.

**Implémenté sur la branche Draft #1154, après les visites historiques :**
- `browser_fetcher.py` : allowlist fail-closed (document principal **exactement autorisé**, scripts et feuilles CSS du même hôte uniquement). `image`, `fetch`, `xhr`, `media`, `font`, iframes, sous-requêtes tierces et types inconnus sont rejetés **avant** `route.continue_()`. Refus des URLs JS/CSS ressemblant à des fichiers image.
- Chaque navigation possède un contexte Chromium isolé, `service_workers="block"`, et ses routes WebSocket sont fermées. Aucun proxy, retry ni contournement.
- `live_canary.py` ajoute aux **futurs** JSON `network_policy` (intercepted, continued, blocked, blocked_by_type, WebSocket), sans changer ni recalculer les dix preuves historiques.
- Tests unitaires adversariaux : refus Fetch/XHR, URLs ambiguës, domaines externes, iframes, 403/429. Test Chromium synthétique dédié : chaque URL de fixture est **toujours interrompue** avant réseau, et les classifications réelles sont comparées à l'allowlist.
- La politique CI du dépôt interdit les jobs Chromium lourds sur cette PR. Le workflow léger historique est conservé ; le test Chromium est exécutable localement sur un Chromium autorisé. Il n'est pas une preuve live Mubawab.

**Limites :** autoriser certains scripts/CSS ne certifie pas, à lui seul, le type MIME effectif des réponses ; les compteurs de décision ne sont pas une capture réseau de paquets. La politique peut perturber le rendu dépendant de Fetch/XHR/CDN. **Le parsing P1 est validé sur l'ancien code pour trois pages uniquement ; la qualité du parsing sous la nouvelle politique reste non mesurée sur Mubawab.**

**Preuve offline vérifiée :** [CI #41843084418](https://github.com/hraaaaf/Akarfinder/actions/runs/41843084418) = SUCCESS au SHA `286c86c0c2b94ffa958ea96c3a6c95e2e555f49a`, 131 tests, **126 PASS / 5 SKIPPED**, aucun échec. Le test Chromium n'a pas été exécuté dans cette CI légère. [Preuve locale Chromium synthétique](../../scripts/pilots/mubawab-v646/artifacts/v646-network-guard-synthetic-20261104.json) : **8/8** requêtes HTTP de fixture interceptées et abandonnées, `fetch` image classé `fetch`, `xhr` image classé `xhr`, 1 WebSocket fermé, 0 requête envoyée aux sites. Cette preuve exerce un **miroir de la politique**, pas le module de production connecté à Mubawab, et ne vérifie pas les Content-Types des réponses.

**Gate : NO-GO pour certification intégrale** tant que (1) aucune preuve d'instrumentation réseau sur le code corrigé en conditions live autorisées, et (2) aucune nouvelle preuve de qualité du parsing sous la politique restrictive. Next exact = obtenir une nouvelle liste de pages **explicitement autorisées**, distinctes des trois pages historiques, puis faire un seul canary borné avec preuve qualité et compteurs réseau. Ne pas revisiter automatiquement Rabat, Casablanca Maârif ni Agadir Hay Salam déjà consommées. Aucun merge, déploiement ou write production.

## Exécution live post-P1 — 04/11/2026

- Branche PR Draft [#1154](https://github.com/hraaaaf/Akarfinder/pull/1154), `test/akar-v646-direct-canary-cli-20261104`.
- Le check-only a validé le checkout et les trois URLs. Le lancement réel a exécuté la suite offline **avant** les requêtes, puis a visité les pages en séquence. HEAD ayant produit les JSON : [`7766b2c`](https://github.com/hraaaaf/Akarfinder/commit/7766b2c851ae741b6184cb0d1db339fcc6e1a5a0). Aucune cadence de 24 h n’a été imposée; ce run n’est pas une calibration longitudinale.

| Ville | HTTP | Robots | Cartes DOM | Annonces éligibles | IDs-source distincts | Prix | Surface | Localisation/quartier | Qualité P1 |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Rabat | 200 | checked, 14 règles | 34 | 32 | 32 | 100 % | 100 % | 100 % | PASS |
| Casablanca Maârif | 200 | checked, 14 règles | 34 | 32 | 32 | 100 % | 100 % | 100 % | PASS |
| Agadir Hay Salam | 200 | checked, 14 règles | 34 | 33 | 33 | 100 % | 100 % | 100 % | PASS |

Les contrôles robots ont été faits séparément avant chaque page; SHA-256 identique : `bf22e2347ab2ebc0bc48a864aab82dc73ee799d75b244828b12ce4761fe9c434`. Une navigation et une tentative par ville. Aucune erreur HTTP, réponse 403/429, page challenge ou refus robots constaté. **97 IDs-source observés, 97 distincts entre les trois pages**; cela ne prouve pas 97 biens physiques uniques. Cinq cartes DOM ont été exclues du décompte éligible. Les références pré-P1 (32/32/33) sont provisoires, pas une preuve d’exhaustivité. Aucune activité d’annonce ni aucun droit de réutilisation n’a été certifié.

### Preuves

- [JSON de synthèse et de qualité](../../scripts/pilots/mubawab-v646/artifacts/v646-post-p1-first-live/post-p1-verification.json)
- [Batch summary](../../scripts/pilots/mubawab-v646/artifacts/v646-post-p1-first-live/batch-summary.json)
- [JSON Rabat](../../scripts/pilots/mubawab-v646/artifacts/v646-post-p1-first-live/v646-post-p1-rabat.json), [Casablanca Maârif](../../scripts/pilots/mubawab-v646/artifacts/v646-post-p1-first-live/v646-post-p1-casablanca-maarif.json), [Agadir Hay Salam](../../scripts/pilots/mubawab-v646/artifacts/v646-post-p1-first-live/v646-post-p1-agadir-hay-salam.json)
- [SHA-256 de tous les fichiers de preuve](../../scripts/pilots/mubawab-v646/artifacts/v646-post-p1-SHA256SUMS.txt), empreinte du manifeste `d041d39bb256204d111d226dc6e1a585c18df3e607c7ce5ec7572d905ca58eea`.
- Les JSON par ville comprennent l’horodatage, SHA HTML (sans HTML brut conservé), SHA des IDs et SHA du code. Les logs et le log des tests offline sont dans le même dossier.

### Garde-fou image, correction et CI

La relecture après exécution a révélé que le commit `7766b2c` ne bloquait ni ne journalisait explicitement les sous-requêtes d’images du navigateur. **Aucun fichier image n’a été conservé, mais l’absence de requêtes d’images ne peut pas être prouvée pour ces trois navigations.** Les résultats de parsing et les cartes sont mesurés; la conformité à la contrainte « aucune image » reste non vérifiable pour ce run.

Pour les exécutions futures, [`c032947`](https://github.com/hraaaaf/Akarfinder/commit/c032947c9c50986292f183cdd12f604ebdb3628a) ajoute l’abandon Playwright des ressources de type image avant réseau et un test offline dédié. La suite locale actuelle passe : 129 tests, 125 réussis, 4 ignorés. [CI #41830514226](https://github.com/hraaaaf/Akarfinder/actions/runs/41830514226) = **SUCCESS** sur ce commit. Le run CI antérieur [#41829956222](https://github.com/hraaaaf/Akarfinder/actions/runs/41829956222) est également SUCCESS sur `7766b2c`.

**Verdict : GO pour la qualité de parsing P1 sur ces trois mesures fonctionnelles; NO-GO pour affirmer la conformité complète au garde-fou sans image sur ce run.** Aucun des trois URLs n’a été revisité après l’ajout du blocage. Aucun write DB, aucune pagination ni fiche détail, aucun déploiement. Les JSON et preuves sont commités dans la branche PR, pas téléversés comme un artefact Actions live.

**Next exact :** garder les preuves actuelles comme référence fonctionnelle hors calibration. Pour établir aussi l’absence de requêtes d’images, utiliser le commit `c032947` lors d’une prochaine fenêtre/canary autorisée sur des pages qui n’ont pas déjà été visitées dans ce lot; ne pas relancer ces trois pages dans le cadre de cette exécution bornée.

## Goal / Succès / Preuve
**Goal :** exécuter le code P1 réel sur les trois premières pages autorisées, en séquence et sans instrumentation intrusive. **Succès :** trois JSON (`parsed_quality_pass`), robots fraîchement vérifiés, HTTP 200, 1 navigation par shard, SHA du code identifié. **Preuve :** `batch-summary.json`, logs et JSON par ville provenant du navigateur réel.

## État actuel vérifié
- Dernier vrai live pré-P1 : [GitHub run #41730963403](https://github.com/hraaaaf/Akarfinder/actions/runs/41730963403), 32/32/33 cartes éligibles. Ce run n'homologue **pas** les correctifs P1.
- Suite offline post-P1 : [run #41747650430](https://github.com/hraaaaf/Akarfinder/actions/runs/41747650430) = SUCCESS, 123 tests (119 réussis, 4 skipped).
- **Tentative de préflight direct dans l'environnement de cette session :** requête unique `GET https://www.mubawab.ma/robots.txt` ; échec **DNS `NameResolutionError`**, **sans réponse HTTP** ni navigation des pages. `git ls-remote https://github.com/hraaaaf/Akarfinder.git` échoue également sur résolution DNS. Le navigateur local Chromium 144 est installé, mais ce conteneur ne dispose pas de l'accès réseau nécessaire. **Ce n'est pas un refus établi de Mubawab**, ni une réponse 403/429. Aucune rotation IP, proxy, stealth ou autre contournement tenté.
- Workflow manuel bloqué : ce connecteur GitHub n'offre pas de `workflow_dispatch`, et le workflow V646 est absent de `main`. Il ne couvre d'ailleurs que Rabat dans son état actuel.

## Action exécutable hors de ce conteneur
Branche isolée : `test/akar-v646-direct-canary-cli-20261104`. Outils :
- `scripts/pilots/mubawab-v646/run_three_canaries.py` : vérifie manifeste exact (Rabat / Casablanca Maârif / Agadir Hay Salam), Git HEAD et suite offline; appelle `live_canary.py` **une fois par ville**, séquentiellement, arrêt dès une sortie non-zéro ou preuve insuffisante. Produit `batch-summary.json`, trois JSON et logs, ou les seuls résultats obtenus jusqu'au premier refus.
- `scripts/pilots/mubawab-v646/tests/test_three_canaries_runner.py` : cinq tests de contrôle synthétiques. Tous les cinq ont réussi localement sans réseau.

Exécution depuis un **checkout du dépôt autorisé**, disposant d'un accès réseau ordinaire :

```bash
git fetch origin test/akar-v646-direct-canary-cli-20261104
git switch test/akar-v646-direct-canary-cli-20261104
python -m pip install beautifulsoup4 playwright
python -m playwright install --with-deps chromium
cd scripts/pilots/mubawab-v646
python run_three_canaries.py --check-only
python run_three_canaries.py --output artifacts/v646-post-p1-first-live
```

La commande `--check-only` ne visite pas Mubawab et ne fait pas de tests offline. La commande normale exécute d'abord toute la suite offline, puis fait **au plus trois navigations**, avec robots vérifié par `live_canary.py` avant chaque navigation. Elle n'ajoute aucune requête HTTP de détail, image ou pagination.

## Limites et stop
- Le code ne contourne ni `robots.txt` ni les refus HTTP 403/429 ; il s'arrête au premier blocage, sans reprise automatique.
- Le `git rev-parse HEAD` est enregistré dans les rapports ; la qualité exacte des données provient du `live_canary.py` du checkout et de ses SHA internes.
- Une navigation pass n'est **pas** une preuve d'exhaustivité nationale, de caractère actif d'une annonce, de droits de réutilisation, d'unicité physique ni de 200 000 annonces.
- Le protocole longitudinal impose toujours ses propres critères statistiques ; une mesure fonctionnelle n'est pas comptée automatiquement comme observation indépendante.
- **No merge / no Vercel / no production DB** sans autorisation explicite. Le lanceur ne modifie ni workflow GitHub Actions ni `main`.

## Next exact
Faire exécuter les deux commandes `run_three_canaries.py` (check-only puis normal) dans un checkout autorisé avec DNS/Chromium fonctionnels. Importer trois JSON et `batch-summary.json`, inspecter les refus, mettre à jour GitHub et Notion, calibrer seulement sur données réellement admissibles. Si le premier robots/HTTP bloque, publier un verdict NO-GO en conservant les preuves et sans retry.

## Validation CI et PR — 04/11/2026
- **PR Draft #1154** : https://github.com/hraaaaf/Akarfinder/pull/1154 ; base `docs/akar-v646-live-canary-blocker-20261104`, non mergée.
- **CI sur le commit de code `631406f34a68895da857d85f6eadb8a50f1ccbe5` :** [run #41803832989](https://github.com/hraaaaf/Akarfinder/actions/runs/41803832989), **SUCCESS** ; logs **128 tests, 124 pass, 4 skipped, 0 échec**. Les 5 tests additionnels du nouveau lanceur sont tous passés.
- **Succès observable acquis** : les règles du lanceur (trois URL exactes, tests préalables, arrêt sur 403, contrôle de provenance, pas de nouvelle navigation après échec) sont testées en mode synthétique.
- **Succès toujours non acquis** : aucun résultat live du parseur P1. La requête robots directe du 04/11 a échoué à la résolution DNS ; aucun code HTTP, pas de navigation HTML, aucune preuve d'un blocage de Mubawab.
- **Next exact** : exécuter `run_three_canaries.py` depuis un checkout GitHub de la PR #1154 ayant DNS / Playwright fonctionnels, inspecter `batch-summary.json` et jusqu'à 3 JSON / logs. Si le préflight robots échoue, s'arrêter et conserver les preuves. Ne pas modifier `main` ni Vercel.

## Tentative d’exécution Work — blocage prérequis confirmé — 04/11/2026 09:19 UTC

- **Résultat :** aucun des trois canaries n’a été lancé depuis cette session. Aucun robots.txt, code HTTP ou page Mubawab n’a été reçu; aucune navigation n’a eu lieu. Aucun JSON de canary ni `batch-summary.json` n’est donc disponible, et aucune valeur de mesure n’est renseignée.
- **Checkout :** le workspace courant `/workspace/scratch/50c28b624bdb` n’est pas un dépôt Git; `git rev-parse --show-toplevel` renvoie `fatal: not a git repository (or any of the parent directories): .git`. La branche PR #1154 et son HEAD documentaire `8ca78ffb2929f110826fd67304d15189a85ac8c9` sont vérifiables via GitHub, mais ne sont pas checkoutés localement.
- **DNS vérifié à 2026-11-04T09:19:42Z :** `socket.getaddrinfo` renvoie pour `www.mubawab.ma` et `github.com` : `gaierror: [Errno -3] Temporary failure in name resolution`. `getent ahosts` sort avec code 2 pour les deux hôtes. Cela confirme un problème de résolution DNS dans ce workspace; ce n’est pas un refus du site et aucun code HTTP n’existe.
- **Dépendances locales :** Python 3.12.14; `beautifulsoup4` absent, `playwright` absent; aucune commande Chromium trouvée. `--check-only` n’a pas été exécuté, car il exige un vrai checkout et un `git rev-parse HEAD`; la suite offline locale et le mode live n’ont pas été lancés. La CI #41803832989 reste la preuve offline (128 tests, 124 pass, 4 skipped) sur le commit code `631406f34a68895da857d85f6eadb8a50f1ccbe5`, pas une preuve de live.
- **Portée des garde-fous :** le délai de 24 h n’est pas la cause de l’arrêt; un test fonctionnel hors cadence est autorisé et devra simplement rester hors calibration longitudinale. Aucun proxy, réseau alternatif, navigateur externe, retry, écriture DB ou déploiement n’a été utilisé.
- **Next exact :** disposer d’un workspace avec le checkout réel `test/akar-v646-direct-canary-cli-20261104`, DNS fonctionnel vers GitHub et Mubawab, `beautifulsoup4`, Playwright et Chromium; puis exécuter `python run_three_canaries.py --check-only`, suivi de `python run_three_canaries.py --output artifacts/v646-post-p1-first-live` depuis `scripts/pilots/mubawab-v646`. Le lanceur lancera les tests offline avant la première requête et s’arrêtera au premier garde-fou. Ne pas fabriquer de rapports de ville en l’absence de navigation.

## Revue indépendante des preuves GitHub — 04/11/2026 (après les canaries)

**Preuves LIVE reçues et recoupées :** le lot du 04/11 à partir de 12:31 UTC a exécuté le SHA `7766b2c851ae741b6184cb0d1db339fcc6e1a5a0`. Les trois JSON `parsed_quality_pass` contiennent HTTP 200, robots `checked` (SHA identique), 1 navigation / 1 tentative par page, respectivement 34/32, 34/32, 34/33 cartes DOM/éligibles, couvertures prix/surface/localité 100 %, **97 IDs-source effectivement distincts** entre villes. Aucune preuve d'unicité physique, d'activité ni de droits de réutilisation. Le `batch-summary.json` indique `THREE_SHARDS_PASSED`.

**Différence de version cruciale :** les visites LIVE ont utilisé `7766b2c`. Le blocage des sous-requêtes d'image a été introduit **après les visites**, commit `c032947c9c50986292f183cdd12f604ebdb3628a`, avec `page.route("**/*", ...)` et `route.abort()` pour `resource_type=="image"`. Des tests unitaires passent, mais **aucune preuve LIVE d'absence de sous-requêtes image pour ce correctif**. Les runs offline [#41829956222](https://github.com/hraaaaf/Akarfinder/actions/runs/41829956222), [#41830514226](https://github.com/hraaaaf/Akarfinder/actions/runs/41830514226), [#41830929810](https://github.com/hraaaaf/Akarfinder/actions/runs/41830929810) sont tous SUCCESS. PR Draft #1154 non mergée.

**Contrôle indépendant des 10 checksums :** le fichier original `scripts/pilots/mubawab-v646/artifacts/v646-post-p1-SHA256SUMS.txt` contient des empreintes calculées sur des fichiers à fins de ligne **CRLF (Windows)**. Leurs équivalents versionnés sur GitHub sont à fins de ligne **LF** : **0/10** empreintes originales correspondent octet pour octet aux versions GitHub, mais **10/10** correspondent aux contenus GitHub si l'on restaure les fins de ligne CRLF. Ce n'est pas un échec des canaries, mais un problème de **portabilité de la preuve d'intégrité**. **Sans altérer le manifeste d'origine**, un second manifeste indépendant a été généré et publié : [`v646-post-p1-GITHUB-SHA256SUMS.txt`](https://github.com/hraaaaf/Akarfinder/blob/test/akar-v646-direct-canary-cli-20261104/scripts/pilots/mubawab-v646/artifacts/v646-post-p1-GITHUB-SHA256SUMS.txt), calculé sur les **10 fichiers exactement tels que stockés par GitHub**. Les deux manifestes correspondent donc à des représentations distinctes du même contenu ; ne jamais appliquer le manifeste CRLF original directement aux blobs GitHub LF.

**Réserve de chronologie :** le fichier `artifacts/v646-post-p1-check-only/batch-summary.json` archivé a été régénéré *après* les visites (à 12:33 UTC) ; le rapport indique un contrôle check-only préalable attesté par la sortie console, mais ce **fichier check-only précis n'est pas une preuve horodatée antérieure aux navigations**. Les tests offline, eux, figurent dans `offline-tests.log` et `batch-summary.json` avec code sortie 0. Cette nuance n'invalide pas les JSON live.

**Verdict exact : GO conditionnel pour le parsing P1 sur les trois pages observées; NO-GO pour certifier le protocole "zéro requête image" sur le run LIVE historique et pour extrapoler à 200k annonces.** Prochaine action : valider l'interception des images sur un navigateur Playwright réel et une page synthétique/localement hébergée, avec instrumentation réseau, avant de proposer de nouvelles pages *explicitement autorisées* pour un éventuel canary live du nouveau commit. Ne pas revisiter automatiquement les trois mêmes URL; pas de merge, déploiement Vercel ou DB production.

## Vérification Playwright supplémentaire — risque résiduel des téléchargements image

Un test synthétique **avec un véritable Chromium et Playwright** dans un environnement de test, sans requête vers Mubawab ni vers Internet, a observé la classification des ressources suivantes : `<img src="…/tag-photo.png">` → `resource_type=image` ; `background-image:url(…/css-photo.png)` → `resource_type=image` ; `fetch("…/fetch-photo.png")` → **`resource_type=fetch`**, alors même que l'URL se termine par `.png`.

Toutes les routes du test synthétique ont été **interrompues avant sortie réseau**. La décision théorique a été calculée selon le code de la PR #1154 : `_allow_page_without_images` abandonne `image`, mais appelle `continue_()` pour `fetch`. Par conséquent, **le correctif `c032947` ne garantit pas « zéro requête image » en présence d'images demandées par Fetch/XHR**. Ce test ne prouve pas que Mubawab utilise cette technique ; il démontre seulement un cas que le garde-fou actuel ne couvre pas.

Un test HTTP local de type « serveur recevant les images » a d'abord rencontré `net::ERR_BLOCKED_BY_ADMINISTRATOR` de Chromium pour `127.0.0.1` dans cet environnement ; **aucune conclusion réseau** n'en a été tirée. Le test suivant utilise `page.set_content` et intercepte toutes les routes sans sortie réseau ; il prouve uniquement la classification et le chemin logique du garde-fou.

**Next exact :** étendre les tests adversariaux aux requêtes d'images via Fetch/XHR et, si une politique strictement « aucune image » est requise, spécifier une interception de trafic fail-closed tenant compte des requêtes ambiguës. Éviter un blocage aveugle des API nécessaires au rendu sans mesurer son effet sur le parseur. Ne pas certifier le zéro image avant preuve par instrumentation sur des pages **nouvelles et explicitement autorisées** ; pas de revisite automatique des trois shards du lot.
