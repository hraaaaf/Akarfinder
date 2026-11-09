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
