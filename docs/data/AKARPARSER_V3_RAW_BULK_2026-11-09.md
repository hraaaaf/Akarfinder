# AkarFinder — Q1F / AkarParser V3 : annonces brutes en lots

## GOAL / SUCCESS / PROOF

GOAL : recevoir 10, 100, 1 000 ou davantage d'annonces en fichiers bruts (HTML, JSON, JSONL ou CSV), extraire les données utiles, mesurer leur qualité, et émettre des fiches internes notées de 0 à 100, sans publication automatique.

SUCCESS TECHNIQUE : pipeline hors ligne, données sources inchangées, calcul déterministe à date fixée, tri des fiches prêtes en interne / incomplètes / quarantaine, manifeste par hash, aucun import Neon.

PROOF AU 09/11/2026 : 19/19 tests de V3 réussis sur Windows, comprenant lots synthétiques de 10, 100 et 1 000 et réplication déterministe. Un pilote de compatibilité a traité 1 000 lignes historiques réellement enregistrées (Neon Recovery préstructuré, PAS des pages HTML brutes indépendantes). Résultat de ce pilote : 106 complete_requires_freshness, 894 partial, 0 ready_internal, 0 erreur, 0 publication. Couverture : titre 1 000, ville 1 000, quartier 570, prix MAD 834, surface m² 228, type 1 000, transaction 1 000. Les champs présents ne sont pas des champs indépendamment validés.

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
