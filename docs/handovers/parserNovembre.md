# parserNovembre — FeenWay / Aspiration exhaustive — Plan canonique

**État : PLANIFIÉ — aucune exécution nouvelle prouvée par ce document.**
**Repo :** hraaaaf/Akarfinder · **Branche :** data/200k-fresh-parser-v2 · **HEAD de référence :** b168ede39b92a5d4613611f30a278c762e7aaa32 · **PR historique :** #1105.

## Goal, succès et preuve

**Goal :** parcourir automatiquement l'ensemble du catalogue FeenWay publiquement accessible, conserver les données RAW complètes et les médias dont la collecte est autorisée, puis extraire des annonces fraîches, disponibles, uniques et réutilisables via PULPER, sans injecter le RAW dans la DB AkarFinder.

**Succès :** couverture mesurée et documentée de toutes les surfaces publiques découvertes, captures vérifiables, stockage durable chiffré, pipeline reproductible et qualification contrôlée. **Preuve :** manifestes URL, horodatages, empreintes SHA-256, tests, métriques et contrôles indépendants. Un run CI vert seul ne suffit pas.

## Point de départ vérifié / limites

- Inventaire historique FeenWay : **54 161 références URL**, pas 54 161 biens uniques certifiés.
- Dernier total communiqué : **161 captures RAW, 160 URL distinctes** (une URL recapturée). Le lot offset 120 a une CI SUCCESS, mais sa vérification cryptographique indépendante reste à achever.
- **120 URL distinctes** contrôlées cryptographiquement sur les lots précédents ; JSON-LD `RealEstateListing` présent sur les 120 pages auditées.
- PULPER JSON-LD : **7/7 tests** sur le run GitHub `40494059004` ; tous les moules restent non éligibles à la publication tant que les gates ne sont pas passés.
- **0 insertion DB / 0 publication / 0 déploiement Vercel** lié à cette collecte.
- L'hypothèse de **100 000+ annonces FeenWay** n'est pas vérifiée. Les artifacts GitHub temporaires (30 jours) ne sont pas un RAW Vault durable.

## LOT N01 — Cartographie exhaustive des entrées publiques

**Goal :** découvrir toutes les URL d'annonces accessibles via sitemaps, catégories, villes, pagination, liens internes et réponses JSON publiques.

**Exécution :** repartir des 54 161 références, canoniser les URL, dédupliquer, inventorier les partitions et détecter les pages hors sitemaps. Mesurer la couverture par ville, catégorie, statut HTTP et origine.

**Succès / preuve :** inventaire versionné des URL uniques, provenance par URL, rapport des écarts entre surfaces et estimation explicitement incertaine des manquants. **Gate :** ne pas confondre URL et biens réels.

## LOT N02 — Crawler hybride HTTP + Playwright

**Goal :** remplacer les lots manuels de 40 pages par une exploration continue et reprenable.

**Exécution :** HTTP direct pour HTML/JSON publics ; Playwright uniquement pour rendu JavaScript nécessaire ; file persistante, états par URL, déduplication, backoff, contrôle robots, quotas par domaine et reprise après incident. TinyFish Fetch peut servir à un échantillon de reconnaissance, sous réserve de ses limites réelles ; ne pas présumer un service illimité.

**Succès / preuve :** parcours reproductible d'un jeu d'URL, zéro contournement d'authentification/CAPTCHA, rapports d'erreurs, tests de reprise et comparaison HTTP/Playwright. **Gate :** arrêt/isolement de toute source qui refuse l'accès.

## LOT N03 — Capture complète et RAW Vault durable

**Goal :** préserver chaque réponse brute récupérable avec provenance et intégrité.

**Exécution :** HTML original, JSON public, prix, adresse publiée, surface, description, équipements, référence source, horodatage, empreinte SHA-256, URL des photos et médias autorisés ; stocker les octets médias seulement lorsque la collecte/conservation est permise. RAW Vault privé, chiffré, avec clés hors CI, index et politique de rétention. Ne pas exposer de données personnelles ou médias sans droits.

**Succès / preuve :** déchiffrement indépendant, vérification SHA-256 des pages et médias, restauration depuis stockage durable, manifeste complet, **0 écriture DB métier**.

## LOT N04 — Industrialisation par paliers

**Goal :** augmenter le débit sans perdre la fiabilité ni surcharger les sources.

**Exécution :** tests à **100 → 1 000 → 10 000 pages**, puis extension selon mesures et permissions. Suivre **URL découvertes, pages réellement capturées, médias conservés, erreurs par catégorie**, ainsi que taux de duplication, temps et coût.

