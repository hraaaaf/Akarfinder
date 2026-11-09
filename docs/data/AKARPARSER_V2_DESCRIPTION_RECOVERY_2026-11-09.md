# Q1E — récupération des descriptions Neon Recovery (09/11/2026)

## GOAL / SUCCESS / PROOF

**GOAL technique atteint :** compléter l'export historique privé sans modifier la source, puis exécuter le canary réel sur 1 000 fiches et comparer avec le même échantillon de référence. **GOAL qualité indépendant NON atteint :** 0/100 vérifications humaines, droits et fraîcheur non démontrés ; aucune annonce admise dans Neon produit.

**Source privée initiale :** 151 900 objets JSONL, 19 champs, SHA-256 `c3d8a8c9476602baa7663d1e9903e6015cb7300d6e7539183bf48b735cb76b08` inchangé.

**Source Neon Recovery :** `public.property_listings.description_snippet` non vide sur **14 950 / 151 900** lignes, vérifié par SQL SELECT, branche `recovery-schema-cert-20260924` du projet `ancient-violet-43534870`.

**Export enrichi privé :** 151 900 lignes, 20 champs, 14 950 descriptions jointes par `property_listing_id = property_listings.id`; 136 950 descriptions nulles. SHA-256 `487e2ca47c8abb7ee7f18d17e753ba1c9d466704ac13bc2b78eac4dffbf85c0e`. Exécution répétée du nouveau script générique reproduit **exactement le même SHA-256** ; l'original reste inchangé.

## Extraction et prévention du chevauchement

- 15 pages privées de descriptions, respectivement 14 × 1 000 + 950, transférées directement Neon → poste Windows autorisé. Aucun fichier d'annonce n'a été committé, publié dans une CI, placé en artefact GitHub ou Notion.
- **Erreur de première tentative identifiée et mise en quarantaine :** `SELECT id::text AS id ... ORDER BY id` triait sur l'alias texte, générant des chevauchements. Ce dossier incomplet a été renommé `Q1E_DESCRIPTION_PATCH_INVALID_SUPERSEDED_20261109` et n'a pas été utilisé pour la reconstruction.
- **Requête correcte :** `SELECT p.id AS property_listing_id, p.description_snippet FROM public.property_listings p WHERE p.id > :last_numeric_id AND NULLIF(BTRIM(p.description_snippet),'') IS NOT NULL ORDER BY p.id LIMIT 1000`. L'ordre numérique croissant a été vérifié à l'intérieur et entre les 15 lots ; 14 950 identifiants distincts et 14 950 correspondances exactes à l'archive.
- Le module `scripts/acquisition/akarparser_v2_description_merge.py` est offline et refuse mismatch du SHA source, ID de patch non croissant ou dupliqué, patch sans correspondance, changement de schéma, cardinalité incorrecte, écrasement d'un output existant et source modifiée ; sortie gzip immuable et publication toujours interdite.

## Résultats réels du parseur V2

Premier nouveau canary : 1 000 fiches réelles (200 par source) ; **252 descriptions présentes**. Statuts : 130 `ready_internal`, 350 `complete_candidate`, 484 `partial`, 36 `quarantine`. Ces nombres ne sont pas directement comparables aux statuts du premier canary, car le hash de sélection inclut les descriptions et **change l'échantillon**.

Pour la comparaison fiable, la sélection originale de **1 000 mêmes `property_listing_id`** a été conservée et seule la nouvelle colonne `description_snippet` a été ajoutée aux lignes. Vérification `other_fields_changed = 0`, hashes des anciennes et nouvelles sources inchangés.

| Mesure | Avant | Après, mêmes 1 000 |
|---|---:|---:|
| descriptions | 0 | **240** |
| prix MAD | 547 | 548 |
| chambres | 65 | 74 |
| surface m² | 574 | 574 |
| quartier | 600 | 600 |
| ready_internal | 133 | 133 |
| complete_candidate | 349 | 350 |
| partial | 485 | 484 |
| quarantine | 33 | 33 |
| erreurs de parsing | 0 | 0 |
| dossiers de revue préparés | 100 | 100 |
| dossiers indépendamment vérifiés | 0 | 0 |

Les valeurs supplémentaires extraites de texte sont des **candidats**, pas des vérités terrain. Aucun taux de précision indépendante n'est calculé.

## Tests et sécurité

