# AkarFinder — Q1F / AkarParser V3 : annonces brutes en lots

## GOAL / SUCCESS / PROOF

GOAL : recevoir 10, 100, 1 000 ou davantage d'annonces en fichiers bruts (HTML, JSON, JSONL ou CSV), extraire les données utiles, mesurer leur qualité, et émettre des fiches internes notées de 0 à 100, sans publication automatique.

SUCCESS TECHNIQUE : pipeline hors ligne, données sources inchangées, calcul déterministe à date fixée, tri des fiches prêtes en interne / incomplètes / quarantaine, manifeste par hash, aucun import Neon.

PROOF AU 09/11/2026 : 20/20 tests de V3 réussis sur Windows (89/89 V2+V3), comprenant lots synthétiques de 10, 100 et 1 000 et réplication déterministe. Un pilote de compatibilité a traité 1 000 lignes historiques réellement enregistrées (Neon Recovery préstructuré, PAS des pages HTML brutes indépendantes). Résultat de ce pilote : 106 complete_requires_freshness, 894 partial, 0 ready_internal, 0 erreur, 0 publication. Couverture : titre 1 000, ville 1 000, quartier 570, prix MAD 834, surface m² 228, type 1 000, transaction 1 000. Les champs présents ne sont pas des champs indépendamment validés.

## Import de masse privé

Code : scripts/acquisition/akarparser_v3_raw_bulk.py.

Formats : HTML (.html/.htm), JSON objet/liste (.json), JSONL ou JSONL.gz, NDJSON, CSV ou CSV.gz. Un dossier privé peut contenir n'importe quel mélange de ces formats ; sous-dossiers parcourus dans l'ordre des chemins. L'outil lit JSONL et CSV en flux, sans charger en mémoire un lot entier. Pour de très gros tableaux JSON, convertir en JSONL.

Créer par exemple un dossier local Q1F_RAW_INBOX (hors du dépôt Git) et y déposer les pages/pages sources obtenues légitimement. Les résultats restent obligatoirement dans un dossier privé neuf, en dehors du dépôt et du dossier source.

Commande depuis le worktree V3 sur le PC Windows :

    python scripts/acquisition/akarparser_v3_raw_bulk.py --input "C:\chemin\Q1F_RAW_INBOX" --out "C:\chemin\Q1F_RESULTS_001" --as-of "2026-11-09T12:00:00Z"

Pour limiter un canary :

    python scripts/acquisition/akarparser_v3_raw_bulk.py --input "C:\chemin\annonces.jsonl.gz" --out "C:\chemin\Q1F_CANARY_100" --limit 100 --as-of "2026-11-09T12:00:00Z"

Les fichiers HTML peuvent avoir un sidecar facultatif : nom-de-page.html.meta.json contenant source_url, fetched_at ISO UTC, html_sha256, éventuellement source_offer_id et http_status. Le hash html_sha256 doit correspondre exactement au contenu, sinon la fiche est rejetée. Le sidecar n'est jamais compté comme annonce supplémentaire. Une date indiquée dans un sidecar demeure une déclaration d'entrée : elle ne prouve PAS une disponibilité actuelle ni des droits.

## Extraction, indicateurs et score

AkarParser V3 utilise les champs JSON et API, les métadonnées HTML, JSON-LD schema.org, les balises canoniques et des motifs textuels conservateurs (ex. prix explicitement suivi de MAD/DH, surface explicitement en m², labels Ville/Quartier). Il réutilise V2 pour la normalisation, le contrôle d'identité, les surfaces, les nombres, les types, les commodités et les images. Une unité SQF/FTK n'est jamais convertie silencieusement en m².

Sorties privées :
- all.jsonl.gz : chaque fiche normalisée avec informations de source, champs, chemins de provenance, erreurs et qualité ;
- ready_internal.jsonl.gz : fiches ayant leurs 7 champs indispensables, une URL HTTP(S), un horodatage déclaré récent et un score >= 80 ;
- review.jsonl.gz : fiches incomplètes, dates non prouvées ou ancienneté trop grande ;
- quarantine.jsonl.gz : conflits d'identité, dates futures ou URL répétées dans le lot ;
- errors.jsonl.gz : lignes non JSON ou documents invalides, sans recopier leur contenu ;
- aggregate_report.json : compteurs, couverture, sources, histogramme de scores, empreintes SHA-256.

Champs essentiels : titre, ville, quartier, prix MAD, surface m², type de bien et transaction ; URL d'origine requise pour ready_internal. Autres informations : description, photos valides, chambres, salle de bain, équipements, date déclarée, provenance par champ.

Score interne sur 100 :
- URL 8 ; titre 5 ; ville 10 ; quartier 10 ;
- prix 15 ; superficie 15 ; type de bien 10 ; transaction 7 ;
- fraîcheur de date déclarée 15 (<=30 jours), 5 (31-90 jours), 0 si ancienne/absente ;
- description 3 ; détails complémentaires 2.

Un score élevé n'est PAS une précision statistique mesurée. La fraîcheur récente n'est pas une preuve d'activité : freshness_independently_verified reste false. Les collisions et SERP seulement sont plafonnés à 49. Les résultats sont uniquement internes.

## GitHub Actions / droits

La CI de PR utilise uniquement des fixtures synthétiques. Workflow manuel préparé sur branche principale, protégé par confirmation explicite + environnement q1f-private-batch et runner Windows auto-hébergé isolé : variables Q1F_RAW_BATCH_PATH et Q1F_PRIVATE_OUTPUT_PARENT ; ni artefact brut, ni upload/cache, ni accès DB. Le runner privé et l'environnement n'ont pas été attestés disponibles/activés. GitHub Actions traite les données, mais ne les stocke pas durablement.

NEON PRODUIT : aucune écriture, aucune permission de publication attribuée par ce code. L'admission exigerait une étape distincte authentifiée : droits commerciaux, activité/actualité effectivement prouvée, précision source, dédoublonnage et conformité.

## Limites et prochaine preuve

Les tests HTML/JSON-LD V3 utilisent des exemples synthétiques ; la compatibilité réelle 1 000 lignes utilise un export historique déjà structuré. Il manque un corpus privé de pages HTML complètes représentatives par portail (Mubawab, Avito, Agenz, Domio) et une annotation indépendante des champs extraits. Par conséquent, aucune affirmation de 98 % de précision ni de couverture exhaustive des annonces brutes n'est possible.

NEXT EXACT : récolter un lot légal et privé de captures complètes par portail avec hash/date ; exécuter V3 sur 10, puis 100, puis 1 000, mesurer précision et couverture des champs sur vérité terrain, développer des adaptateurs spécifiques aux sites dont la structure le nécessite. Surveiller mémoire et performance pour 10 000+ ; convertir les gros JSON en JSONL. Ne pas importer Neon ni déployer Vercel.