**Succès / preuve :** manifestes et taux observés à chaque palier, reprise validée, couverture progressive mesurée ; aucun chiffre de capacité n'est garanti à l'avance. **Gate :** palier suivant seulement si le précédent est sain.

## LOT N05 — PULPER, moules et certification

**Goal :** transformer les RAW en annonces exploitables, sans faux positifs.

**Exécution :** moules JSON versionnés, extraction conservatrice, normalisation, déduplication des URL et biens physiques, contrôle de fraîcheur, disponibilité, cohérence, droits de réutilisation et gestion des incertitudes.

**Succès / preuve :** tests de parsing et d'intégrité, audit de faux positifs, comptages distincts `RAW capturés / URL distinctes / biens distincts / annonces certifiées`. Admission DB uniquement après gates ; aucun média publié sans droits.

## Ordre critique / reprise

1. **Next exact :** vérifier l'artifact chiffré du run `40493297128` (offset 120) et réconcilier le compte réel des URL distinctes.
2. Auditer l'inventaire des 54 161 références et rechercher les partitions publiques supplémentaires (LOT N01).
3. Construire file persistante et crawler hybride avec tests (LOT N02).
4. Raccorder RAW Vault chiffré durable et captures médias autorisées (LOT N03).
5. Tester paliers 100/1 000/10 000 avec métriques réelles (LOT N04).
6. Exécuter PULPER et gates de certification (LOT N05).
7. Closeout : mise à jour des documents canoniques, cohérence repo/HEAD/PR/CI, revue et merge uniquement selon gates applicables. **Pas de déploiement Vercel sans autorisation explicite.**

**Blocage connu :** écriture GitHub de lancement du lot suivant précédemment refusée par contrôle de sécurité ; ne pas annoncer de nouveau run sans preuve.
**Avancement global : non certifié.**

## N01 — relevé public du 29 octobre 2026 (lecture seule)

TinyFish Fetch a confirmé l'index `/sitemap.xml` avec 15 partitions. Les titres des 6 sitemaps `listings-0..5.xml` déclarent respectivement 10 000, 10 000, 10 000, 10 000, 10 000 et 6 316 URL : **56 316 références annoncées**, contre 54 161 dans l'inventaire historique (+2 155 références annoncées, pas nécessairement nouveaux biens). L'outil tronque l'affichage à 5 000 URL par sitemap ; le décompte intégral et l'unicité restent à auditer.

Autres titres relevés : `recent.xml` 1 000 URL ; `cities.xml` 246 ; `quartiers.xml` 2 414 ; `pages.xml` 42 ; `prices.xml` 166 ; `markets.xml` 1 539 ; `guides.xml` 22 ; `contrats.xml` 32. `feenway.xml` n'a pas fourni de nombre interprétable. **Ne pas additionner ces partitions comme des biens uniques.**

`recent.xml` expose des identifiants jusqu'à `240233` ; les six sitemaps d'annonces ne prouvent pas à eux seuls la couverture de ces références. `robots.txt` indique `Allow: /` et `Disallow: /api/`, `/admin/`, `/paiement/`, `/samsar/`, avec signal `search=yes, ai-train=no, use=reference`. Ces signaux ne valent pas licence de republier intégralement textes et photos.

**N01 statut : EN COURS.** Preuves restantes : télécharger les six XML originaux sans troncature, SHA-256, déduplication inter-partitions, couverture villes/quartiers, rapport des URL manquantes. Aucun nouveau RAW, aucune écriture DB, aucun déploiement vérifié dans cette opération.

## N01 — validation croisée du manifeste historique (29 octobre 2026)

**Preuve locale indépendante :** archive GitHub `github-actions-artifact-12721712627.zip` disponible dans les pièces du chantier, fichier `discovery.jsonl` (15 165 080 octets). Analyse JSONL : **54 161 entrées, 54 161 URL distinctes, 54 161 identifiants distincts** ; distribution : 10 000 par `listings-0..4.xml` et 4 161 dans `listings-5.xml`. SHA-256 calculé : `fec482fc39ece6909bb5a46abc57e5372c16a6e7ef9e00810af6bfcf469d0d4b`, égal à `manifest_sha256` dans `summary.json`. Observation historique horodatée `2026-10-27T09:08:22.581Z`. Identifiants historiques de 167989 à 237346.

