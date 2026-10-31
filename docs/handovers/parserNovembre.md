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

## N01 — réconciliation exacte des URL FeenWay (29 octobre 2026)

**Manifeste historique :** artifact `12721712627`, `54 161` URL distinctes, `2026-10-27T09:08:22.581Z`, SHA-256 du fichier `discovery.jsonl` `fec482fc39ece6909bb5a46abc57e5372c16a6e7ef9e00810af6bfcf469d0d4b` vérifié.

**Manifeste courant :** workflow [40478471659 tentative 2](https://github.com/hraaaaf/Akarfinder/actions/runs/40478471659) SUCCESS, artifact `12937643316`, `56 327` URL distinctes à `2026-10-29T22:33:01.472Z`. SHA-256 du fichier `discovery.jsonl` `097cbbb0a0f2ce58134ee797c1587a7677a610e62510006dd621a0daf2d43979` vérifié.

**Diff déterministe des ensembles JSONL :** **2 166 URL ajoutées**, **0 URL supprimée**, **54 161 URL persistantes**, **0 changement de partition** pour les URL persistantes, **0 doublon** dans le manifeste courant. IDs nouvellement observés entre `237347` et `240244`. Ces URL nouvellement inventoriées ne sont **pas** des biens actifs, distincts ou publiables certifiés.

**Contrôle complémentaire brut :** workflow `.github/workflows/feenway-n01-raw-integrity-verification.yml` ajouté au commit `45e11bc3878111ed063dcbc9e712ffb60ea713a4` pour tester le script durci et hacher les octets des six XML. **Ne pas déclarer son exécution réussie sans run/artifact confirmé.**

**Gate N01 toujours OUVERT :** inventaire des autres surfaces publiques (villes, quartiers, catégories, pagination, liens internes, éventuels JSON publics), sources/couvertures/hors-sitemaps, fiabilité d'accès et clôture indépendamment vérifiée. Aucun ajout DB métier, aucun déploiement.

## N01 — certification XML bruts et quinze partitions (29 octobre 2026)

**Run SHA-256 bruts :** [40969626633](https://github.com/hraaaaf/Akarfinder/actions/runs/40969626633) SUCCESS, artifact `12940160806`. Deux tests fixtures PASS, six fichiers XML HTTP 200, `56 327` liens d'annonces uniques, aucun doublon, aucune erreur. Les SHA-256 calculés sur les octets décodés du corps HTTP correspondent aux six empreintes du premier audit. Artifact du manifeste `12939372235` : `56 327` URL, SHA-256 `097cbbb0a0f2ce58134ee797c1587a7677a610e62510006dd621a0daf2d43979`.

**Run surfaces :** [40970256679](https://github.com/hraaaaf/Akarfinder/actions/runs/40970256679) SUCCESS, artifacts `12940580746` (rapport et 5 461 URL additionnelles de navigation), `12939274228` (manifeste listing), `12939229188` (SHA bruts). Index XML : **15 partitions découvertes et contrôlées** ; neuf hors `listings-0..5` ont été récupérées sans erreur, empreintes SHA-256 archivées :
- `recent.xml` : 1 000 URL, **1 000/1 000 présentes dans les six listings** ;
- `pages.xml` : 42 URL ;
- `cities.xml` : 246 URL ;
- `prices.xml` : 166 URL ;
- `markets.xml` : **1 548 entrées / 1 539 URL distinctes (9 répétitions internes)** ;
- `quartiers.xml` : 2 414 URL ;
- `guides.xml` : 22 URL ;
- `contrats.xml` : 32 URL ;
- `feenway.xml` : 0 URL (sitemap XML vide).
Total de navigation unique dans ces neuf partitions = **5 461 URL**, avec `recent` inclus (donc **pas 5 461 nouvelles annonces**). Robots et sitemap index lus, octets SHA vérifiés; aucune page annonce détaillée demandée, aucune écriture DB ni déploiement.

**Écart hors-sitemaps trouvé :** liens publics exposés sur 3 pages d'atterrissage (Casablanca ville, appartements à vendre Casablanca, et Racine). **65 URL d'annonces distinctes observées**, dont **7 absentes** du manifeste des 56 327 (sur le même snapshot), identifiants `238288, 239644, 239685, 239700, 239746, 239762, 239802`. Échantillon manuel, non extrapolable ; il réfute cependant une prétention d'exhaustivité de l'inventaire XML.

**Automatisation lecture seule du contrôle des liens** : script `scripts/acquisition/feenway-n01-page-links-audit.mjs` + tests, branche `data/200k-fresh-parser-v2`, workflow [40970666214](https://github.com/hraaaaf/Akarfinder/actions/runs/40970666214) **observé queued** (à inspecter, aucun succès présumé).

**Statut N01 : OUVERT.** L'inventaire des partitions XML est complet à l'instant des relevés, mais la couverture exhaustive des annonces accessibles via catégories, villes, quartiers, pagination et liens internes n'est pas démontrée. Next : analyser artifact du run 40970666214, mesurer et documenter les URL hors-sitemap, élaborer une stratégie bornée pour explorer ces autres entrées avant la clôture N01 et le passage N02.

## N01 — preuve reproductible des liens d'annonces hors six sitemaps (29 octobre 2026)

[Run 40970666214](https://github.com/hraaaaf/Akarfinder/actions/runs/40970666214) **SUCCESS**, tests offline PASS, artifact `12940610727` téléchargé et `report.json` vérifié indépendamment.

- **12/12 pages publiques HTTP 200** contrôlées (ville, marché/catégorie, quartier), sans accès à une fiche d'annonce : **263 URL d'annonces distinctes visibles**, dont **39 hors du manifeste `56 327`** à la date de l'audit ; **0 erreur**, `listing_detail_requests=0`, `db_writes=0`.
- Les **7 écarts** de l'échantillon manuel précédent sont retrouvés à l'identique. Sur les **39 URL hors-sitemap**, **25 identifiants sont inférieurs à 167 989** (minimum du manifeste des six listings) et **14** sont à l'intérieur de la plage d'IDs couverte : il ne s'agit pas seulement d'annonces nouvellement arrivées.
- Distribution des manques par page : `/immobilier/casablanca` 0/18, `/appartement-a-vendre/casablanca` 6/24, `/appartement-a-vendre/casablanca/racine` 1/24, `/immobilier/marrakech` 4/18, `/immobilier/tanger` 2/18, `/terrain-a-vendre/casablanca` 1/24, `/terrain-a-vendre/tanger` 0/24, `/terrain-a-vendre/fes` 0/24, `/terrain-a-vendre/marrakech/route-de-fez` 9/24, `/villa-a-vendre/casablanca/ain-diab-extension` 6/24, `/villa-a-vendre/marrakech/route-de-tahanaout` 0/24, `/appartement-a-louer/casablanca/palmier-maarif` 10/18.
- Le résultat ne justifie **aucune extrapolation de 39/263** à l'ensemble du site. Il réfute toutefois **l'exhaustivité** d'un inventaire limité aux XML. Les URL ne sont pas des biens uniques/disponibles certifiés.
- **Suivi :** nouveau mode `cities` du script `feenway-n01-page-links-audit.mjs`, pour examiner toutes les pages villes FR référencées, à **une requête par seconde**, sans détails ni accès `/api/`. [Run 40970980850](https://github.com/hraaaaf/Akarfinder/actions/runs/40970980850) observé `queued`. Ne pas déclarer sa sortie avant vérification.

**N01 OUVERT. Next exact :** inspecter ce run de villes et son rapport, puis planifier l'exploration bornée des autres 1 539 pages marchés et 2 414 pages quartiers (l'inventaire N01 des surfaces est fait, mais la couverture de leurs liens internes ne l'est pas). Ne pas passer N01 en CLOSED uniquement sur une CI verte.

## N01 — audit des liens hors sitemap, échantillon automatisé vérifié (29 octobre 2026)

**Run [40970666214](https://github.com/hraaaaf/Akarfinder/actions/runs/40970666214) : SUCCESS.** L'artifact `12940610727` (`feenway-n01-page-link-gaps`, `report.json`) a été téléchargé et lu. Horodatage du rapport `2026-10-29T23:05:47.689Z`. **12/12 pages publiques HTML 200**, **263 liens vers des annonces distinctes**, **39 URL absentes** du manifeste des six sitemaps et **0 erreur** ; aucun accès aux pages d'annonce détaillées, aucun appel API ni écriture DB dans ce run. Cet échantillon inclut les surfaces ville, catégorie et quartier. Les liens hors sitemap ne prouvent ni l'existence actuelle de la fiche, ni sa disponibilité, ni l'unicité du bien. Le rapport comporte l'origine des liens et les SHA-256 des pages HTML.

**Extension vérifiable préparée :** script `scripts/acquisition/feenway-n01-page-links-audit.mjs` élargi avec sélection déterministe répartie jusqu'à 40 pages (3 fixes, villes, marchés et quartiers) et un mode de couverture des pages villes françaises accessibles via `cities.xml`. Correction du mode villes et du JSONL de provenance, tests ajoutés. Le workflow existant a été adapté au HEAD `7feccc13bcd92b08bb4e2bba3a6ee191cb22e647`, avec run [40971175021](https://github.com/hraaaaf/Akarfinder/actions/runs/40971175021) **observé QUEUED**. Ne pas inférer de réussite avant la CI et les artifacts JSON/JSONL.

**N01 : OUVERT — certifiés : six XML complets, inventaire des 15 partitions, audit d'un échantillon HTML ; non certifiés : couverture complète des liens des pages catégories/quartiers, pagination éventuelle, disponibilité et unicité réelle.** Next : inspecter run 40971175021 et ses artifacts (notamment les URL hors sitemap avec provenance), puis mesurer la couverture restante sans contourner `robots.txt` ni l'API exclue. Aucun déploiement Vercel.

## N01 — extension sampling : incident CI diagnostiqué et corrigé (29 octobre 2026)

Le run [40971175021](https://github.com/hraaaaf/Akarfinder/actions/runs/40971175021) a terminé **FAILURE**, étape `N01 landing-page link audit syntax and offline tests`, avant les collectes HTML, à cause d'une expression régulière invalide dans le mode villes. La cause a été identifiée dans les logs GitHub. Correction en utilisant une validation directe du préfixe `/immobilier/` et du slug ; suppression d'une invocation villes dupliquée pour ne pas charger la source deux fois. Nouveau HEAD technique `62a1d8d45144b6323c9a40a5b0389454317243bd` ; [run de reprise 40971365129](https://github.com/hraaaaf/Akarfinder/actions/runs/40971365129) observé **queued**. Le premier contrôle des 12 pages et ses **39 URL hors sitemap** restent des preuves valides, mais le nouveau contrôle élargi n'est **pas encore validé**.

**Next exact :** lire les étapes/artifacts du run 40971365129, puis comparer les manifestes avec provenance et mesurer séparément l'échantillon stratifié et les pages villes. Si échec, diagnostiquer le log et corriger sans relecture passive en boucle. N01 reste OUVERT.

## N01 — préparation des surfaces hors-sitemap (29 octobre 2026)

**File déterministe sans accès réseau :** `scripts/acquisition/feenway-n01-surface-queue.mjs` et tests `scripts/data/__tests__/feenway-n01-surface-queue.test.mjs`, enregistrés sur `data/200k-fresh-parser-v2`. Exécution indépendante Node 22 réalisée à partir de l'artifact des neuf partitions `12940580746` : **1 720 URL FR** à explorer en priorité, dont **1 207 quartiers** et **513 marchés/catégories**, ordre quartiers puis marchés, **35 lots de 50**, SHA-256 de la file JSONL `07f7198f3c30dd66fae9857fa4b1026b4eef9fbbb6ea85e02658e3ec19045b57`. `node --check` PASS ; 2/2 tests PASS ; recoupement Python indépendant des comptes PASS. **0 requête externe et 0 écriture DB dans cette préparation.**

**Attention :** cette file n'est pas une preuve que les 1 720 pages ont été lues, ni que toutes les URL d'annonces sont inventoriées. Elle représente les destinations publiques FR dédupliquées des sitemaps quartiers/marchés. Contrôle d'accès, cadence, arrêt sur 403/429, préservation de la provenance et limites de réutilisation restent obligatoires avant une exploration de plusieurs milliers de pages.

**CI couverture villes :** [40970980850](https://github.com/hraaaaf/Akarfinder/actions/runs/40970980850) observée `in_progress` ; ne pas supposer son résultat. Next : récupérer le rapport villes, puis choisir et exécuter des lots N01 limités suivant le rendement et les contraintes, sans engager N02 ni déploiement.

## N01 — couverture des 82 pages villes FR : preuve et état 29 octobre 2026

**Run [40970980850](https://github.com/hraaaaf/Akarfinder/actions/runs/40970980850) : SUCCESS.** Artifact `12939064702` téléchargé et lu directement. `report.json` `observed_at=2026-10-29T23:10:12.708Z`. **82 pages villes FR planifiées / 82 tentées / 82 HTTP 200**, **1 471 liens de fiches distincts**, **194 liens absents du manifeste des six listings**, **0 erreur**, **0 requête de page d'annonce détaillée**, **0 écriture DB**. Ce résultat concerne exclusivement les **pages villes FR listées dans `cities.xml`** ; il n'établit pas la couverture des catégories, quartiers, langues alternatives et paginations. **194 liens ≠ 194 annonces actives.** Les 39 liens hors sitemap de l'échantillon précédent peuvent recouper ces 194 références ; ne pas les additionner.

**CI élargie :** run [40971365129](https://github.com/hraaaaf/Akarfinder/actions/runs/40971365129) FAILURE sur `evenSample is not defined` dans le test (import manquant), avant la collecte élargie. Correctif test `8f22294a`; workflow désormais déclenché par script et tests associés, commit `835e58bf`. Run [40971519388](https://github.com/hraaaaf/Akarfinder/actions/runs/40971519388) initialement observé `queued` ; **pas encore de rapport certifié** pour la version corrigée.

**Statut N01 : OUVERT.** Next exact : récupérer le JSONL complet des URL hors sitemap et le SHA de provenance du run corrigé ; mesurer unions/recouvrements avec les 39 URL du premier échantillon et confirmer la couverture marchés/quartiers sans sur-solliciter FeenWay.

## N01 — couverture des 82 villes certifiée en lecture seule (29 octobre 2026)

**CI :** [40970980850](https://github.com/hraaaaf/Akarfinder/actions/runs/40970980850), `completed/success`. Artifact `feenway-n01-82-cities.zip` / `report.json` lu et contrôlé indépendamment : **82/82 pages villes FR HTTP 200**, **1 471 liens d'annonce distincts**, **194 liens déclarés hors des six sitemaps**, **0 erreur**, `listing_detail_requests=0`, `db_writes=0`. 67 pages de ville contiennent au moins un lien hors sitemap. L'inventaire ne mesure ni la disponibilité réelle ni les biens uniques.

**Limite probatoire identifiée :** le précédent `report.json` ne conservait que douze `outside_examples` par page ; il est donc possible de reconstruire **193/194 URL absentes** des six sitemaps avec leurs provenances à partir de cet artifact, la 194e est comptée mais n'est pas identifiée dans l'ancien rapport. Le contrôle indépendant croise ces 193 URL contre le manifeste intégral des **56 327 URL**. Ne pas convertir cet ancien rapport en manifeste exhaustif.

**Nouveau run :** [40971519388](https://github.com/hraaaaf/Akarfinder/actions/runs/40971519388), initialement observé `in_progress` : tests de sécurité, échantillon stratifié de destinations publiques, mode 82 villes et **JSONL de provenance complet**. À récupérer et comparer avant validation. La file de **1 720 pages marchés/quartiers FR** reste une préparation offline (35 lots de 50), pas des pages déjà auditées.

**N01 reste ouvert.** Next : vérifier l'artifact du run, confirmer la 194e URL et établir les lacunes pages marchés/quartiers/pagination ; démarrer ensuite un lot pilote borné avec respect robots/rythme/arrêt sur refus. Aucun déploiement Vercel ni écriture DB.

## N01 — réconciliation de l'échantillon stratifié et des 82 villes (29 octobre 2026)

**Run [40971519388](https://github.com/hraaaaf/Akarfinder/actions/runs/40971519388) : SUCCESS.** Artifacts `12941060752` (40 pages / liens hors sitemap, JSONL) et `12941270257` (82 villes / liens hors sitemap, JSONL) téléchargés et lus directement.

- **Échantillon stratifié :** 40/40 pages HTTP 200 ; **827 liens de fiches uniques**, **284 URL hors des six XML**, 0 erreur, aucune page détail demandée ; SHA-256 indépendant du JSONL hors-sitemap : `2b2004776e0c0e7b9974ef3898d40c1b8372a8cac7565683d4cd5111ac2b352f`.
- **Villes :** 82/82 pages HTTP 200 ; **1 471 liens uniques**, **194 URL hors des six XML**, 0 erreur ; SHA-256 indépendant du JSONL hors-sitemap : `4945be4f90011820c385178d760bf8bbe3225db29ff9a7fd6aefe46de431bcd6`.
- **Diff indépendant des deux JSONL :** **22 URL hors-sitemap communes**, **262 exclusives à l'échantillon stratifié**, **172 exclusives aux villes**, donc **456 URL distinctes absentes des six XML**. Ce sont des liens publics non qualifiés ; leur disponibilité et unicité physique ne sont pas vérifiées. Aucune extrapolation au catalogue global.
- **Couverture restante :** la file hors villes contient **1 207 pages quartiers FR** et **513 pages marchés FR** (35 lots de 50, préparation locale testée). Les langues alternatives, paginations et liens internes non visibles dans les sitemaps restent hors certificat. La simple présence d'une URL n'autorise pas à republier le contenu.

**N01 reste OUVERT.** Next : stabiliser la CI/les edits concurrents sur `data/200k-fresh-parser-v2`, puis tester un lot pilote de 50 quartiers avec provenance et arrêt au premier refus 403/429, sans réexécuter inutilement les 82 villes. Aucune écriture DB ni déploiement.

## N01 — extension villes + catégories/quartiers réconciliée (29 octobre 2026)

**CI :** [40971519388](https://github.com/hraaaaf/Akarfinder/actions/runs/40971519388) **SUCCESS**, vérification `node --check` et tests hors ligne PASS, collecte HTTP en lecture seule, artifacts `12941270257` (villes) et `12941060752` (échantillon stratifié) téléchargés et inspectés. Réponses publiques : **82/82 villes** et **40/40 pages stratifiées**, **0 erreur**. Aucune page d'annonce détaillée demandée, aucune écriture DB et aucun déploiement.

**Comptes observés, avec SHA-256 vérifiés :**
- Pages villes : **1 471 liens distincts**, dont **194 URL hors des 56 327 URL des six sitemaps** ; fichier `report.jsonl` = **194/194 URL identifiées avec provenance**, SHA-256 `4945be4f90011820c385178d760bf8bbe3225db29ff9a7fd6aefe46de431bcd6`.
- 40 pages réparties (villes, marchés, quartiers) : **827 liens distincts**, dont **284 URL hors six sitemaps** ; `report.jsonl` = **284/284**, SHA-256 `2b2004776e0c0e7b9974ef3898d40c1b8372a8cac7565683d4cd5111ac2b352f`.
- **Recoupement indépendant des deux JSONL et du manifeste des six XML : 22 liens hors sitemap communs, 456 URL hors sitemap distinctes**, toutes absentes du manifeste initial. **56 783 URL de fiches distinctes découvertes au total** (56 327 sitemap + 456 liens landing), sans certification de statut/disponibilité/unicité physique. SHA-256 du manifeste de rapprochement trié `2ec7f642fdea2155ff99d3f7cc7ec274e94d22d61a8700c46e272b8e146b524e`.

**Couverture encore ouverte :** la file construite offline depuis les neuf partitions réunit **1 720 pages FR marchés/quartiers** (1 207 quartiers et 513 marchés), **35 lots maximum de 50**. Ces pages n'ont pas été exhaustivement explorées ; pagination/liens internes non certifiés. Les 122 captures de pages comptent des doublons de destinations possibles entre les deux groupes, et ne doivent pas être présentées comme 122 destinations uniques.

**État : N01 OUVERT.** Next exact : préparer et auditer un premier lot borné de 50 pages quartiers/marchés avec robots, 403/429 fail closed, rythme limité, provenance et résultat artifact, puis réconcilier le rendement et prolonger si sain. N02 reste non engagé.

## N01 — pilote batch 1/35 préparé et lancé (29 octobre 2026)

**Préparation vérifiée :** la file canonique `feenway-n01-surface-queue.jsonl` contient **1 720 URL FR distinctes**, réparties en **35 lots de 50 au maximum**. Le premier lot contient **50 pages quartiers publiques**, **50 URL uniques**, aucune route `/api/`, `/admin/`, `/paiement/`, `/samsar/`, aucune URL de fiche détaillée. Début du lot `/terrain-a-vendre/marrakech/route-de-fez`, fin `/appartement-a-louer/marrakech/gueliz`. Les 50 destinations sont **préparées, pas encore validées comme récupérées**.

**Code de contrôle :** `scripts/acquisition/feenway-n01-page-links-audit.mjs` dispose d'un mode `batch:1` borné à 50 pages, cadence 1 requête/s, `robots.txt` obligatoire, erreurs HTTP 403/429 provoquant l'arrêt, réponse et SHA-256 de chaque page, manifeste JSONL des liens absents des six XML avec page source. Tests de construction de lot ajoutés. Commit `ceb616ff0408e4c92baa2fa2a27846fff70a395c`.

**Exécution GitHub :** [run 40972268387](https://github.com/hraaaaf/Akarfinder/actions/runs/40972268387) observé `queued`, artifact attendu `feenway-n01-pilot-batch1`. Aucun succès ou nouveau lien n'est annoncé avant résultat et vérification du rapport.

**Pagination :** trois pages d'atterrissage publiques relues via TinyFish (ville Marrakech, appartement Casablanca, quartier Racine) : aucun `href` explicite de pagination détecté dans l'HTML extrait. Observation limitée ; ne démontre pas l'absence de pagination JavaScript ou d'autres surfaces.

**Statut N01 : OUVERT.** Next exact : inspecter les tests et l'artifact du run 40972268387, vérifier nombre de pages et URL hors sitemap, puis décider des lots suivants selon le rendement et les contraintes du site. Aucun déploiement Vercel ni écriture DB.

## N01 — pilote 1/35 exécuté et réconciliation vérifiée (30 octobre 2026)

**Run :** [40972268387](https://github.com/hraaaaf/Akarfinder/actions/runs/40972268387) **SUCCESS**, artifact `12942320515` téléchargé et analysé : `report.json` contient `complete=true`, **50/50 pages**, **1 163 liens d'annonces uniques**, **245 liens absents des six sitemaps**, `errors=[]`, `listing_detail_requests=0`, `db_writes=0`. Le `report.jsonl` contient les **245 URL uniques** avec leurs pages sources ; son SHA-256 recalculé est **`701c7a452f67cb11958c348008af0bb987719e37c317b6a900674f2f1b56bc22`**, identique au rapport. **38/50 pages** proposent au moins un lien hors XML.

**Réconciliation indépendante avec les 456 URL hors sitemap précédentes :** 245 URL dans le pilote, **3 déjà connues**, **242 nouvelles** ; **698 URL hors sitemap uniques au total**. Avec les **56 327 URL** des six sitemaps, l'inventaire de liens découverts atteint **57 025 URL** (aucune preuve de 57 025 biens actifs, distincts ou publiables). Empreinte SHA-256 du manifeste combiné trié avec provenance **`b6d5f590469d13450abe12c5618cb9d05bb62947d79029670187748f5988e87a`**. Rapports locaux `feenway-n01-pilot-batch1-reconciliation.json` et `feenway-n01-off-sitemap-merged-698.jsonl`.

**Action suivante :** auditer les **lots 2 et 3** (50 pages chacun) sans répéter le pilote 1, au maximum 1 requête/s, respect de `robots.txt`, arrêt sur 403/429, rapports JSON/JSONL + empreintes SHA-256. La file complète contient 1 720 URL FR quartiers/marchés ; **50 auditées / 1 670 restantes avant ces deux lots**. La CI de cette préparation doit être vérifiée séparément, sans présumer du succès.

**N01 : OUVERT.** Après les lots 2 et 3, rapprochement exact avec les 698 URL précédentes, puis couverture restant des pages quartiers/marchés et contrôles de pagination ou autre canal public. Aucun déploiement Vercel ni écriture DB.

## N01 — lots 2 et 3 certifiés / lancement lots 4–6 (30 octobre 2026)

**Preuve GitHub :** [run 41039380587](https://github.com/hraaaaf/Akarfinder/actions/runs/41039380587) **completed/success**. Les artifacts `12970390909` (lot 2) et `12969732644` (lot 3) ont été téléchargés, relus et leur SHA-256 JSONL recalculé avec correspondance au rapport ; les deux ont `complete=true`, `errors=[]`, `pages_ok=50/50`, `listing_detail_requests=0`, `db_writes=0`. Lot 2 : **983 liens distincts**, **186 URL hors XML**, SHA-256 `2d3a25feffba1b8a59c9e7d38621a8e877607413f35b107779b1691fefee85cf`. Lot 3 : **1 028 liens distincts**, **211 URL hors XML**, SHA-256 `c8de5a71265a33a4d056b98b76b122734d4334e20f8cb79b66fef9026e252f05`.

**Réconciliation sans double-compte :** **397 URL hors XML distinctes sur lots 2+3**, dont **19 URL déjà présentes** dans le manifeste de **698** obtenu avant ces lots ; **378 URL supplémentaires**. Le manifeste mis à jour contient **1 076 URL hors XML distinctes**, chacune avec provenance depuis les landing pages. Son SHA-256 `d211fed13ba5841a013831201266b7f5e6b9fd4b4ec6f7d40349188f691075c5` est vérifié. Fichiers de preuve locaux : `feenway-n01-batches2-3-reconciliation.json` et `feenway-n01-off-sitemap-merged-1076.jsonl`.

**Evolution source :** artifact du même run `12970176435` contient **57 056 URL uniques dans six XML**, contre **56 327** au relevé antérieur, soit **+729 URL nettes** ; aucun doublon intra-manifeste ; SHA-256 `5507a89321db8bab03d1866b4ee578150eb6f5563279ac5fbc1908df09972e39`. Aucune des 1 076 URL hors XML consolidées ne figurait dans ce manifeste d'octobre 30. **57 056 + 1 076 = 58 132 URL de fiches découvertes** ; on ne certifie ni l'activité, ni l'unicité immobilière, ni les droits de réutilisation.

**Suite autonome :** le workflow FeenWay est réduit aux audits XML + tests sécurité et **lots bornés 4, 5, 6** (50 pages maximum par lot, cadence 1 requête/s, robots vérifié, arrêt 403/429), **sans relecture inutile des 82 villes, de l'échantillon 40 pages ou des lots 2 et 3**. Le nouveau run doit être contrôlé : ne pas présumer son succès. Sur les 1 720 pages FR de la file, **150 pages uniques des lots 1–3 validées** ; **1 570 pages restantes avant exécution des lots 4–6**.

**N01 : OUVERT.** Next : résultats exacts des lots 4–6 et réconciliation multi-manifestes, puis lots 7–35 si cadence acceptable et aucune restriction, puis contrôle des surfaces hors file et pagination. Pas de déploiement Vercel, pas d'écriture DB.

## N01 — outil de réconciliation reproductible, lecture seule (30 octobre 2026)

Les nouveaux fichiers `scripts/acquisition/feenway-n01-reconcile-evidence.mjs` et `scripts/data/__tests__/feenway-n01-reconcile-evidence.test.mjs` documentent le rapprochement automatique de deux snapshots : manifeste `discovery.jsonl` + ancien JSONL hors sitemap + rapports et JSONL des nouveaux lots. L'outil vérifie l'intégrité SHA-256 des lots, les comptes, l'absence de doublons intra-lot, le caractère réellement hors sitemap des nouvelles URL, la provenance et le statut read-only, puis produit un manifeste consolidé et sa preuve SHA-256. Il ne contacte aucun site ni base. **Vérifié localement avec Node 22 : 2/2 tests PASS ; rejeu sur les vrais lots 2–3 : 57 056 XML + 1 076 hors XML = 58 132 URL uniques, 378 nouvelles**. Le SHA-256 produit par cet outil diffère de l'ancienne sortie Python par ordre des propriétés JSON ; les comptes et les ensembles d'URL restent identiques (empreintes du fichier exact, pas invariants de l'ensemble).

La CI [41063193274](https://github.com/hraaaaf/Akarfinder/actions/runs/41063193274) des lots 4–6 a été observée `queued` le 30 octobre 2026 ; ne pas anticiper ses résultats. N01 ouvert, aucun déploiement Vercel ni écriture DB.

## N01 — lots 4–6 validés, lots 7–10 engagés (30 octobre 2026)

**Preuve forte :** [GitHub Actions 41063193274](https://github.com/hraaaaf/Akarfinder/actions/runs/41063193274) **completed/success**, artifacts `12980698302` (batch 4), `12980828119` (batch 5), `12980713157` (batch 6), `12980872986` (manifest six XML). Les trois rapports et JSONL ont été relus et validés en local, leurs SHA-256 recalculés correspondent aux rapports. `complete=true`, **150/150 pages publiques HTTP 200**, **0 erreur**, `listing_detail_requests=0`, `db_writes=0`. Comptes : lot 4 **1 156 liens observés, 278 hors six XML**, lot 5 **1 101 / 372**, lot 6 **1 112 / 436**. Au total **1 086 URL hors sitemap distinctes** sur ces trois lots, **11 déjà connues**, soit **1 075 nouvelles**.

**Réconciliation reproductible :** exécution `node scripts/acquisition/feenway-n01-reconcile-evidence.mjs` sur les vrais artifacts et le manifeste précédent **1 076 URL** ; **2/2 tests offline PASS**. Le snapshot de six XML contient **57 056 URL uniques**, SHA-256 `5507a89321db8bab03d1866b4ee578150eb6f5563279ac5fbc1908df09972e39`, identique au précédent. Inventaire cumulé **2 151 URL hors six XML**, total **59 207 URL de fiches découvertes**, pas des biens actifs certifiés. Manifeste JSONL consolidé SHA-256 **`bea2c949c56df2eeca9938d0eeddb562f9560033fca08993619d025a1b7190b1`**. Fichiers locaux : `feenway-n01-batches4-6-reconciliation.json` et `feenway-n01-off-sitemap-merged-2151.jsonl`.

**Couverture :** 6 lots × 50 = **300 / 1 720 pages quartiers/marchés FR de la file**, **1 420 restantes**. Contrôle des pages villes et échantillon stratifié également réalisé antérieurement. Les URL ne prouvent ni disponibilité des biens, ni unicité physique, ni droit de réutilisation.

**Suite technique décidée :** workflow read-only modifié pour les lots **7, 8, 9 et 10** (4×50 pages ; cadence 1/s, robots vérifié, arrêt sur 403/429, artifact JSON+JSONL pour chaque lot). Leur réussite n'est pas anticipée ; lire le run déclenché et ses artifacts, puis réconcilier contre le manifeste de **2 151 URL**. Pas de déploiement Vercel, pas d'écriture DB ; **N01 reste OUVERT**.
 
## FeenWay N01 — lots 7–10 vérifiés et lots 11–15 engagés (30 octobre 2026)

**CI certifiée :** [run 41064944070](https://github.com/hraaaaf/Akarfinder/actions/runs/41064944070) `completed/success` ; artifacts `12980989294` (7), `12980579627` (8), `12981194048` (9), `12980799328` (10), `12980544665` (manifest six XML) téléchargés et vérifiés indépendamment. Les quatre rapports confirment **200/200 pages HTTP 200**, aucune erreur, aucun accès détaillé, aucune écriture DB. Chaque `report.jsonl` compte le bon nombre d'URL et son SHA-256 correspond au rapport : lot 7 **1 151 liens / 430 hors six XML**, lot 8 **1 136 / 530**, lot 9 **1 173 / 425**, lot 10 **1 166 / 481**.

**Réconciliation indépendante :** les 1 866 URL hors six XML des quatre lots sont distinctes ; **61** figuraient déjà parmi les 2 151 URL hors XML précédentes, soit **1 805 URL supplémentaires** par rapport au précédent manifeste. Le nouveau snapshot des six XML comporte **58 501 URL distinctes**, SHA-256 `98577612ffb32e843ec639b01bdc6ef81e1b0c37ef468bfbdaff75d17ae93f5d`, soit **+1 445** contre le précédent snapshot (57 056). **39** URL du précédent manifeste hors sitemap sont désormais présentes dans les six XML : elles sont reclassées, pas dupliquées. L'inventaire consolidé exact est de **3 917 URL hors XML + 58 501 dans les six XML = 62 418 URL distinctes de fiches découvertes**, aucune certification de biens actifs ou physiquement distincts. SHA-256 du manifeste généré en Python `4ed6fe0e8d389594388ec2aaacd4ff9456108f85ea307d7fffbb71ddfd1f42f2` ; **manifeste canonique Node** (mêmes URL et provenances, sérialisation JSON différente) SHA-256 `70767f58983a4422980666a57cb9bfa6e1c8ea23e131b09fecb79a1723fee668` ; **2/2 tests du rapprocheur Node PASS**, rapport local `feenway-n01-batches7-10-reconciliation.json` et manifeste `feenway-n01-off-sitemap-merged-3917.jsonl`.

**Couverture :** **500/1 720 destinations** de la file quartiers/marchés FR, **1 220 non auditées**. La hausse du nombre de fichiers XML n'implique pas 1 445 nouveaux biens actifs.

**Suite autorisée et déclenchée :** lots **11–15** (maximum 250 pages en cinq groupes de 50), lecture seule, cadence de 1 requête/s, vérification robots, arrêt 403/429, SHA-256 et JSONL d'origine par lot, timeout de job 20 min. Ne pas présumer réussite avant les artifacts et leur réconciliation avec les 3 917 URL hors six XML du dernier snapshot. Aucun déploiement Vercel, aucun SQL métier ; **N01 OUVERT**.

## N01 — lots 11–15 certifiés ; lots 16–20 engagés (30 octobre 2026)

**Preuve :** [run GitHub 41066320964](https://github.com/hraaaaf/Akarfinder/actions/runs/41066320964) `completed/success`. Artifacts `12983975031` (11), `12983745468` (12), `12982254804` (13), `12982204839` (14), `12982234878` (15), `12983970026` (sitemaps), téléchargés et contrôlés. Les rapports confirment **250/250 pages récupérées**, **0 erreur**, aucun accès aux fiches détaillées, `db_writes=0`. Le SHA-256 brut de chaque JSONL correspond au rapport ; déduplication intra-lot OK.
- Lot 11 : **1 112 liens / 482 hors sitemap** ; SHA `4cd2dd5db4d98ececd3f81fc22e4eccdf66fffdf3b71c1600764f0608a3544e8`.
- Lot 12 : **1 113 / 589** ; SHA `7ee5d59e725e9b33d6eda359a818ccc4d04942f0d8fba76a737d14761ad8e7b8`.
- Lot 13 : **843 / 334** ; SHA `7c212df7df2907f95a656f6d81fe0ec1c96784cfcd45fa1fac603a493e3aac57`.
- Lot 14 : **991 / 504** ; SHA `902736c52638164a6d729a1a62453f4038539c21ae337dbe8eead070a03d33c6`.
- Lot 15 : **1 070 / 520** ; SHA `bb365d264769232034c0e716525b5069804c24b62c775bdd73a0dab8e11e6efb`.

**Réconciliation indépendante :** 2 429 URL hors XML distinctes dans les cinq lots, dont 38 déjà dans le manifeste de 3 917 URL ; **2 391 nouvelles**. Le snapshot des six XML recule de **58 501 à 57 056 URL** : **1 445 URL absentes** du relevé actuel (aucune URL ajoutée relativement au snapshot précédent). Leur absence n'est **pas une preuve de suppression**. Le nouveau relevé a **57 056 URL dans six XML + 6 308 URL hors XML issues des pages = 63 364 URL** ; historique cumulatif sur les relevés disponibles = **64 786 URL distinctes découvertes**, dont **1 422 absentes du nouveau relevé combiné**. Le total cumulé ne mesure pas les biens actifs, uniques ou réutilisables. SHA du manifeste hors XML nouvellement écrit en Python `36df810a5413c69fe88947274e943da57fa25ec9c79ac7c9071f8dd600a84299` ; rapport `feenway-n01-batches11-15-reconciliation.json`, JSONL `feenway-n01-off-sitemap-after-b15.jsonl`.

**Couverture :** **750/1 720 pages** marchés/quartiers explorées, **970 à visiter** (20 lots max restant après batch 15). Pages villes auditées séparément.

**Suite exécutée :** workflow modifié pour **lots 16–20**, 5 lots de maximum 50 pages, lecture seule, 1 requête/seconde, contrôle robots, arrêt 403/429, JSON/JSONL+SHA préservés. Le nouveau run doit être vérifié avant toute certification. **N01 OUVERT**, aucun déploiement Vercel ni écriture DB.

## N01 — CI rouge lots 16–20 : diagnostic et garde-fou redirection (30 octobre 2026)

[GitHub run 41073099353](https://github.com/hraaaaf/Akarfinder/actions/runs/41073099353) **FAILURE**, tentative 1 : transfert XML interrompu (`listings-2.xml` et `listings-3.xml`, sans erreur HTTP 403/429). Tentative 2 : XML OK, mais **lot 16 FAIL** avec 47/50 pages `200` et trois `HTTP 308` (alias publics). Artifacts `12987005534` et `12985851776` analysés. Les **534 liens hors XML du lot incomplet ne sont PAS ajoutés aux totaux certifiés** ; les lots 17–20 sont non exécutés.

**URLs 308 vérifiées indépendamment (TinyFish final_url)** :
- `/terrain-a-vendre/marrakech/route-dourika` → `/terrain-a-vendre/marrakech/route-de-lourika`
- `/terrain-a-vendre/marrakech/route-de-fes` → `/terrain-a-vendre/marrakech/route-de-fez`
- `/appartement-a-vendre/tanger/ziatene` → `/appartement-a-vendre/tanger/ziaten`

**Correctif borné :** l'audit HTML suit au maximum une redirection HTTP 301/302/307/308, uniquement vers HTTPS `www.feenway.com`, **même famille de catégorie et ville**, sans query, fragment, identifiant, redirection vers `/api/` ou `/listings/`. Une seconde redirection, un changement de domaine, une route non autorisée ou une redirection `robots.txt` restent bloquants. Le rapport conserve l'URL source, l'URL finale, la cible de redirection et le SHA-256 de la réponse. Trois tests additionnels couvrent le parcours canonique et les refus. Aucune augmentation de cadence ; l'arrêt sur 403/429 est conservé.

**Next exact :** vérifier la CI déclenchée par le correctif ; si verte, valider artifacts lots 16–20, réconcilier sans les 534 liens du lot incomplet, puis poursuivre N01. Aucun déploiement Vercel ni écriture DB.

### Incident de syntaxe lors du correctif 308 (30 octobre 2026)

La CI [41074295013](https://github.com/hraaaaf/Akarfinder/actions/runs/41074295013) a terminé **FAILURE** dans `node --check`, avant les lots 16–20 : expression régulière de vérification des chemins publics mal échappée. **Deuxième incident de syntaxe similaire dans N01 ; stratégie changée : aucune regex de route dans la validation des redirections ; contrôle explicite des segments par `startsWith` et ensemble de préfixes réservés.** La validation fail-closed, la limitation à une seule redirection et les tests prévus restent inchangés.

**Next :** exécuter la nouvelle CI et lire les logs des tests + les cinq artifacts. Ne pas ajouter les 534 liens du lot 16 incomplet aux comptes avant passage vert et réconciliation.

## N01 — lots 16–20 SUCCESS, PR #1105 rouge pour artifact freeze expiré (30 octobre 2026)

**N01 certifié :** [run GitHub 41074557115](https://github.com/hraaaaf/Akarfinder/actions/runs/41074557115) `completed/success`. Les cinq artifacts (lots 16–20, chacun 50 pages) et l'artifact XML ont été téléchargés et vérifiés indépendamment : **250/250 pages**, **0 erreur**, **0 détail consulté / 0 écriture DB**, SHA-256 JSONL vérifiés. Redirections canoniques bornées suivies : lot 16 = 3, lot 17 = 2, lots 18–20 = 0. Liens hors six XML par lot : 553, 618, 405, 521, 718. **2 815 URL hors XML uniques dans les cinq lots** dont **110 déjà dans l'ancien manifeste landing de 6 308**, soit **2 705 nouvelles URL landing**.

**Snapshot du run :** les six sitemaps contiennent **58 507 URL distinctes** (hash `1417583ea02c55b163b490f796a0c9c4d0da3b1a7837406a275b0ee2968bd7d1`), contre **57 056** à la précédente vérification ; 1 451 entrées en plus, 0 sorties. **23** URL auparavant « hors sitemap » sont maintenant présentes dans les six XML et sont reclassées. Manifestes de liens publics actuels : **8 990 URL hors XML** (SHA-256 du fichier `e830cd032e6dd4de736d12fba10e924b0ac4a224674a0749e60957e3e7a3888c`), union exacte **67 497 URL découvertes**, pas des biens actifs ou propriétés physiques distinctes. Rapports locaux `feenway-n01-batches16-20-reconciliation.json` et `feenway-n01-off-sitemap-after-b20.jsonl`. Couverture **1 000/1 720 pages quartiers/marchés FR**, **720 restantes**.

**Pourquoi la PR #1105 est rouge malgré N01 vert :** quatre checks de [GitHub Freeze Full Field Recovery 41074570508](https://github.com/hraaaaf/Akarfinder/actions/runs/41074570508), [Sarout Parser V2 41074570431](https://github.com/hraaaaf/Akarfinder/actions/runs/41074570431), [Mubawab Parser V2 41074570389](https://github.com/hraaaaf/Akarfinder/actions/runs/41074570389) échouent tous à `Fetch canonical freeze` : `curl HTTP 410` pour l'artifact historique **10910779576**, archive `clean-corpus-v4.11-core.jsonl.gz`, hash attendu `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`. Ce sont des **certifications BLOQUÉES**, pas des échecs prouvés des parsers. Ne PAS remplacer par un autre corpus, ne PAS marquer les jobs verts par `continue-on-error`. Une restauration bit-for-bit du freeze original, avec hash vérifié, est requise pour rendre ces certifications exécutables ; aucune copie authentifiée trouvée dans les sources consultées (repo / Drive recherche ciblée). PR reste DRAFT, aucun merge autorisé.

**Suite N01 :** lots **21–25** (250 pages maximum), lecture seule, robots, 1 requête/s, fail closed 403/429, chaque JSON/JSONL conservé. Vérifier nouveau run après déclenchement, réconcilier avec 8 990 URL hors XML puis poursuivre 26–35 et revue pagination. **Aucun déploiement Vercel ni DB.**

## FeenWay N01 — CI 21–25 rouge, lots 21–22 certifiés, reprise 23–27 (30 octobre 2026)

**Run 41076283680 = FAILURE** : [GitHub](https://github.com/hraaaaf/Akarfinder/actions/runs/41076283680). Les lots **21 et 22** sont entièrement conformes (**50/50 + 50/50 pages**, erreurs 0) et leurs artifacts 12987247986 / 12987866045 ont été récupérés. Lot 23 incomplet **49/50** à cause de `fetch failed` sur `https://www.feenway.com/appartement-a-vendre/agadir/riad-salam` ; artifact `12987511384` conservé seulement comme diagnostic, **742 liens hors sitemap du lot 23 partiel exclus du bilan** ; lots 24 et 25 non exécutés.

**Vérification SHA-256 et réconciliation indépendante :** les JSONL des lots 21 et 22 contiennent **636 et 712 URL hors six XML**, respectivement, **1 348 URL distinctes** entre les deux lots, dont **1 346 nouvelles** relativement aux manifestes des lots 1–20. Reconstitution complète en lecture seule depuis le manifeste de 6 308 URL après lot 15 et les artifacts 16–22, avec le six-XML du run vert 41074557115 (mêmes **58 507 URL** dans les lots 21–22) : **10 336 URL hors XML actuelles + 58 507 XML = 68 843 liens de fiches distincts découverts**, dont **1 100/1 720 pages quartiers/marchés auditées**. JSONL consolidé `feenway-n01-off-sitemap-b22-certified.jsonl` SHA-256 `f7725f22f17c52ac5c618a1fcec6025f3909a4eccb38a66759f430a67dfb70b0`, rapport `feenway-n01-batches21-22-reconciliation.json`. Ces liens ne prouvent pas des biens actifs, ni droits d'exploitation.

**Correction à effet limité :** une seule répétition de requête **uniquement sur exception réseau `TypeError`** dans le client HTML, signal neuf 22 s par tentative, pause de 1 seconde ; **HTTP 403/429, second redirect, changement de domaine, robots invalides restent fail-closed**. Test additionnel : échec réseau puis succès, second échec réseau, HTTP 429 non réessayé. Workflow raccourci aux **lots 23–27**, sans recalculer les lots 21 et 22 verts, 50 pages au plus par lot, 1 requête/s hors répétition réseau. Le résultat CI demeure non certifié jusqu'aux artifacts.

**Blocage parallèle PR #1105 :** source historique `clean-corpus-v4.11-core.jsonl.gz`, artifact `10910779576`, indisponible (HTTP 410) ; les checks Mubawab/Sarout/full-field requièrent sa restauration bit-à-bit avec hash `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`. Ne pas remplacer par un corpus différent ni masquer les checks. PR DRAFT, pas de merge, pas de déploiement et pas de DB.

**Next exact** : suivre la nouvelle CI 23–27, rapprocher les artifacts vert contre les 10 336 URL hors XML, poursuivre 28–35 si sain puis audit pagination et clôture N01. 

## N01 — lots 23–27 verts ; dernière tranche quartiers/marchés 28–35 lancée (30 octobre 2026)

**Preuve GitHub :** [run 41084628658](https://github.com/hraaaaf/Akarfinder/actions/runs/41084628658) **completed/success**, artifacts `12992295392` (23), `12991960662` (24), `12990624823` (25), `12992420266` (26), `12990614769` (27), `12992245341` (six XML) récupérés et vérifiés. **250/250 pages**, **0 erreurs**, `listing_detail_requests=0`, `db_writes=0`. SHA-256 JSONL recalculés exacts :
- lot 23 : 1 041 liens distincts ; **747 hors six XML**, SHA `59480227eb5fadb967e97fd768929b209a41e16717bd0e9d843ff44728e07b2d`.
- lot 24 : 893 liens ; **485 hors XML**, SHA `c420599ca33c1b8b1648cc1b35b1b4d25e8faa689777bc5b1e612563322c09c5`.
- lot 25 : 1 098 liens ; **209 hors XML**, SHA `07fc6044c1441eaa1c8f6d9523e820f695814553860767c25660c4599c71b7ba`.
- lot 26 : 1 148 liens ; **287 hors XML**, SHA `dcbf3b1c50f8e66d655c9e43a4395d9453b410e493118911cc8dfb864dfd88ef`.
- lot 27 : 1 016 liens ; **214 hors XML**, SHA `726f5e1a5a1f51420dfb9c1eda037ab3fa489dcf1f02d094566cc3b8b527a397`.

**Rapprochement indépendant :** les cinq lots réunissent **1 934 URL hors XML distinctes**, dont 111 déjà dans les 10 336 découvertes précédentes ; **1 823 réellement nouvelles**. Sitemap six XML **58 507 URL distinctes**, hash `1417583ea02c55b163b490f796a0c9c4d0da3b1a7837406a275b0ee2968bd7d1` sans changement. Manifestes consolidés **12 159 URL hors six XML + 58 507 XML = 70 666 URL de fiches distinctes découvertes**. SHA du JSONL `eaeaa88f6fcd81197bb9d36d47e1080370e328df24306adc02a96bc7051fc6b2`. Preuves locales `feenway-n01-batches23-27-reconciliation.json`, `feenway-n01-off-sitemap-b27-certified.jsonl`. Ne pas assimiler ce total à des annonces disponibles ou des biens distincts.

**Couverture :** **1 350 / 1 720 pages quartiers/marchés FR** auditées, **370 restantes**. Les 82 pages villes FR ont été étudiées séparément. **Suite exécutée :** workflow borné aux lots **28–35** (7×50 + dernier lot 20 pages), un seul cycle CI de ces 370 pages, délai 1 seconde par page, contrôles robots, redirections canoniques bornées, maximum une répétition sur TypeError réseau, arrêt 403/429 ; sauvegarde JSON/JSONL+hash par lot même si échec. Timeout 25 min. Ne pas présumer réussite avant les rapports.

**Statut N01 : OUVERT**, même après la couverture file tant que les autres surfaces publiques et la pagination ne sont pas examinées. **PR #1105 DRAFT bloquée indépendamment** par freeze GitHub historique artifact 10910779576, HTTP 410. Aucun merge, aucun déploiement Vercel, aucune écriture DB.

## N01 — couverture FR 35/35 lots vérifiée et audit pagination exploratoire (30 octobre 2026)

**Goal restreint vérifié :** inventorier les liens d'annonces visibles dans les six XML et sur toutes les pages publiques FR de la file quartiers/marchés (sans fiches détaillées). [GitHub run 41086289157](https://github.com/hraaaaf/Akarfinder/actions/runs/41086289157) **completed/success**, huit artifacts des lots 28–35 et manifeste XML téléchargés puis SHA-256 validés indépendamment. **386/386 pages** sur ces huit lots : sept lots de 50 et un dernier de **36** (et non 20 comme prévu avant évolution du sitemap), sans erreur, aucune requête de détail/écriture DB.

**Contrôle transversal complet :** les **35 artifacts** de lots 1–35 ont été relus et comparés par l'URL exacte de chaque page effectivement visitée : **1 736 visites, 1 736 pages distinctes, zéro doublon entre lots, zéro page manquante** face à la file FR actuelle calculée depuis les partitions `quartiers.xml` puis `markets.xml`. La file a augmenté de **1 720 à 1 736 URL**, et les 16 nouvelles ont bien été couvertes dans les lots exécutés. Les **82 pages villes FR** ont été auditées séparément auparavant. C'est une **preuve de couverture de la file sitemap FR à cette date**, pas une preuve d'exhaustivité du site.

**Inventaire consolidé :** manifeste des six XML = **58 513 URL de fiches** uniques, SHA-256 `5e2af7dcbcc9bc4d9b74f085c383a431483f708be28449ecbb9f3b9acbcc38b8` ; URL relevées hors XML = **15 197**, SHA-256 du JSONL consolidé `22406be5fd15c510c0775bca563816e70591b30e59f71af964ebf90e0f10fa38`. Union exacte **73 710 URL distinctes de fiches découvertes**, soit **3 041 nouvelles URL landing** des huit derniers lots par rapport aux découvertes précédentes ; **3 anciennes URL hors XML maintenant présentes dans les XML** (reclassées sans double comptage). Fichiers locaux `feenway-n01-batches28-35-reconciliation.json` (SHA-256 `24645a6623a0b718e6ec8e90077c200f3dbdfdfbbaef635086be14a4cf6806c4`), `feenway-n01-off-sitemap-after-b35.jsonl`, `feenway-n01-coverage-gaps-b35.jsonl` (vide).

**Vérification pagination read-only (limitée) :** trois pages publiques (ville Casablanca, appartements Casablanca, appartements Racine) comparées à leur URL avec `?page=2` via extraction de liens rendus. **18/18, 24/24, 24/24 liens de fiches identiques**, zéro lien nouveau ; la variante `?page=2` conserve le canonique de la page sans paramètre. Aucun lien explicite de pagination constaté sur ces trois pages. **Ne prouve PAS l'absence de pagination alternative, infinite scroll ou contenu JS chargé par API.** Aucun détail d'annonce visité lors de l'essai.

**Statut : N01 inventory source-file / FR-landing coverage VERIFIED ; N01 exhaustivité du site NON CERTIFIÉE.** Les **73 710** sont des URL vues, non des biens actifs/uniques ou légalement réutilisables. Suivant : approfondir par audit public borné des mécanismes de chargement, sans contourner robots ni consulter routes privées ; ne pas ouvrir une certification pleine de toutes les annonces sans preuve. PR #1105 demeure DRAFT : archive `clean-corpus-v4.11-core.jsonl.gz` (GitHub artifact `10910779576`) expirée HTTP 410, bloquant les checks Mubawab/Sarout/full-field. Aucun merge, Vercel ou DB.

### N01 — contrôle complémentaire du chargement des pages publiques (30 octobre 2026)

**Extraction rendue de trois pages supplémentaires :** `/appartement-a-vendre/casablanca`, `/immobilier/marrakech`, `/appartement-a-vendre/rabat` : aucun lien `?page=` ou `/page/` ni contrôle « Suivant », « Voir plus », « Charger plus » ou `pagination` observé dans le contenu/les liens **extraits**. En combinant les trois comparaisons `?page=2` précédentes et ces observations, aucune pagination publique exploitable par lien HTML n'a été **démontrée** dans ces échantillons. Ce contrôle ne détecte ni appels réseau du navigateur, ni écouteurs JavaScript, ni scroll infini caché par l'extracteur. **N01 reste uniquement certifié pour les XML + pages FR listées, pas pour un crawl complet des annonces du site.**

### N02 — sonde navigateur bornée, préparée le 30 octobre 2026

N01 reste documenté par la preuve 1736/1736 pages FR des sitemaps et 73710 URL découvertes ; pas de preuve d'exhaustivité générale. L'audit N02 utilise un workflow GitHub indépendant, trois pages publiques autorisées, au maximum trois défilements et aucune page de détail. Les trois tests de protection (robots, filtrage des liens, interceptions des requêtes) doivent passer avant Chromium. Les routes /api, /listings, /admin, /samsar, /paiement, les requêtes XHR/fetch, les écritures POST et les ressources externes sont bloquées. Les résultats sont INCONCLUSIVE si le JS nécessite des requêtes bloquées ; jamais de faux certificat d'exhaustivité. Rapport JSON conservé en artifact. Aucune capture écran, DB, Vercel ou merge.

PR #1105 demeure DRAFT ; les quatre checks Mubawab/Sarout/full-field échouent séparément sur l'artifact historique 10910779576 expiré HTTP 410. Ne pas les contourner.

### N02 — CI verte, 3 pages explorées mais preuve NON CONCLUSIVE (30 octobre 2026)

[CI 41092010780](https://github.com/hraaaaf/Akarfinder/actions/runs/41092010780) completed/success ; [artifact 12994162881](https://github.com/hraaaaf/Akarfinder/actions/runs/41092010780) JSON téléchargé, SHA-256 `8668b322039f7e300e698e1cffb17acd64e4900b36f1a4596a775a8b4112119f`. Tests de sécurité 3/3 PASS ; pages 200 x3, zéro erreur, zéro détails / DB. Liens HTML de fiches aux défilements 0,1,2,3 : **18/18/18/18** Casablanca ville ; **24/24/24/24** appartements Casablanca ; **24/24/24/24** Racine. **0 nouveau lien après scroll**, mais **116 fetch/XHR bloqués** (88+13+15), donc chaque conclusion `INCONCLUSIVE_BLOCKED_DYNAMIC_REQUESTS` : **ne pas déclarer l'absence de lazy-loading ou l'exhaustivité**. Le total N01 de 73 710 URL découvertes reste inchangé.

N02b, sans relâcher les barrières réseau : un nouveau diagnostic classe les URL des requêtes interdites par groupe générique de chemin (sans requête ni stockage de query/tokens) pour distinguer les chargements JS possibles. La CI de ce diagnostic doit être vérifiée séparément. Les blocages de PR #1105 liés à la freeze expirée (HTTP 410) restent indépendants, sans merge ni deploy.

### N02b — buckets certifiés, N02c phase load/scroll engagée (30 octobre 2026)

[CI N02b 41093275306](https://github.com/hraaaaf/Akarfinder/actions/runs/41093275306) SUCCESS (4/4 tests), artifact `12995565311` JSON SHA-256 `2ee5daeba23df41db21dd982e81db831995e092aafe1e9015fba0c753a5b5d84`. 3 pages, 18/24/24 liens inchangés après 3 scrolls. **116 requêtes dynamiques bloquées** : **70** catégories, **2** villes, **44** autres ; en plus **66** routes fiches et **6** API bloquées. Démonstration de requêtes JS, non preuve de nouvelle annonce. Verdict **INCONCLUSIVE**. N02c ajoute uniquement des agrégats de requêtes déjà interceptées par phase initiale / scroll, pour distinguer préchargement et chargement au scroll ; aucun endpoint bloqué ne sera appelé. Nouveau run à certifier. N01 = 73 710 URL découvertes, sans unicité physique ni droit de réutilisation. PR #1105 DRAFT et freeze HTTP 410 inchangées ; pas de merge, Vercel ni DB.
