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