PR V3 créée séparément de la PR Q1E #1188, branchée sur celle-ci pour réutiliser V2. Aucun merge sans feu vert ; aucun déploiement.

## Correction ciblée de la politique CI (09/11/2026)

Sur HEAD `82a6707dd1072b7d547535555f4a5c0d5d4771bf`, le workflow **CI Workflow Efficiency Policy** a échoué (run `42632312231`, job `129211442901`) : les deux nouveaux workflows AkarParser V3 avaient une concurrence au niveau racine et `cancel-in-progress: true`, mais le champ `group` ne contenait pas `github.workflow`, exigé par `scripts/ci/validate-workflow-efficiency.mjs`. Les 13 tests unitaires de cette politique avaient réussi ; son contrôle du diff complet avait détecté les deux configurations.

Correctifs isolés sans changement du parseur :
- `.github/workflows/akarparser-v3-private-bulk.yml` : ajout de `${{ github.workflow }}` dans la clé `concurrency.group`, commit `d00c49850140b6dd110bbfd60ca81ca6b4ef6b5e` ;
- `.github/workflows/akarparser-v3-raw-bulk-regression.yml` : même isolation par nom de workflow, commit `68e6396ff6f0af4c92c54c7fee7a6ba845b4f3ea`.

Les deux fichiers gardent le numéro de PR et l'annulation des exécutions obsolètes. La structure des règles a été vérifiée avant les écritures, mais **aucun succès CI sur ces corrections n'est revendiqué**. Première vérification du HEAD `68e6396f` : runs `42633907253` (Private Bulk), `42633907476` (V3 Regression), `42633907956` (Efficiency), tous QUEUED. Les 89/89 tests Python sont une preuve locale antérieure aux changements de workflow, non une preuve de succès de ces trois runs.

PR #1198 demeure Draft, non fusionnée. Aucun déploiement Vercel, aucune écriture Neon produit et aucune validation de précision sur de vrais HTML bruts. Prochaine action : contrôler les conclusions CI quand elles sont disponibles ; constituer un corpus autorisé, indépendant, multiportails, puis mesurer la précision réelle par champ/source avant toute admission.

## Q1F — Captures HTML publiques réelles / correctifs spécifiques portails (2026-11-09)

**Preuve locale directe, pas précision certifiée :** 25 pages de détail réellement récupérées sur Windows et conservées en privé hors Git dans `C:\Users\lenovo\Desktop\AkarFinder-DataMass-2026-11-07\Q1F_RAW_INBOX`, avec URL, horodatage HTTP 200 et SHA-256 en sidecar. Répartition : Domio 10, Agenz 5, Mubawab 5, Avito 5. Les quatre sources ont répondu sans échec HTTP pour ce canary. Pas de login, aucun contournement de protection, collecte temporisée et directives robots consultées. Les autorisations de réutilisation commerciale ne sont pas attestées par le moteur.

