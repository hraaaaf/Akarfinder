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