**Comparaison live :** les titres des six sitemaps consultés via TinyFish le 29 octobre déclarent **56 316 URL**, soit **+2 155 références déclarées** ; le sixième passe de 4 161 à 6 316. `recent.xml` déclare 1 000 URL, avec des IDs observés jusqu'à 240233, sans preuve d'unicité inter-partitions ni de disponibilité des annonces.

**Limitation explicite :** les réponses TinyFish tronquent l'affichage des grands sitemaps à 5 000 URL ; le téléchargement des six XML intégraux n'a pas abouti dans l'environnement de vérification (DNS indisponible). Le **nouveau total distinct** n'est donc **pas certifié**. Aucune nouvelle collecte RAW, écriture DB ou publication n'est déclarée.

**Next exact :** obtenir les six XML complets par une exécution autorisée avec accès réseau ; calculer leur SHA-256 et leur ensemble d'URL canonisées ; mesurer le delta réel contre le manifeste historique, puis la couverture des pages villes/quartiers/pagination. N01 reste **EN COURS**.

## N01 — contrôle complémentaire des recouvrements (29 octobre 2026)

Via TinyFish Fetch en format JSON, `recent.xml` fournit **1 000 URL extraites, toutes distinctes** ; `listings-5.xml` fournit **5 000 URL extraites, toutes distinctes**, sur **6 316 déclarées**. L'intersection entre ces deux **sous-ensembles visibles** est **0 URL**. Cela **ne démontre pas** l'absence de recouvrement avec les **1 316 entrées tronquées** de `listings-5.xml`, ni avec les autres sitemaps. Les identifiants récents visibles vont de `238901` à `240233` (ordre et trous possibles). Tentative de récupération XML intégral depuis l'environnement local : échec DNS `www.feenway.com`. **Aucun total global distinct actuel certifié.**

**Next exact inchangé :** récupération XML complète autorisée → déduplication globale et SHA-256 → couverture catégories/villes/quartiers → closeout N01.

## N01 — audit complémentaire des URL visibles (29 octobre 2026)

TinyFish Fetch en mode JSON a permis de comparer les **5 000 URL visibles** de chacun des sitemaps `listings-0.xml` à `listings-4.xml`. Chaque échantillon comporte 5 000 URL uniques et les cinq ensembles comparés ne présentent **aucun doublon entre eux**, soit **25 000 URL distinctes observées**. Les sitemaps annoncent toutefois 10 000 URL chacun : les 25 000 entrées restantes de ces cinq fichiers ne sont pas vérifiées dans ce contrôle. Le sixième sitemap annonce 6 316 URL mais son affichage est également tronqué à 5 000. La tentative de téléchargement direct de l'XML complet depuis l'environnement d'exécution a échoué sur la résolution DNS du domaine FeenWay.

**Conclusion bornée :** 25 000 URL distinctes observées dans ces cinq échantillons ; 56 316 références déclarées dans les six sitemaps ; total distinct actuel non certifié. **N01 reste EN COURS.** Prochaine action : extraction intégrale autorisée des XML, SHA-256, déduplication globale et réconciliation avec les 54 161 URL historiques.

## N01 — nouvelle mesure live et vérification de limite (29 octobre 2026)

TinyFish Fetch en format HTML, sur `listings-5.xml`, annonce désormais **6 321 URL** (contre 6 316 lors du contrôle précédent), soit **+5 références déclarées**. Le sitemap `recent.xml` affiche les identifiants récents jusqu'à **240238** (contre 240233). Les réponses HTML de TinyFish restent **tronquées à 5 000 liens**, malgré un corps de 510 070 caractères : le changement de format markdown → HTML **ne résout pas** le problème de complétude. Une tentative directe `requests.get` depuis le conteneur échoue à la résolution DNS `www.feenway.com` ; aucun XML brut complet n'a été récupéré. **N01 toujours non certifié**. Le total instantané des six sitemaps serait **56 321 références déclarées** si les cinq premiers restent à 10 000 ; ce total est une hypothèse dérivée de mesures faites à des instants différents, non une mesure atomique.

**Prochaine action :** exécuter un audit XML brut complet depuis un environnement autorisé disposant d'un accès réseau, comparer au manifeste historique, puis valider l'unicité et les SHA-256. Aucun contournement ni collecte de pages d'annonces n'a été tenté dans ce contrôle.

## N01 — implémentation audit XML intégral (29 octobre 2026)