- Régression Python locale après ajout du module générique et de ses 7 tests : **69/69 PASS** sur le worktree Q1E isolé.
- Exécution réelle du module sur les 151 900 fiches : `rows=151900`, `descriptions_joined=14950`, sortie reproductible au SHA annoncé.
- Données brutes, 15 pages de suppléments, nouvelle archive, échantillons et 100 dossiers restent uniquement dans le stockage privé du poste Windows.
- **0 écriture Neon/Supabase, 0 publication, 0 déploiement Vercel, 0 merge.** L'archivage secondaire sur volume indépendant reste à faire.

## Q1E — 09/11/2026 — inventaire croisé privé des 100 dossiers (sans revendication de précision)

**Données analysées directement sur le Windows connecté, en lecture seule.** File privée du *même échantillon* `Q1E_CANARY_20261109_EXACT_SAME_1000/private_review_queue_100.jsonl.gz` : 100 lignes, 100 identifiants distincts et 100 URL exactes distinctes, SHA-256 de la file `b6f7a62c1db3a4702ae78dbba74bd2934541ba18f9595683df0959c511cc6c97`.

Archives historiques privées du backup Supabase examinées sans exporter d'annonce individuelle :
- `listing_representations.copy.sql.gz` : **143 121** lignes examinées ; **57/100** URL exactes communes ;
- `source_offer_seeds.copy.sql.gz` : **78 110** lignes examinées ; les **mêmes 57/100** URL communes ;
- `mubawab_listing_corpus_v1.copy.sql.gz` : **37 420** lignes examinées ; **0/100** URL exactes communes ;
- **43/100** dossiers n'ont pas de correspondance URL exacte dans ces trois fichiers, ce qui ne prouve pas qu'aucune source indépendante n'existe.

Comparaison prudente sur les 57 représentations historiques correspondant exactement par URL :

| Champ | Identiques lorsqu'ils sont disponibles des deux côtés | Un côté absent | Différents |
|---|---:|---:|---:|
| Prix MAD | 40 | 17 | 0 |
| Surface m² | 42 | 15 | 0 |
| Type de bien, étiquette strictement identique | 51 | 5 | **1** |

**Important :** il s'agit de concordance de valeurs **entre deux enregistrements historiques** ; aucune page originale ni capture datée et indépendante n'a été authentifiée. Les archives peuvent être périmées, provenir de traitements apparentés ou présenter une variation de classification. **La divergence de type n'est pas, à elle seule, une erreur prouvée du parseur.** Les concordances ne prouvent ni précision à 98 %, ni disponibilité actuelle, ni droit de republication. **Revue humaine indépendante = 0/100 ; nouvelle observation certifiée = 0 ; Neon produit = interdit.**

Preuves locales agrégées, jamais committées : `Q1E_CANARY_20261109_EXACT_SAME_1000/q1e_review_archive_overlap_aggregate_20261109_v2.json` SHA-256 `ce5a2a17d57d516132cb5b6c55270ff99eef9bce9d24ecad8736a7744555c914`, et `q1e_historical_corroboration_aggregate_20261109.json` SHA-256 `4a51d6cf7af19c5f006c19371e890d2544cc195f84f5b268f0ce9d82a5621547`. Une première tentative d'inventaire local avait un séparateur PostgreSQL COPY mal analysé ; **ne pas réutiliser** le fichier d'agrégats sans suffixe `_v2`.

**Suite :** faire examiner en priorité la **divergence de type** par preuve source originale ; obtenir ou constater l'absence de captures pour les 100 dossiers, en particulier les 43 sans corroboration secondaire ; scorecard seulement après revue effective. Aucun nouveau crawl de sites tiers n'a été lancé.

## NEXT EXACT

1. Obtenir des captures source originales indépendantes pour les 100 dossiers ; documenter individuellement preuve et horodatage ou `UNVERIFIABLE`.
2. Utiliser la scorecard pour mesurer prix/surface/type, en maintenant les non vérifiables dans les dénominateurs. Ne pas proclamer le seuil de 98 % sans vrais contrôles.
3. Corriger uniquement des erreurs prouvées ; tests et canary sur échantillon figé avant élargissement.
4. Maintenir Neon produit en lecture/insertion fermée jusqu'aux preuves de droits, fraîcheur et unicité. Objectif DATA MASS historique toujours **9 990 / 200 000** (4,995 %) ; zéro nouvelle observation certifiée.