**État mesuré après corrections (lot de 25, horloge UTC réelle de l'exécution) :** Domio 4 `ready_internal` / 6 `partial` ; Agenz 5 / 0 ; Mubawab 2 / 3 ; Avito 5 / 0. Total **16/25 prêtes pour revue interne et 9/25 partielles, 0 admission Neon produit**. Couverture technique des champs : titre 25/25, ville 25/25, quartier 19/25, prix MAD 25/25, superficie 25/25, type 25/25, transaction 22/25. Ce sont des champs présents, **pas des taux de justesse ni des annonces fraîches vérifiées**.

**Défauts démontrés sur captures réelles puis corrigés :** Domio `RealEstateListing.price` structuré en `PriceSpecification` causait initialement 2/10 prix, corrigé à 10/10 ; les étiquettes de la zone héro fournissent parfois district/type/transaction mais ne sont pas extrapolées si absentes. Agenz : ville/quartier/type/vente depuis le chemin de la page détail. Mubawab : quartier/ville depuis le fil d'Ariane de l'annonce, aucune transaction inventée quand absente. Avito : risque de faux prix à partir des mensualités de crédit (`3334 DH/mois`), supprimé ; priorité au prix déclaré dans `og:title`, sinon prix manquant. Les montants ne sont pas automatiquement assimilés à une exactitude prouvée.

**Code :** adaptateur conservateur `scripts/acquisition/akarparser_v3_portals.py`, correctifs dans `akarparser_v3_raw_bulk.py`, nouveaux tests synthétiques sans copies de pages privées dans Git. Benchmark indépendant `akarparser_v3_benchmark.py` précédemment intégré : rapprochement `input_ref` (fichier + ligne + SHA) et annotations en aveugle, calcul de précision/rappel/couverture par champ et portail, sorties agrégées privées. **0 annotation indépendante fournie**, donc **0 précision réelle certifiée**.

**Tests après correction :** Python V2 69/69 + V3 33/33 = **102/102 PASS** en local ; syntaxe Python et `git diff --check` propres. CI sur le commit de ces modifications reste à contrôler après push. Aucun merge, aucune publication, aucun déploiement Vercel ni écriture Neon.

**Next exact :** terminer l'échantillon réel 100 pages, vérifier quantité/sha/provenance, mesurer uniquement la couverture, puis faire annoter indépendamment un échantillon aveugle avant d'afficher des taux de précision ; traiter les conflits démontrés et rerun des tests. Tout droit de publication reste un gate distinct.

## Q1F — Canary réel de 100 pages, volume atteint, exactitude non certifiée (09/11/2026)

**GOAL :** obtenir et traiter 100 pages d'annonce HTML brutes issues de quatre portails, sans injecter les données dans la base produit.

**SUCCESS technique OBSERVÉ :** 100/100 captures HTML privées datées et empreintées SHA-256, puis traitement local offline réussi dans `Q1F_REAL_100_PARSED_20261109`. Répartition vérifiée : 25 Domio, 25 Avito, 30 Mubawab (dont 7 pages de Rabat), 20 Agenz. Collecte de base 25 + complément 68 + 7 Mubawab. Agenz a renvoyé HTTP 429 après 15 captures additionnelles ; les requêtes sur Agenz ont été stoppées, sans contournement. Les 7 dernières fiches ont été obtenues ailleurs avec contrôle robots et débit limité. Originaux, métadonnées et rapports restent sur Windows en dehors de Git.

**PROOF parseur, horloge UTC actuelle :** `Q1F_PRIVATE_RESULTS/Q1F_REAL_100_PARSED_20261109/aggregate_report.json` : 100 entrées, 74 `ready_internal`, 26 `partial`, 0 erreurs déclarées, 0 admission Neon. Présence de champs (et non exactitude) : titre 100, ville 100, quartier 83, prix MAD 98, surface m² 99, type de bien 100, transaction 91. Le nombre de fiches prêtes est un **tri interne de complétude** ; aucune fraîcheur, disponibilité, droit de réutilisation ni concordance indépendante avec la réalité n'est certifiée. Les données récupérées ne comptent pas comme 100 nouvelles observations certifiées dans l'objectif DATA MASS.

**Sécurité :** manifestes SHA-256 par entrée et par sortie, origines conservées, audit local seulement, aucune information brute/personnelle sur GitHub, Notion ou CI ; aucune écriture DB (safety.db_writes = 0), aucune publication, aucun merge ni déploiement Vercel. Le benchmark indépendant par annotations humaines en aveugle n'a encore **aucune annotation vérifiée (0)** ; ne pas parler de précision mesurée.

**Next exact :** contrôler les métadonnées source pour détecter les contradictions internes (ce contrôle n'est pas une vérité terrain indépendante), terminer le commit/CI des adaptateurs, puis étiqueter les 100 observations indépendamment par champ avant de calculer la précision réelle et décider une éventuelle montée vers 1 000. Garder l'admission publique fermée.

**Contrôle supplémentaire (mêmes pages, non indépendant) :** `Q1F_PRIVATE_RESULTS/Q1F_REAL_100_PARSED_20261109/source_markup_consistency.json` : 25/25 prix Avito concordent avec `og:title`, 23/23 Domio comparables concordent avec `RealEstateListing.price`, 30/30 Mubawab comparables concordent avec `offers.price` ; **78/78 concordances pour les pages disposant d'une référence de prix directement comparable dans les métadonnées source**. 20 Agenz + 2 Domio sans référence exploitable dans cette méthode ; 0 anomalie relevée sur les 78 comparables. Ceci est un contrôle de cohérence interne basé sur la même source HTML, PAS une annotation indépendante, une précision statistique, un contrôle de fraîcheur ou une validation juridique.

## Q1F — Revue des anomalies du canary réel 100 (09/11/2026, sous-lot qualité)

**GOAL :** empêcher la promotion interne de fiches dont les champs sont présents mais dont le sens commercial est contradictoire ou le prix atypique.

**Anomalies observées sur HTML originaux :**
- Deux annonces classées `sale` affichent des prix de vente particulièrement bas au regard de leur surface. Les prix concordent avec les métadonnées source mais leur **validité immobilière n'est pas démontrée** : un prix d'annonce publié peut lui-même être incorrect.
- Sur les 30 HTML Mubawab du canary, `offers.businessFunction` vaut `#Sell`, y compris dans deux annonces où l'extraction lexicale des titres/descriptions indique `rent`. **Ne jamais déduire une vente du seul `#Sell` de Mubawab.** Le moteur conserve la transaction textuelle et signale la contradiction.

**Correctif vérifié :** nouveau statut `requires_manual_review` lorsque les champs d'une fiche auraient permis `ready_internal`, mais qu'un signal exige une vérification (vente inférieure à 50 000 MAD ; vente inférieure à 1 000 MAD/m² ; contradiction Mubawab `#Sell` avec le texte de location). Ces seuils sont des **alertes de plausibilité internes**, pas une preuve d'erreur. Le prix source est conservé, sans modification ni conversion. Les fiches déjà `partial` conservent ce statut mais enregistrent les `review_reasons`. En cas de mise en quarantaine antérieure, la quarantaine prime.

**PROOF — même corpus brut de 100 SHA inchangés, nouveau dossier privé** `Q1F_PRIVATE_RESULTS/Q1F_REAL_100_PARSED_20261109_v7_review_gates` :
- Avant : 74 `ready_internal`, 26 `partial`.
- Après : **71 `ready_internal`, 3 `requires_manual_review`, 26 `partial`** (Avito 1 risque prix, Mubawab 2 contradictions ; Domio 1 signal prix reste déjà `partial`).
- Répartition : Agenz 20 prêtes ; Avito 23 prêtes + 1 revue + 1 partielle ; Domio 10 prêtes + 15 partielles ; Mubawab 18 prêtes + 2 revues + 10 partielles.
- Couverture des 7 champs inchangée : ville 100/100, quartier 83/100, prix MAD 98/100, surface 99/100, titre 100/100, type 100/100, transaction 91/100. **0 droits certifiés, 0 vérité terrain indépendante, 0 écriture Neon.**
- Tests locaux **107/107 PASS** : V2 69/69 et V3 38/38 ; inclut le contrôle de routage du statut de revue vers `review.jsonl.gz`, l'absence de fausse vente sur métadonnées seules et le maintien des locations normalement tarifées.

**Limite réelle / NEXT :** 100 annotations indépendantes à effectuer sur les captures sources, avec preuves par champ et revue de l'activité des annonces. Les 100 templates privés sont prêts. Tant que cette validation n'existe pas, la montée à 1 000 pages réelles serait une hausse de volume, **pas un gain démontré de fiabilité**. Ne pas fusionner, importer en base produit ou déployer Vercel sur la base de ces seuls résultats.

## Q1F — Audit source-only 100 HTML et adjudication des surfaces (09/11/2026, sous-lot suivant)

**GOAL :** comparer V3 à une seconde lecture *isolée du code V2/V3*, sur les 100 HTML originaux et leurs empreintes, pour identifier les désaccords techniques vérifiables avant toute montée à 1 000.

**Méthode / limite :** script privé Windows `Q1F_TOOLS/source_claims_blind100_v2.py`, ne lisant aucun fichier extrait de V2/V3. Références émises d'après JSON-LD, OG, URL de détail et zone principale de la page, avec chemins de provenance et état `uncertain` lorsque la source ne soutient pas un champ. Ceci est **un contrôle source-only automatisé, non une annotation humaine et non une vérité indépendante de la réalité immobilière**. Les données brutes et annotations restent dans Q1F_PRIVATE_RESULTS hors Git et Notion. Une première version d'audit est conservée séparément ; les cas ambigus ont été réexaminés sur le HTML avant la seconde version.

**Écarts mis en évidence puis traités :**
- Mubawab : certaines surfaces mises en avant dans la fiche diffèrent du titre (p.ex. 500 contre 1500 m² ; 850 contre 1000 m² ; 67 contre 65 m² ; 100 contre 119 m² ; 400 m² affichés face à titre indiquant 300 m² + terrasse 100 m²). V3 reprend désormais la **surface primaire affichée** dans le détail, avec chemin d'évidence ; lorsque celle-ci diffère du titre, la fiche reçoit le motif `PRIMARY_AREA_DIFFERS_FROM_TITLE_AREA`. Une différence peut être due à la distinction habitable/terrain/terrasse : **ne pas interpréter comme fraude ni erreur certaine**, et ne pas fusionner arbitrairement les composantes.
- Mubawab : une annonce Studio 28 m² disposait de la mention explicite `à la vente` dans le texte de la fiche ; la transaction a été récupérée sans utiliser `offers.businessFunction=#Sell`, car ce dernier est contradictoire sur certaines locations.
- Mubawab : une annonce `Studio Neuf de 87 m²` avait été classée dans la catégorie générique `apartment` ; le sous-type **studio explicitement affirmé dans son propre titre** prévaut désormais sur le breadcrumb générique Appartements.
- Domio : une annonce affichait dans ses métadonnées un prix numérique de **0 MAD**. Le parseur le rejette correctement comme prix non valide ; le contrôleur indépendant a été corrigé pour ne pas appeler 0 MAD un prix présent. Cette absence reste en revue, sans inventer de prix.
- Agenz : les valeurs de surface sont parfois portées par `Apartment.floorSize` sous forme numérique simple ; la seconde lecture les couvre sans extrapolation.

**Preuve fin de lot sur les mêmes 100 captures SHA :**
- Dernier résultat local `Q1F_PRIVATE_RESULTS/Q1F_REAL_100_PARSED_20261109_v9_studio/aggregate_report.json` : **71 ready_internal, 4 requires_manual_review, 25 partial**. Présence de champs titre 100, ville 100, quartier 83, prix 98, superficie 99, type 100, transaction 92 ; pas de réécriture des 100 HTML.
- Benchmark source-only `Q1F_PRIVATE_RESULTS/Q1F_SOURCE_CLAIMS_BENCHMARK_20261109_v3_final.json` : **663/663 champs comparables concordants**, par champ : titre 100, ville 100, quartier 83, prix MAD 98, surface 97, type 100, transaction 85. **37 autres comparaisons indisponibles** avec cette méthode (17 quartiers, 2 prix, 3 surfaces, 15 transactions). Le benchmark conserve `certified_for_production=false` et `rights_independently_verified=false` ; ce résultat n'est PAS une précision indépendante certifiée, ni une validation de fraîcheur.
- File de revue priorisée `Q1F_PRIVATE_RESULTS/Q1F_100_HUMAN_REVIEW_PRIORITY_QUEUE_20261109.jsonl` : **35 pages**, dont **9 P0** (alertes/revue requise, y compris signaux dans certaines fiches encore partielles) et **26 P1** (au moins un champ incertain), avec URL, SHA et chemin du HTML privé. Les 100 fiches restent soumises à une validation humaine pour certifier la précision, **0 annotation humaine achevée**.
- Python **110/110 tests locaux PASS** (V2 69, V3 41), compilation Python et `git diff --check` validés, avant commit de ce sous-lot. Aucun champ n'a été « corrigé » sans preuve source.

**NEXT exact :** conserver cette nouvelle base technique, vérifier CI de la PR V3 une fois le commit poussé, puis faire une annotation humaine indépendante sur les 100 captures avec preuves par champ (priorité aux 35 fiches de la file), réexécuter le benchmark avec ces annotations humaines, corriger tout nouvel écart et ne lancer le canary 1 000 que sous un objectif technique clairement distinct. Aucune écriture Neon, aucun merge, aucun déploiement Vercel. DATA MASS certifié historique inchangé 9 990/200 000 (4,995 %).

## Q1F — Pré-canary 1 000 : collecte incrémentale et rejet des faux détails (09/11/2026)

**GOAL :** préparer un canary de **1 000 HTML de pages d’annonces distinctes**, sans confondre les fiches historiques déjà structurées avec des captures HTML et sans admission en produit. **Statut : objectif 1 000 NON atteint**.

**Exécution publique bornée :** nouveau collecteur `scripts/acquisition/akarparser_v3_public_capture.py`, tests `test_akarparser_v3_capture.py`. Candidats issus d’un lot local de 1 000 enregistrements structurés antérieurs ; **971 URL historiques éligibles avant ce lot après exclusion des URL déjà capturées et des chemins non-détail**. Robots.txt vérifié avant requête, HTTP GET sans compte ni proxy, délai minimum 3 secondes, maximum 3 Mo/HTML, dédoublonnage d’URL, arrêt du domaine sur 401/403/429, aucune requête d’admission DB. Un lot refuse de réécrire son dossier ; HTML et sidecars SHA-256 restent uniquement sur Windows.

**PROOF du batch01 :** 33 tentatives de détail en 194,28 s, **20 captures brutes HTTP 200** dans `Q1F_RAW_INBOX/real_1000_canary_batch01_20261109/pages`, chacune avec fichier HTML et métadonnées de capture ; répartition Barnes Marrakech 5, Domio 5, Marrakech Realty 4, Mouldar 5, Mubawab 1. Agenz exclu parce que robots.txt indisponible lors de cette exécution (pas de contournement). Avito : 5 redirections hors détail ; Sarouty : 4 HTTP 410 ; les URL refusées n’ont pas été conservées.

**Défaut critique détecté puis corrigé :** réponse HTTP 200 sur une **fausse page de détail**. Audit du batch01 : 2 Barnes montrent `Page introuvable - 404` avec HTTP 200 ; 5 Mouldar rendent seulement une coquille d’application générique. Nouvelle vérification `check_detail_markup` bloque explicitement `SOFT_404_HTML` et `GENERIC_APP_SHELL` avant sauvegarde dans les futurs batches. Rapport privé : `Q1F_PRIVATE_RESULTS/Q1F_REAL20_DETAIL_ACCEPTANCE_AUDIT_20261109.json`. Sur les **20 HTML bruts**, **13 seulement satisfont le contrôle de détail**, 7 restent privés pour diagnostic, non admissibles comme annonces. Les deux pages Barnes 404 sont des HTML identiques malgré deux URL distinctes. Le filtre est une preuve de marqueur de page, non une preuve de vérité immobilière.

**Extraction du batch01 :** V3 a traité localement les 20 HTML : **1 `ready_internal` et 19 `partial`** ; après exclusion du 404/SPA, les **13 pages acceptées** sont **1 techniquement complète et 12 partielles**. Les nouveaux portails nécessitent des adaptateurs spécifiques. Durée d’extraction mesurée sur ce lot : **145,63 s**, débit insuffisant pour revendiquer 1 000 pages sans optimisation. Profil d’une page HTML 347 Ko : environ 2,6 s, principalement `html.parser`. Aucun chiffre d’exactitude indépendante ni de disponibilité des annonces n’est revendiqué.

**Revue 35 prioritaire :** modèle privé à l’aveugle créé `Q1F_PRIVATE_RESULTS/Q1F_35_BLIND_HUMAN_REVIEW_TEMPLATE_20261109.jsonl`. **35/35 SHA originaux vérifiés**, **0 valeur du parseur préremplie**, 9 P0 et 26 P1. Un contrôle automatisé de neuf motifs P0 sur les HTML originaux retrouve directement les preuves pour **8/9** ; le neuvième reste **non confirmé par ce contrôle et nécessite revue**, sans transformer cela en précision réelle. **0 annotation humaine réalisée**. Aucune donnée brute transférée dans GitHub ou Notion.

**Sécurité :** 0 écriture Neon, 0 déploiement Vercel, 0 fusion. `ready_internal` indique uniquement une complétude technique de capture et ne prouve pas la fraîcheur de l’offre ; `fetched_at` est un horodatage de collecte, pas de publication.

**NEXT exact :** terminer la vérification de la CI de ce correctif, préserver les 7 échecs comme contre-exemples ; lancer un second lot **borné** avec le nouveau filtre, mesurer rendement/qualité et le temps par portail, puis optimiser les adaptateurs avant une augmentation vers 1 000 pages vraiment distinctes et exploitables. L’annotation humaine des 100 originales demeure nécessaire pour certifier précision/rappel, avec priorité aux 35 fiches identifiées. DATA MASS certifié historique inchangé : 9 990/200 000 = 4,995 %.

**Batch02 — vérification en collecte après correctif :** `Q1F_RAW_INBOX/real_1000_canary_batch02_20261109` : **8 HTML sauvegardés avec le nouveau filtre actif** sur 17 tentatives, avec `pages/` séparé du rapport pour éviter d’ingérer le manifeste comme une annonce. Répartition : Barnes 2, Domio 3, Marrakech Realty 2, Mouldar 1. Agenz robots.txt indisponible, aucune réinterrogation de contournement ; anciennes URL Avito et Mubawab redirigeant hors détail ignorées ; Sarouty HTTP 410 ignorés. Traitement V3 offline de ces 8 HTML : **1 `ready_internal`, 7 `partial`**, rapport privé `Q1F_REAL_8_BATCH02_PARSED_20261109/aggregate_report.json` ; 0 admission Neon. Le filtre réduit les faux détails, mais une page acceptée par la structure HTML n’est toujours **pas** certifiée comme annonce réelle ou disponible.

**Tests après ajout du filtre :** **119/119 PASS** en local (69 V2 et 50 V3) ; trois nouveaux tests de rejet `SOFT_404_HTML`, `GENERIC_APP_SHELL` et d’acceptation d’une annonce avec JSON-LD. Le workflow `AkarParser V3 Raw Bulk Regression` inclut maintenant explicitement le collecteur parmi ses fichiers surveillés et son contrôle de syntaxe. Le contrôle d’intégrité transversal des 100 originales + 20 du batch01 + 8 du batch02 doit encore donner son verdict avant toute affirmation d’un total de pages de détail valides.

## Q1F V3 — Checkpoint canary HTML 241/1000 et transaction fail-closed — 09/11/2026

**GOAL canary :** 1 000 HTML d'annonces réelles distinctes et exploitables, source-only, sans publication ni admission Neon. **Succès encore NON ATTEINT.** Le prochain seuil technique mesuré est **241/1000 = 24,1 %** de pages qui passent les contrôles de forme et de détail (ce n'est pas la validation de vérité terrain).

**Preuve d'intégrité privée, rapport** `Q1F_PRIVATE_RESULTS/Q1F_ALL_BATCH06_HTML_INTEGRITY_AUDIT_20261109.json` :
- 248 captures HTML avec SHA-256 confirmé et 248 empreintes URL uniques, dont 100 originales, 20 batch01, 8 batch02, 30 dans chacun des lots 03/04/05/06.
- 241/248 passent le filtre de pages de détail, 7 refusées comme `SOFT_404_HTML` (2 Barnes avec HTTP 200) ou `GENERIC_APP_SHELL` (5 Mouldar) ; un doublon SHA apparaît parmi les deux soft 404, pas dans les pages acceptées.
- Les quatre lots Domio 03–06 ont capturé chacun **30/30 pages** à raison de **1 requête/3 s minimum**, sans erreur ni blocage constaté. Les 4 dossiers `Q1F_RAW_INBOX/real_1000_canary_batch0[3-6]_domio_20261109` sont privés et non réécrits ; le collecteur arrête un domaine sur HTTP 401/403/429 et ne contourne jamais robots.txt.
- Un nouveau paramètre CLI `--domains` contraint les hôtes aux domaines reconnus et évite l'exploration répétée de sites historiquement non exploitables. Tests démontrent qu'aucun robots.txt d'autre domaine n'est demandé si filtré. La CI a été nettoyée d'une entrée de chemin Python dupliquée introduite par un commit concurrent, sans réécrire l'historique.

**Preuve extraction de ces 241 pages acceptées, rapport** `Q1F_PRIVATE_RESULTS/Q1F_ALL_BATCH06_QUALITY_BRIEF_20261109.json` :
- 85 `ready_internal`, **3** `requires_manual_review`, **153** `partial`. Score technique uniquement, 0 annonce certifiée pour le produit.
- Champs présents, **pas nécessairement exacts** : titre 241, type 241, ville 236, transaction 230, surface 221, prix MAD 208, **quartier 100/241 (41,5 %)**.
- Rendement des quatre lots Domio 03–06 : 5, 6, 3, **0** fiches `ready_internal` sur 30 respectivement ; déficit majeur de quartiers, parfois prix/surface. Sur 7 fichiers Domio du dernier lot inspectés, le JSON-LD PostalAddress confirme uniquement `addressLocality=Agadir` et pas `addressNeighborhood` : le quartier n'est donc **pas reconstitué à partir du titre sans preuve**.
- Provenance `fetched_at` = date de **capture**, jamais garantie de fraîcheur/disponibilité de l'offre.

**Défaut critique corrigé indépendamment :** sur le corpus original 100, une annonce de programme neuf Mubawab avait été classée `rent` par inférence V2 basée sur un texte commercial, sans mention principale explicite de location. Pour tout HTML de détail Mubawab, la transaction issue du fallback V2 est dorénavant annulée si la couche V3 n'a pas de **preuve explicite portail** ; les variantes `a louer` sans accent sont prises en charge lorsqu'elles sont dans le titre/description primaire. Le balisage `businessFunction=#Sell` reste insuffisant à lui seul pour vendre (car parfois présent sur des locations). **Corpus original 100 réévalué** : 69 `ready_internal`, 3 en revue, 28 `partial` ; transaction connue 89/100 contre 92/100 antérieurement. La seconde lecture automatisée du HTML retrouve encore **663/663 champs comparables**, 37 incertains ; ce n'est **pas** une annotation humaine ni une certification d'exactitude réelle. File de revue privée mise à jour `Q1F_100_HUMAN_REVIEW_PRIORITY_QUEUE_v10_20261109.jsonl` : **35 fiches**, 8 P0 + 27 P1 ; 0 revue humaine accomplie.

**TESTS** : V2 69/69 PASS, V3 54/54 PASS = **123/123** local ; compilation Python, `git diff --check` PASS. La CI finale dépend du commit ci-dessous ; ne pas déclarer CI verte sans preuve du HEAD final.

**Risque/choix technique :** continuer à aspirer Domio en masse ajoute surtout des fiches partielles (dernier lot 0/30 complètes) ; la voie la plus efficace est **nouveau portail avec quartier explicitement disponible, amélioration des adaptateurs ou enrichissement fondé sur des preuves**, puis reprise des lots bornés et retests. Un objectif de volume ne se substitue pas à un objectif de précision. **0 écriture Neon, 0 merge, 0 déploiement Vercel.** DATA MASS historique reste 9 990/200 000 = 4,995 %.

**NEXT exact :** après vérification finale du HEAD/CI et Notion, sélectionner des sources de détail exposant quartier/ville/surface/prix avec preuves explicites ; échantillonner ces pages, corriger V3 avec tests, reprendre les lots progressifs vers 1000, puis contrôle de vérité terrain indépendante 100 fiches avant admission produit.

## Q1F V3 — Diversification Mubawab Marrakech : 264/1000 pages acceptées (09/11/2026)

**GOAL :** remplacer une partie des captures Domio pauvres en quartiers par des pages de détail qui publient explicitement le quartier. Critère observable : couverture quartier, URL unique, SHA, absence d'erreur HTTP, parsing technique, aucune admission produit.

**Découverte :** une requête de catégorie publique `https://www.mubawab.ma/fr/ct/marrakech/immobilier-a-vendre` après contrôle `robots.txt` a produit **98 ancres** dont **23 nouvelles URL directes de détail** admissibles et non déjà capturées. Script privé `Q1F_TOOLS/discover_mubawab_marrakech_20261109.py`, manifeste `Q1F_PRIVATE_RESULTS/Q1F_MUBAWAB_MARRAKECH_DISCOVERY_20261109.json`. Collecte par le nouveau CLI standard avec allowlist `mubawab.ma`, délai minimum 3 secondes, deux lots : **12/12 batch07 et 11/11 batch08**, aucune erreur HTTP, aucun blocage, 0 écriture Neon ; HTML originaux et sidecars SHA exclusivement privés.

**PROOF final SHA/URL/détail**, `Q1F_PRIVATE_RESULTS/Q1F_ALL_BATCH08_HTML_INTEGRITY_AUDIT_20261109.json` : **271 captures HTML, 271 URL distinctes**, **264 pages de détail acceptées**, 7 rejets initiaux `SOFT_404_HTML` (2) ou `GENERIC_APP_SHELL` (5). Un doublon de SHA uniquement parmi deux soft-404 rejetées. Ratio canary de détail **264/1000 = 26,4 %**, non équivalent à précision certifiée ni disponibilité actuelle.

**PROOF qualité par page acceptée**, `Q1F_PRIVATE_RESULTS/Q1F_ALL_BATCH08_QUALITY_BRIEF_20261109.json` : **93 `ready_internal`, 4 `requires_manual_review`, 167 `partial`** ; présence champs titre 264, type 264, ville 259, quartier **123/264 = 46,6 %**, prix MAD 227, surface 244, transaction 240. Champs présents ≠ exactitude réelle. **Lots Mubawab Marrakech 23 détails : 23/23 ville, 23/23 quartier, 23/23 surface, 19/23 prix, 10/23 transactions** explicitement appuyées ; statuts 8 prêtes techniquement, 1 revue, 14 partielles. La prudence sur la transaction est volontaire : ne pas assimiler une page issue de rubrique vente, ni `businessFunction=#Sell`, à une preuve suffisante de transaction lorsque le texte de l'annonce ne confirme pas.

**Choix technique vérifié :** nouveau flux Marrakech utile pour quartier, mais il ne suffit pas à certifier la transaction. Domio continue d'apporter beaucoup de volume avec faible couverture quartier, et le dernier lot en était à 0/30 fiches complètes. Le prochain lot devrait tester **d'autres zones de Mubawab (Rabat, Tanger, etc.) avec catégories publiques autorisées**, et renforcer extraction transaction seulement sur preuves primaires, sans affecter les données produit.

**GitHub :** code V3 capture/allowlist et suppression inférences transactionnelles V2 déjà commité et poussé `4a0264f7504093f54481da654a626230f8050836`. **123/123 tests locaux PASS**, 3/3 workflows SUCCESS sur ce HEAD ; le sous-job CI batch privé est `SKIPPED` mais les pages réelles sont traitées localement sur Windows. Cette section documente une nouvelle collecte **sans changement de code**. PR #1198 Draft/non fusionnée. Aucun déploiement Vercel, aucune écriture Neon, aucune admission certifiée.

**GATE :** 0 annotation humaine indépendante des 100 fiches d'origine ; la file privée comprend 35 dossiers prioritaires (8 P0, 27 P1). Contrôle source-only automatisé 663/663 concordances comparables : ne pas présenter comme exactitude 100 %. Le DATA MASS certifié historique reste 9 990/200 000 = 4,995 %.

**NEXT exact :** poursuivre échantillonnage de quartiers explicites par portail et par ville avec les limites robots/débit ; évaluer couverture transaction et surface ; mettre à jour le parseur avec tests seulement sur preuves ; poursuivre canary HTML vers 1000 ; annotation indépendante des 100 originaux avant tout produit/Neon.

## Q1F — Lot multivilles Rabat / Tanger / Casablanca / Agadir (09/11/2026)

**GOAL :** augmenter le canary vers 1 000 vrais HTML de détail avec quartiers explicitement publiés, sans abaisser la barre de qualité ni importer vers Neon.

**SUCCESS/PREUVE de collecte :** 3 demandes de découverte sur des catégories Mubawab publiques et autorisées robots.txt (Rabat/Tanger, Casablanca/Fès/Agadir). `Q1F_PRIVATE_RESULTS/Q1F_MUBAWAB_RABAT_TANGER_DISCOVERY_20261109.json` : Rabat 25 URL nouvelles ; Tanger 19. `Q1F_MUBAWAB_CASABLANCA_FES_AGADIR_DISCOVERY_20261109.json` : Casablanca 13 URL, Agadir 22 ; la catégorie Fès testée retourne HTTP 404, sans contournement. Quatre villes capturées en six batches 09–14, 25+19+13+22 = **79/79 HTML** collectés sans erreur ni blocage HTTP, délai min. 3 secondes, hash SHA et URL source archivés en privé, zéro écriture produit.

**PREUVE d'intégrité agrégée** `Q1F_PRIVATE_RESULTS/Q1F_ALL_BATCH14_HTML_INTEGRITY_AUDIT_20261109.json` : **350 fichiers HTML, 350 URL distinctes, SHA256 d'origine tous conformes**, **343 pages de détail acceptées**, 7 fausses pages écartées (2 soft 404 Barnes, 5 coquilles Mouldar). Un hash dupliqué uniquement entre deux soft-404 rejetées. Canaries anciens 01–08 et nouveaux 09–14 restent dans `Q1F_RAW_INBOX` Windows, sans données privées GitHub/Notion.

**PREUVE parsing total** `Q1F_PRIVATE_RESULTS/Q1F_ALL_BATCH14_QUALITY_BRIEF_20261109.json` : sur **343 pages acceptées** : **138 ready_internal**, **9 requires_manual_review**, **196 partial**, 0 autorisée Neon. Présence de champs seulement, pas exactitude : titre 343, ville 338, quartier **202/343 = 58,9 %** (avant 123/264 = 46,6 %), prix MAD 298, surface 323, type 339, transaction 296.

**Comparaison nouvelles 79 pages :** Rabat 25/25 quartier et surface, 20/25 prix, 19/25 transaction ; Tanger 19/19 quartier et surface, 19/19 prix, 13/19 transaction ; Casablanca 13/13 quartier et surface, 12/13 prix, 10/13 transaction ; Agadir 22/22 quartier et surface, 20/22 prix, 14/22 transaction. Total : **79/79 quartiers/surfaces, 71/79 prix, 56/79 transactions**, **45 ready_internal, 5 en revue, 29 partielles**. Les transactions ambiguës restent non renseignées, car une catégorie `immobilier-a-vendre` et le `businessFunction=#Sell` ne constituent pas à eux seuls une preuve primaire fiable pour chaque annonce.

**État Git / confidentialité :** Le code du collecteur, ses garde-fous et les tests sont inchangés depuis le dernier HEAD validé `b598ffbe507536542badfc773d8b6c4eb324f70e` (PR #1198 Draft, non fusionnée ; **123/123 tests locaux**, 3/3 CI GitHub SUCCESS sur le HEAD antérieur). Ce nouveau lot ne modifie que la documentation canonique. 0 merge, 0 Vercel, 0 écritures Neon ; 0 annotation humaine, 0 précision réelle certifiée. DATA MASS historique certifié inchangé 9 990/200 000 = 4,995 %.

**NEXT exact :** vérifier si une catégorie de location publique autorisée produit des intitulés plus explicites de transaction, échantillonner strictement et comparer ; sinon privilégier la diversification des sources avec quartiers attestés et enrichissement fondé sur la page. Continuer par canaries bornés vers 1 000 HTML acceptés, puis certification indépendante des 100 originaux et revue des anomalies avant toute admission produit.

## <date 2026-11-10> — Q1F rental canary + transaction evidence (batch15–23)

**GOAL :** canary d'HTML de détail réels vers 1 000, en renforçant les preuves de type de transaction, sans imposer "rent" simplement car la page vient d'une rubrique de location.

**TEST DE SOURCE :** 3 catégories publiques Mubawab ("immobilier-a-louer", Casablanca, Rabat, Tanger), robots.txt respecté. 32 URL de détail candidates par ville, dont batch15–17 (12 par ville), puis batch18–20 (20 par ville) : **96 captures**. Parmi les 12 premières Casablanca, une annonce provenait d'une rubrique location tout en décrivant explicitement une **vente**, avec prix inhabituellement faible : la transaction "sale" n'a pas été silencieusement reclassée en "rent" et la fiche a été signalée pour revue. Les titres directs `Location villa ...`, `Studio location longue duree ...`, `Villa ... location ...` sont maintenant extraits comme **location déclarée**, mais jamais un discours de simple investissement locatif. Une annonce mentionnant simultanément vente et location dans son titre est marquée `TITLE_CONTAINS_SALE_AND_RENT`, transaction non déterminée, revue obligatoire. Pour le lot initial original 100 reprocessé `Q1F_REAL_100_PARSED_20261109_v11_explicit_rent_titles` : **69 ready_internal, 3 review, 28 partial**, transactions connues 89/100 (pas d'inflation).

**NOUVELLE DÉCOUVERTE :** `Q1F_MUBAWAB_RENT_MARRAKECH_AGADIR_TEMARA_DISCOVERY_20261109.json` : 32 URL candidates Marrakech, 33 Agadir, 32 Témara. Trois batches **21–23** capturés en privé avec garde-fous robots/HTTP/3 s : **30/30 HTML** par ville, aucune écriture Neon ni bypass. Extractions : Marrakech **20 ready/10 partial**, quartier 28/30 et transaction 21/30 ; Agadir **22 ready/8 partial**, quartier 30/30 et transaction 22/30 ; Témara **24 ready/6 partial**, quartier 30/30 et transaction 26/30. 90 HTML de détail ne sont pas 90 annonces certifiées.

**PROOF INTÉGRITÉ** `Q1F_PRIVATE_RESULTS/Q1F_ALL_BATCH23_HTML_INTEGRITY_AUDIT_20261110.json` : 536 fichiers HTML, **536 empreintes URL distinctes, SHA-256 vérifiés**, 529 pages de détail acceptées, 7 fausses pages rejetées (2 soft-404 Barnes et 5 coquilles Mouldar). Source brute, annotations et rapports conservés uniquement sous Windows dans les dossiers Q1F privés.

**PROOF QUALITÉ** `Q1F_PRIVATE_RESULTS/Q1F_ALL_BATCH23_QUALITY_BRIEF_20261110.json` : sur **529 pages acceptées (52,9 % de l'objectif 1000)**, **275 ready_internal**, **10 requires_manual_review**, **244 partial**. Champs renseignés, **PAS précision réelle** : titre 529, ville 524, quartier **384/529 = 72,6 %**, prix MAD 481, surface 509, type 523, transaction 440. Respect des statuts, aucune admission produit et aucun droit/fraîcheur certifié.

**TESTS** : **126/126 tests locaux PASS** (V3 57, V2 69) ; compilation et diff check pass. Branche `feat/akarparser-v3-raw-bulk-20261109` et PR #1198 restent Draft, non fusionnées. **0 annotation indépendante des 100 originaux** : la présence ou cohérence avec les HTML ne certifie ni l'exactitude des annonces ni leur disponibilité.

**NEXT :** poursuivre par lots bornés avec nouvelles villes et hôtes exposant quartier et transaction explicites ; comparer par ville, SHA et détails ; benchmark humain des 100 origines avant tout Neon/product. Pas de merge/Vercel sans gate.

## Q1F V3 — Dédoublonnage inter-lots et contrôle extrêmes, 10/11/2026

**Goal :** 1 000 véritables pages HTML de détail distinctes capturées en privé, sans admission produit ni estimation d'exactitude non prouvée.

**PROOF checkpoint URL/SHA dédoublonné :** `Q1F_PRIVATE_RESULTS/Q1F_ALL_expansion04_DEDUP_HTML_AUDIT_20261110.json` : **694 captures brutes, SHA-256 vérifiés**, **692 URL normalisées distinctes**, **7 détails faux (soft-404/coquilles)** et **2 URL capturées en doublon inter-lots** (Mohammedia #27 vs expansion01). La sélection canonique donne **685 pages HTML de détail uniques acceptées (68,5 % du canary)**. Les doublons sont journalisés dans l'audit privé, aucun fichier brut supprimé, aucun URL compté deux fois.

**PROOF qualité de ces 685 pages :** `Q1F_PRIVATE_RESULTS/Q1F_ALL_expansion04_DEDUP_QUALITY_BRIEF_20261110.json` : **372 `ready_internal`**, **14 `requires_manual_review`**, **299 `partial`** ; présence de champs (pas de vérité terrain) : titre 685, ville 680, quartier **540/685 = 78,8 %**, prix MAD 623, surface 665, type 672, transaction 552. Les lots 24–26 contiennent 7 captures, les lots 27–28 31 captures, et expansion01–04 120 captures. Deux URL de l'expansion01 ont été dédupliquées par choix de leur première version capturée dans Mohammedia #27. Les 4 lots expansion ont respectivement **30 captures**, sans HTTP 401/403/429, et ont rejeté les redirections hors détail. Données privées sur Windows exclusivement.

**Défaut qualité réel identifié :** une annonce Mubawab présente dans sa page HTML `123 457 000 MAD` pour **120 m²**, valeur transmise aussi par le JSON-LD. Nous ne savons pas si le prix est vrai, une erreur de saisie ou un placeholder. **Aucune correction automatique** : le garde-fou `EXTREME_REPORTED_PRICE_PER_M2_REQUIRES_REVIEW` (prix >50 M MAD ET prix/m² >250 000) impose la revue humaine tout en conservant exactement la valeur source. Le titre `à l'achat` (y compris apostrophe typographique) est maintenant reconnu comme mention directe de vente, et un prix normal au m² n'active pas ce motif. Le benchmark humain demeure à **0 annotation indépendante**.

**PROOF tests :** **128/128 tests locaux PASS** (59 V3 + 69 V2) ; compilation Python et diff-check passent. Corpus original 100 retraité en `Q1F_REAL_100_PARSED_v12_EXTREME_REVIEW_20261110` : 69 techniquement prêtes, 3 en revue, 28 partielles, transaction renseignée 89/100, pas d'écriture Neon. Benchmark source-only exécuté mais **non certifiant** en `Q1F_SOURCE_CLAIMS_BENCHMARK_v12_20261110.json`, le même portail constituant la source pour les deux lecteurs.

**Git/CI :** PR #1198 Draft sur `feat/akarparser-v3-raw-bulk-20261109` non fusionnée. Dernier HEAD poussé avant ces deux nouvelles corrections : `2970d36c0cc0e4c5eb9e32cd720cb4f1c59cc9a5`, et ses trois CI `SUCCESS` (Private Raw Bulk #42727316699, Raw Regression #42727316579, Efficiency #42727316512). Les corrections extrême/prix et achat doivent encore être poussées et validées en CI. 0 Neon, 0 Vercel, 0 merge.

**NEXT exact :** poursuivre captures bornées expansion05–08, reparser sans écraser, auditer l'unicité des URL, puis commit/CI et revue de vérité terrain avant admission. DATA MASS historiquement certifié inchangé 9 990/200 000 = 4,995 %.

## Q1F V3 — Preuve canary 805/1000, 10/11/2026

**GOAL :** 1000 HTML de véritables pages de détail, URL normalisées uniques, sans confusion avec les fiches structurées historiques ni insertion produit.

**PROOF AUDIT DÉDOUBLONNÉ :** fichiers privés `Q1F_PRIVATE_RESULTS/Q1F_ALL_expansion08_DEDUP_HTML_AUDIT_20261110.json` et `Q1F_ALL_expansion08_DEDUP_QUALITY_BRIEF_20261110.json`. **814 captures brutes** contrôlées SHA256, **812 URL normalisées uniques**, 7 fausses pages (soft-404 ou application générique), **2 captures supplémentaires d'URL déjà présentes exclues**, résultat **805 pages de détail uniques acceptées (80,5 %)**. Le dédoublonnage est déterministe : première version valide selon `fetched_at` ; chacune des collisions est tracée, aucune capture privée supprimée.

**PROOF extraction sur les 805 pages uniques :** **443 `ready_internal`, 16 `requires_manual_review`, 346 `partial`**. Champs présents uniquement, **NON exactitude** : titre 805, ville 800, quartier **660/805 = 82,0 %**, prix MAD 730, surface 784, type 788, transaction 636. Aucun produit Neon admis, aucun horodatage de publication réellement validé ; aucune annotation humaine indépendante des 100 pages initiales.

**COLLECTE :** découverte publique autorisée Mubawab sur 20 catégories de 10 villes : **425 nouvelles URL candidates** uniques au moment de la découverte, 14 catégories accessibles, 6 HTTP 404 rejetées, aucun contournement. Huit lots `real_1000_canary_expansion_01..08_20261110`, **30 pages HTML chacun**, redirections hors détail non sauvegardées, contrôle robots.txt, 3 secondes minimum entre requêtes, arrêt HTTP 401/403/429, aucun accès compte/proxy. Deux URL collectées aussi en parallèle dans batch27 Mohammedia ont été exclues comme doublons du canary. Les dossiers HTML et le journal restent privés sur Windows, jamais transférés vers GitHub ou Notion.

**GUARD RÉEL :** une annonce HTML et son JSON-LD donnent **123 457 000 MAD / 120 m²** et mentionnent `à l'achat`. La transaction est reconnue comme vente déclarée ; prix extrême **conservé exactement**, ajouté au motif `EXTREME_REPORTED_PRICE_PER_M2_REQUIRES_REVIEW` (prix >50 M MAD ET >250 k MAD/m²). Ce motif indique une nécessité de revue, **pas** une correction ni la preuve d'un prix erroné. Deux tests synthétiques ajoutés, ancienne classe de compatibilité préservée. **128/128 tests locaux PASS** (59 V3 +69 V2), compilation et diff-check pass ; historique 100 HTML reprocessé : 69 ready, 3 review, 28 partial, 89 transactions connues ; benchmark source-only `Q1F_SOURCE_CLAIMS_BENCHMARK_v12_20261110.json` exécuté mais **pas certifiant**.

**POINT DE CONTINUITÉ :** **195 autres HTML uniques acceptés** nécessaires pour le canary 1000. Puis revue indépendante sur échantillon d'origine 100 (dont 35 prioritaires), calculs indépendants par champ/portail et décisions de qualité avant toute importation produit. Aucune preuve de précision réelle ou de disponibilité des offres à ce stade.

**REPO :** PR Draft #1198 `feat/akarparser-v3-raw-bulk-20261109`, pas de merge, pas de Vercel, zéro écriture Neon. DATA MASS produit historique 9990/200000 (4,995 %) **inchangé**. L'état final Git/CI figure au checkpoint Notion de clôture.