Script en lecture seule créé : `scripts/acquisition/feenway-n01-sitemap-audit.mjs` (commit `92c0e517`). Il télécharge uniquement les six sitemaps publics `listings-0..5.xml`, avec timeout de 20 s par fichier, calcule SHA-256 des réponses XML, compte les URL et les doublons intra/inter-fichiers, puis écrit un rapport JSON local. Pas de requêtes vers les pages d'annonces, pas d'écriture DB, pas de déploiement. **Le script n'a pas encore été exécuté dans un environnement avec accès réseau et ses résultats ne sont pas certifiés.** Next : test de syntaxe, exécution réseau autorisée, inspection du JSON et comparaison au manifeste historique avant clôture N01.

## N01 — exécution de contrôle et CI dédiée (29 octobre 2026)

- Syntaxe du script `feenway-n01-sitemap-audit.mjs` : `node --check` PASS (Node 22).
- Vérification locale sur réponses XML simulées : six sources, sept URL uniques, deux doublons (un intra, un inter), empreinte SHA-256 calculée ; échec HTTP 503 simulé correctement traité (rapport conservé, `complete=false`, code retour non nul).
- Exécution réseau locale : les six requêtes retournent `fetch failed` ; aucun XML complet récupéré localement et aucun inventaire live certifié.
- Workflow GitHub Actions en lecture seule ajouté sur branche `data/200k-fresh-parser-v2` : `.github/workflows/feenway-n01-sitemap-audit.yml` (commit `3e9570e4`), run [40965410705](https://github.com/hraaaaf/Akarfinder/actions/runs/40965410705) observé `queued` ; rapport JSON artifact prévu même en cas d'échec. Ce run n'est **pas une preuve de succès** avant inspection de son résultat.
- Limite à lever lors de la certification : le script actuel calcule le SHA-256 du texte XML décodé, et non des octets HTTP bruts. Les six réponses, les comptes et la comparaison avec le manifeste historique de 54 161 URL restent à vérifier. Les autres surfaces (villes, quartiers, pagination) ne sont pas closes.

**Statut N01 : OUVERT, non certifié.** **Next exact :** inspecter l'artifact JSON du run 40965410705 ; valider la capture complète, l'intégrité sur octets bruts et les écarts historiques avant toute clôture N01 ou passage à N02. Zéro déploiement, zéro écriture DB pendant ce lot.

## N01 — six XML intégraux récupérés : résultat GitHub vérifié (29 octobre 2026)

**Run indépendant :** [40965410705](https://github.com/hraaaaf/Akarfinder/actions/runs/40965410705), SUCCESS, job `123768531362`, artifact `12938601039` récupéré et JSON inspecté. Mesure `2026-10-29T22:25:02.640Z` : **56 327 URL uniques**, **0 doublon intra/inter-partitions**, **6/6 XML HTTP 200**, **0 erreur**. Partitions : `10 000 × 5` puis `6 327` dans `listings-5.xml`. Six SHA-256 de réponses XML enregistrés dans l'artifact. Ce premier script calcule les empreintes à partir du texte XML décodé, donc **le SHA de l'octet réseau brut n'est pas encore indépendamment certifié**.

**Comparaison de comptes seulement :** archive historique artifact `12721712627` retéléchargée ; `discovery.jsonl` = **54 161 URL distinctes**, SHA-256 `fec482fc39ece6909bb5a46abc57e5372c16a6e7ef9e00810af6bfcf469d0d4b`. Delta mathématique **+2 166 URL** entre les deux snapshots ; ne pas qualifier les 2 166 de nouvelles annonces tant que le différentiel exact d'ensembles n'est pas calculé.

**Durcissement du script :** version en cours sur commit `0bd530f975153ba6f24a219e9bb6ab29223ac139` : limite de 8 Mo par XML, sortie de SHA-256 calculée sur octets de réponse `raw_sha256`, tests de fixtures enregistrés dans GitHub. Exécution réseau de cette version **non encore prouvée** à la date de cette note.

**Audit exact des ensembles :** relance read-only du workflow historique [40478471659 (attempt 2)](https://github.com/hraaaaf/Akarfinder/actions/runs/40478471659), constatée `in_progress`, pour obtenir le manifeste URL par URL courant et calculer les vraies additions / suppressions face aux 54 161 historiques. Zéro écriture DB, zéro publication, zéro déploiement Vercel.

**Statut N01 : PARTIEL, OUVERT.** Prochaines preuves : résultat du rerun + rapprochement exact ; empreintes brutes de la version corrigée ; inventaire des surfaces villes / quartiers / catégories / pagination et détection hors sitemaps.
