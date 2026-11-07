# AkarFinder — M250K Recovery → source observations → 200K usable (07/11/2026)

## GOAL

Préserver puis reconstruire le lac de candidats immobilier marocain **avant** de chercher à obtenir 200 000 enregistrements détaillés réexploitable techniquement. La publication et le moteur public sont **hors du périmètre du lot**. Aucune mutation Supabase, aucun déploiement Vercel, aucun merge ni navigation de site source dans ce lot.

La roadmap canonique `docs/ROADMAP.md` fige **253 372 représentations candidates L0/L1 au 06/09/2026**, M200K/M250K atteints **en candidats**, non en biens physiques, annonces actives ou pages détaillées encore récupérables.

## Dernière preuve observée

1. Les deux projets Supabase connectés ne permettent pas de retrouver le stock historique lors du contrôle du 07/11 : ancien projet **INACTIVE / inaccessible**, second **ACTIVE_HEALTHY mais sans table publique**. Cette observation **n'autorise pas** à conclure que des sauvegardes ou d'autres bases n'existent pas.
2. Sur **16 anciens runs Actions identifiés et consultés**, **deux** ont renvoyé un artefact : Akaar `9974670013` et Domio `9974714576`. Les autres runs interrogés n'ont renvoyé **aucune entrée artefact**, sans preuve individuelle de leur cause d'indisponibilité.
3. Les deux ZIP source ont été **téléchargés, vérifiés par CRC, puis inspectés** :
   - Akaar `9974670013` — SHA256 `286130c0acf8a338c5dd26167282bd6590e7203b3c3316ed23b1dc9da7122300` ; **78 202 URL candidates**, dont **76 843 listing hints** ;
   - Domio `9974714576` — SHA256 `95f81667afd69c4d86e1a5130d4bcbf8daddff50e4acc18995ae2c044a404d1d` ; **17 623 URL candidates**, dont **2 020 listing hints**.
   - Union sur domaines distincts : **95 825 URL source distinctes**, **78 863 listing hints**. Ces deux preuves sont des captures historiques du **05/09/2026**, pas de l'activité courante ; le mot `listing_hint` n'implique ni fiche d'annonce, ni unicité de bien, ni disponibilité.
4. Un **sous-ensemble L0 indépendant des sites** a été matérialisé dans la conversation : `AkarFinder_L0_RECOVERED_EVIDENCE_20261107.zip`, SHA-256 `63367440f5287687e0aa91a476fa5d44e68c2e2857ab03194a489b2b257509f1`, **942 783 octets**, avec les deux ZIP originaux, manifest JSONL compressé et bilan détaillé. **Zéro source-site fetch, zéro DB write.** Ce fichier ne prétend pas constituer les 253 372 lignes complètes.

## Lot implémenté — inventaire de récupération des artefacts Q1A

Branche **`data/m250k-proof-recovery-inventory-20261107`**, séparée de la PR #1172 Mubawab.

- `scripts/audits/candidate-lake-q1-artifact-catalog.json` : **17 IDs historiques** du workflow Q1A, sans inventer les fichiers manquants.
- `scripts/audits/candidate-lake-q1-artifact-inventory.py` : inventaire de chaque ZIP effectivement récupéré (SHA-256, nombre de lignes, exemples), états explicites `OK / HTTP_xxx / NOT_CHECKED`, preuves manquantes. Les champs `completeProofCoverage` et `candidateUnionCertified` empêchent d'assimiler un inventaire à une union de 253 372.
- `scripts/audits/test_candidate_lake_q1_inventory.py` : **4 tests locaux PASS** pour preuves manquantes, OK partiel, ZIP vide/absent et statut/catalogue invalide.
- `.github/workflows/candidate-lake-q1-artifact-inventory.yml` : tente les 17 archives, **continue après erreur individuelle**, émet `download-status.tsv` et `inventory.json` puis conserve un artifact de diagnostic même en cas de preuve manquante. Permission GitHub `contents:read`, `actions:read`; pas de site source, DB ou service de production.
- **État CI :** script testé localement, **workflow Github modifié non encore exécuté sur le HEAD de cette branche**. Ne pas annoncer 17/17 récupérés ou M250K manifest reconstruit.

## Pipeline technique suivant — pas encore implémenté

`catalogue d'artefacts → récupération d'archives → URL/ID + provenance → exact identity → candidate lake L0 → observation détaillée L1 → normalisation → clustering conservateur → fraîcheur → ingestion privée → éventuelle eligibility séparée`.

### Critères vérifiables par étape

- **Q1A récupération/manifest** : produire exactement les clés de représentation disponibles et leur origine, compter les archives manquantes et quarantainer les collisions ; n'accepter le total **253 372** que s'il est reconstruit avec toutes les preuves nécessaires. Manifeste JSONL déterministe + SHA256 + différentiel contre freeze.
- **Q1B observation détaillée** : pour chaque source et parcours, distinguer `candidate_url`, `detail_page`, `observation`, `property_cluster`, `active`. Compter le pourcentage d'URL donnant une fiche exploitable ; ne jamais confondre les catégories/facettes avec une annonce.
- **Q1C data quality** : prix MAD et cadence, surface, type, ville, transaction, dates, disponibilité, attributs ; champs manquants restent NULL/unknown ; provenance par champ.
- **Q2 clustering** : dédup exact source+ID puis fuzzy multi-sources avec règles anti-fausse-fusion, preuve par cluster et historisation des anciennes URL.
- **Q3 fraîcheur** : observation datée, reprise incrémentale et statuts `unknown/probable_active/probable_inactive` ; aucun actif revendiqué sans observation récente.
- **Q4 storage** : lac de candidats privé, exports de génération immuables, reprise idempotente, métriques par source/ville/type ; migration vers la base du produit seulement après choix et vérification de la cible (le projet Supabase historiquement utilisé n'est pas accessible actuellement).

## NEXT EXACT

1. Ouvrir la PR Draft de ce lot, puis déclencher en lecture seule le workflow `AkarFinder - Candidate Lake Q1 Artifact Inventory` sur cette branche avec `workflow_dispatch`, récupérer son `inventory.json` et sa liste de trous.
2. Sauver durablement les preuves encore récupérables et reconstituer les manquantes depuis données source archivées ou jeux de données publics, **sans refaire les mêmes requêtes à l'aveugle**.
3. Construire la première union Q1A d'identités réelles avec suivi des états de preuve et compter les trous avant de demander d'autres captures de pages.
4. Faire progresser le nombre d'**observations détaillées exploitables**, non seulement le nombre d'URL, vers 200 000.

**Aucune hypothèse de disponibilité de 253 372 fichiers bruts ne doit être transformée en résultat.**

## Contrôle complémentaire des structures URL et archive V2 (07/11/2026)

Le libellé `listing_hint` des fichiers originaux est **moins précis** qu'un type de page ; il ne doit jamais être assimilé à une fiche bien. Classification du **motif du chemin seulement**, sans accès source :
- Akaar : **49 034** URL de racine `/listing/{id}`, **27 809** URL de forme `/listing/{id}/unit/{id}` (unités liées, pas autant de biens physiques nouveaux).
- Domio : **2 017** URL à structure probable de filtre/catégorie et **3** URL à structure probable de détail.
- Autres URL découvertes, hors liste source `listing_hint` : **16 962**.

**Archive V2 reproductible créée et CRC vérifié :** `AkarFinder_L0_RECOVERED_EVIDENCE_V2_20261107.zip`, **942 204 octets**, SHA256 `6f21dfe98df4188fa4f00992320463dc0acec5859500b82fe19e890a8fefc980`. Six entrées : les deux archives originales, manifest JSONL.gz de 95 825 lignes avec `url_pattern_kind`, rapport, README et script de reconstruction. L'inventaire historique ne change pas : il s'agit de **95 825 URL L0**, non de 95 825 annonces détaillées. **La V2 est à préférer au pack V1** car elle renseigne la distinction filtre/unité/fiches candidates.

Ce travail n'a effectué **aucune requête aux sites sources**, aucune écriture SQL et aucune activation Search.

## Premier inventaire CI sur PR — 07/11/2026

**Workflow read-only réellement exécuté avec succès :** [Candidate Lake Q1 Artifact Inventory run #42365053878](https://github.com/hraaaaf/Akarfinder/actions/runs/42365053878), code HEAD `82ce6d41cdbad24268f451a45cc4b31b3e74e11e`, artefact diagnostic `13571351631` ; étapes unitaires, téléchargements, inventaire et upload toutes SUCCESS.

Le `inventory.json` téléchargé/CRC vérifié établit **17 attendues / 2 disponibles / 15 manquantes**, précisément :
- **OK** : `9974670013` Akaar, `9974714576` Domio, trois fichiers par archive ;
- **HTTP 410** : les **15 autres IDs** du catalogue, preuve des liens GitHub actuellement indisponibles. Les causes archivistiques ou l'existence de copies alternatives ne sont pas déterminées ;
- `completeProofCoverage=false`, `candidateUnionCertified=false`. Ce résultat **ne valide pas** la disponibilité du freeze 253 372.

**Préservation ajoutée à la CI :** le workflow sauvegarde désormais également les ZIP originaux encore accessibles dans un nouvel artefact `candidate-lake-q1-recovered-source-proof-mirror` (rétention demandée 90 jours), sans modifier leurs contenus. **L'exécution du miroir et son artefact ne sont pas encore vérifiés** dans ce document ; distinguer code ajouté et sauvegarde observée.

## Audit Supabase, backup local et réconciliation Q1B (07/11/2026)

Audit en lecture seule. Aucune migration, écriture hébergée, restauration, publication ou requête de site source.

La PR [Draft #1176](https://github.com/hraaaaf/Akarfinder/pull/1176) reste non fusionnée. Commit de l’audit : `0a049137cbc78334211f238a47ed46f3f5bf46c6`. Contrôles de ce HEAD exact : [inventaire](https://github.com/hraaaaf/Akarfinder/actions/runs/42369587331), [validation](https://github.com/hraaaaf/Akarfinder/actions/runs/42369587253), [typecheck](https://github.com/hraaaaf/Akarfinder/actions/runs/42369587255), [gate PR](https://github.com/hraaaaf/Akarfinder/actions/runs/42369587286) et [gate d’approbation](https://github.com/hraaaaf/Akarfinder/actions/runs/42369585500) terminés avec succès; `owner_approval` et `override_preflight` sont `skipped` comme prévu.

### Matrice des projets et sources

| Source | État observé | Données vérifiées | Exportabilité |
|---|---|---|---|
| Supabase `kusfiyimwvxblvsrhaes` (AqarFinder historique) | `INACTIVE`; catalogue inaccessible (« Database is possibly not accessible »), migrations en timeout | Projet hébergé non joignable par la connexion actuelle. Le backup local de ce projet contient les tables de collecte et d’observation décrites ci-dessous. | Backup local récupérable; ne pas conclure que le projet hébergé est vide. Aucune restauration. |
| Supabase `mgqsckxsqdqbzqwkgvwo` (AkarfFnder) | `ACTIVE_HEALTHY`, `eu-west-1`, PostgreSQL 17.11 | 0 relation publique, 0 bucket, 0 objet Storage, 0 utilisateur Auth. | Aucun patrimoine immobilier exportable observé. |
| Backup PostgreSQL du Bureau | `db_cluster-13-10-2026@00-10-00.backup.gz`, gzip d’un dump SQL; SHA-256 `cb0da8c09b81217cb2202b9f2a8ba66276c2ab2faa413e9dbfce8a99e8597e60` | Backup local du projet Supabase inactif, confirmé par l’utilisateur. Le fichier source est intact. | 14 extraits `COPY` verbatim, lac privé SQLite et JSONL.gz au Bureau. Manifest local vérifié; aucun contenu brut committé. |
| Neon `ancient-violet-43534870`, branche `br-cold-mouse-b2a50yaa` (`recovery-schema-cert-20260924`), base `AkarFinder` | Accessible en lecture seule; branche `ready` | 151 900 `property_listings`, 151 900 `listing_sources`, 0 `raw_listings`, 0 `scrape_runs`, 0 cluster dans cette branche. | Agrégats et couverture par source vérifiés. Export de lignes Neon vers le backup non fait; les sources ne sont donc pas réconciliées entre elles. |
| Neon AkarFinder, branche `br-wild-mud-b2y0dhc2` | Archivée | Même comptage exact de 151 900 `property_listings` et `listing_sources`. | Copie de test/snapshot, jamais additionnée à la branche recovery. L’égalité de volume seule ne prouve pas l’identité complète. |
| Neon AkarFinder, branche `production` `br-frosty-glitter-b2762sv1` | `ready`; 39 436 288 octets logiques | Base `neondb` vide; aucune relation applicative observée dans `AkarFinder`. | Pas de données immobilières exportables observées. |

### Données retrouvées dans le backup Supabase inactif

Le dump contient notamment `discovery_candidates` **321 173** lignes, `source_offer_seeds` **78 110**, `listing_representations` **143 121**, `mubawab_listing_corpus_v1` **37 420**, `source_offer_observations` **19 908**, `listing_sources` **19 621**, `property_listings` **19 616**, `property_clusters` **7 796**, `property_cluster_members` **7 802**, `property_condition_observations` **1 885**, `source_freshness_state` **35**, `source_freshness_transition_events` **50**, `source_offer_lifecycle_signals` **4** et `observation_ledger_events` **5**. Les tables se recouvrent; leurs nombres ne s’additionnent pas.

Les extraits privés sont dans `AkarFinder-DataMass-2026-11-07` sur le Bureau. `manifest.json` contient les empreintes et volumes. Le lac SQLite contient **231 818** clés L0 exactes et **399 283** références de preuve. JSONL.gz déterministe : SHA-256 `858585ef6f2010fbdfadf27eeaa58186c198044245bbf55c937fb9909a8a5a94`. SQLite : SHA-256 `75d3d388c226076645c073c8aa29e7c33dd165e614325b28cdae0e91912eb352`. Manifeste privé : SHA-256 `3657777bb479afd7eb878dc63c55c66a02e010aed26e3806472a776c6c6fa8bc`.

Règle L0 : `source_domain` (trim + minuscules) et `canonical_url` comparée exactement, sans normalisation d’URL. `discovery_candidates` fournit **171 728** clés exactes; `source_offer_seeds` en fournit **78 110**; **18 020** sont communes; l’union est **231 818**. Les lignes candidates ont **151 447 `rejected`**, **138 951 `unclassified`**, **13 813 `accepted`** et **16 962 `discovered`** (statuts de lignes, pas d’identités distinctes). Plusieurs domaines ne sont pas immobiliers. Ces clés restent L0 URL, `source_listing_id=NULL`, `rights_status=UNKNOWN_NOT_PROVEN`; elles ne certifient pas 231 818 annonces.

`listing_representations` compte **143 121** lignes et **143 116** couples distincts `canonical_source_system + canonical_source_record_id`. Quatre groupes ont des payloads contradictoires (cinq lignes supplémentaires) et sont quarantainés. `materialized_at` ne prouve pas une observation source; ces lignes ne sont pas comptées comme observations détaillées.

`source_offer_observations` comporte **19 908** snapshots datés, **18 087** identifiants d’offre distincts et **18 937** couples offre/date exacts. Les **971** couples répétés ont des payloads différents; ils sont quarantainés, sans fusion. **6 250 observations historiques détaillées** satisfont les champs requis : source et clé enregistrées, heure d’observation, transaction, type, ville, prix/devise et surface observés, et titre de la fiche liée par clé étrangère. Déduplication au couple identifiant/date. La clé est unique selon l’index de la base, mais non revalidée sur les sites. Dernière observation du backup : **2026-09-07**; aucune observation dans les 30 jours avant le 07/11/2026.

La couverture des champs par source est conservée dans deux CSV privés : `field_coverage_inactive_backup.csv` (23 sources; SHA-256 `08fdc443af9aa13aef4b28212cb6727d95dbd2c4fd9bcd4653628ab812eaf562`) et `field_coverage_neon_recovery.csv` (28 sources; SHA-256 `794a27c397b05b2f5594a678d5c16ee369e5f7440cca5ec8aafe06c2ad91fbfd`). Ils recensent clés, dates et champs manquants sans inclure d’enregistrements.

### Mesures Neon et rapprochement prudent

Sur Neon recovery, `source_offer_key` est présent et unique par `(source_name, source_offer_key)` pour **57 683** lignes; **94 217** n’ont pas de clé. `first_seen_at` est présent sur **11 639** lignes, mais clé + date sur **5 378**. `title`, ville, type et transaction sont présents sur les 151 900 fiches; prix MAD sur **56 274**, surface sur **62 110**, `description_snippet` sur **14 950**. La requête stricte retient **3 740 observations détaillées**. `last_seen_at` le plus récent : **2026-09-26**; aucune ligne `first_seen_at` ou `last_seen_at` des 30 derniers jours.

Les 151 900 lignes portent `is_active=true`, mais cet indicateur ancien ne prouve pas l’activité récente. Les 151 864 étiquettes `compliance_status` sont des valeurs `recovery_*` internes, pas des preuves de droit d’exploitation; **36** sont nulles. Droits d’exploitation démontrés : **0**. Les clusters Neon sont vides. Les **7 796** clusters du backup Supabase sont des groupes techniques d’identités source, pas une preuve de biens physiques uniques. Biens physiques uniques prouvés : **UNKNOWN**.

Les **6 250** observations détaillées du backup et les **3 740** de Neon n’ont pas été rapprochées par identité; le chevauchement est `UNKNOWN`. L’union exacte est donc inconnue; les limites calculées sont **6 250–9 990** avant rapprochement. Ne pas annoncer 9 990 comme volume dédupliqué. L’écart exact à 200 000 reste `UNKNOWN`; il est de **193 750** au minimum conservateur de 6 250.

| Indicateur | Résultat vérifié au 07/11/2026 |
|---|---:|
| Clés URL L0 exactes dans le backup (tous domaines, avant qualification immobilière) | 231 818 |
| Références de preuve des deux tables L0 | 399 283 |
| Observations détaillées du backup inactif | 6 250 historiques |
| Observations détaillées de Neon recovery | 3 740 historiques; chevauchement inconnu |
| Union détaillée cross-source dédupliquée | UNKNOWN |
| Observations vérifiées durant les 30 derniers jours | 0 |
| Lignes Neon sans clé source | 94 217 |
| Groupes en quarantaine (observations + représentations) | 975 |
| Biens physiques uniques prouvés | UNKNOWN |
| Données avec droits d’exploitation démontrés | 0 |
| Écart certifié à 200 000 | UNKNOWN; minimum conservateur : 193 750 |

### Preuves SQL en lecture seule

Catalogue Supabase actif et volumes Storage/Auth, exécutés sur `mgqsckxsqdqbzqwkgvwo` :

```sql
SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')) AS public_relations,
  (SELECT count(*) FROM storage.buckets) AS storage_buckets,
  (SELECT count(*) FROM storage.objects) AS storage_objects,
  (SELECT count(*) FROM auth.users) AS auth_users;
```

Comptages exacts Neon, base `AkarFinder`, branche recovery :

```sql
SELECT 'listing_sources', count(*) FROM public.listing_sources
UNION ALL SELECT 'property_listings', count(*) FROM public.property_listings
UNION ALL SELECT 'raw_listings', count(*) FROM public.raw_listings
UNION ALL SELECT 'scrape_runs', count(*) FROM public.scrape_runs
UNION ALL SELECT 'property_clusters', count(*) FROM public.property_clusters
UNION ALL SELECT 'property_cluster_members', count(*) FROM public.property_cluster_members;
```

Complétude et identité stricte Neon (résultats agrégés) :

```sql
SELECT count(*) AS total,
       count(*) FILTER (WHERE s.source_offer_key IS NOT NULL AND btrim(s.source_offer_key)<>'') AS keyed,
       count(*) FILTER (WHERE s.first_seen_at IS NOT NULL) AS dated,
       count(*) FILTER (WHERE s.source_offer_key IS NOT NULL AND btrim(s.source_offer_key)<>''
         AND s.first_seen_at IS NOT NULL AND p.title IS NOT NULL AND btrim(p.title)<>''
         AND p.transaction_type IS NOT NULL AND p.property_type IS NOT NULL
         AND p.city IS NOT NULL AND btrim(p.city)<>''
         AND ((p.price_mad>0) OR (s.displayed_price>0 AND NULLIF(btrim(s.price_currency),'') IS NOT NULL))
         AND COALESCE(p.surface_m2,p.built_surface_m2)>0) AS detailed
FROM public.listing_sources s
JOIN public.property_listings p ON p.id=s.property_listing_id;
```

Les comptages du backup ont été calculés sur les sections `COPY`, sans restauration SQL. Les contrôles privés ont validé SHA-256, CRC gzip, nombre exact de lignes des 14 extraits, unicité des clés L0/L1, comptes SQLite, quarantaine et re-sérialisation déterministe du JSONL L0 : **231 818 lignes reproduites, SHA-256 identique**. Tous les résultats sont agrégés; aucune annonce ni donnée personnelle n’a été copiée dans cette PR.

### Suite immédiatement exécutable

1. Comparer les clés exactes `(source_name, source_offer_key)` Neon et celles du backup privé; mesurer l’intersection avant toute union cross-source.
2. Ajouter un export client Neon privé, en lecture seule, avec pagination reprenable et empreintes; ne transférer aucune ligne brute vers GitHub ou Notion.
3. Réconcilier les 253 372 représentations historiques et les preuves GitHub manquantes par identité exacte. N’utiliser l’URL comme fallback qu’après preuve du normaliseur.
4. Quarantainer les lignes Neon sans ID et les groupes conflictuels; établir les droits applicables avant tout enrichissement ou usage externe.
5. Garder fraîcheur, biens physiques et droits `UNKNOWN` tant que leurs preuves ne sont pas acquises.

## Q1B — Réconciliation privée Supabase backup + Neon Recovery (07/11/2026)

Cette section remplace les anciennes mentions « UNKNOWN » de chevauchement cross-source du diagnostic initial. L’export Neon et les rapprochements sont terminés. Les sources originales restent intactes et les nouvelles données sont uniquement dans le stockage privé local du Bureau.

### Export Neon en lecture seule

Branche recovery-schema-cert-20260924, projet ancient-violet-43534870, base AkarFinder. Export de listing_sources joint à property_listings, 76 pages ORDER BY listing_sources.id (75 × 2 000, dernière page 1 900), et export séparé de la relation listing_sources.id → property_listings.id en 31 pages. Requêtes SELECT seulement; aucun secret/chaîne de connexion n’a été récupéré et aucune écriture Neon/Supabase n’a été faite.

- **151 900** lignes Neon exportées; **151 900** IDs de lignes uniques.
- **57 683** clés source renseignées et uniques; **94 217** sans source_offer_key.
- La relation parent a été vérifiée sur **151 900** lignes : **127 031** listing_sources.id diffèrent de property_listings.id. L’export privé conserve la vraie clé étrangère, vérifiée ligne par ligne.
- Le dump Supabase original a été laissé intact. Les extraits COPY privés et le nouveau JSONL Neon comprimé ont chacun leurs SHA-256 dans le manifeste privé.

### Réconciliation exacte des identités

source_name est un libellé différent entre les systèmes (nom de marque vs domaine); l’intersection textuelle directe (source_name, source_offer_key) est **0**. Pour éviter une table d’alias spéculative, le domaine d’identité est extrait du listing_url de chaque ligne : hôte minuscule, retrait du seul préfixe www. et du point final. Le chemin et la query URL ne sont jamais normalisés ou rapprochés. Le source_name d’origine reste conservé.

| Identités source avec clé validée | Backup Supabase | Neon Recovery | Union |
|---|---:|---:|---:|
| Identités domaine + ID | 13 784 | 57 683 | 69 619 |
| Intersection exacte |  | **1 848** |  |
| Uniquement backup | **11 936** |  |  |
| Uniquement Neon |  | **55 835** |  |

L’export conserve séparément les **19 621** lignes listing_sources du backup et les **151 900** lignes Neon comme preuves, sans additionner leurs lignes comme annonces uniques. Les **5 837** lignes source backup et **94 217** lignes Neon sans ID restent traçables dans une table d’identités non résolues; aucun rapprochement par URL similaire n’a été tenté.

### Définition unique et résultat des observations détaillées

Une observation historique détaillée exige : domaine source + ID source, horodatage d’observation, titre, ville, type de bien, transaction, prix positif avec devise explicite (ou prix normalisé MAD), et surface positive. Le quartier est conservé mais n’est pas une condition de cette définition. Une identité source réobservée à un autre horodatage constitue une autre observation historique; elle n’est pas déclarée active.

- Backup : **6 250** observations historiques qualifiées.
- Neon : **3 740** observations historiques qualifiées.
- **23 identités détaillées** sont communes, mais les horodatages diffèrent; **0 paire exacte (domaine, ID, horodatage)** ne se répète. Elles restent donc **9 990 observations datées dédupliquées**; elles représentent **9 967 identités source** dans ce seul sous-ensemble.
- Les **44 426** fiches « titre + prix positif + ville + quartier + surface » constituent un filtre différent. **2 577** satisfont aussi le contrat détaillé; **1 163** autres satisfont le contrat détaillé mais n’ont pas de quartier. Parmi les 44 426, **7 156** n’ont pas d’ID source et **41 422** n’ont pas first_seen_at (ces catégories se recouvrent). Cela explique pourquoi 44 426 ne sont pas 44 426 observations détaillées.

### Tableau Q1B

| Indicateur | Résultat vérifié |
|---|---:|
| Candidats L0 du backup, tous domaines | 231 818 |
| Lignes source récupérées Neon | 151 900 |
| Lignes source récupérées backup listing_sources | 19 621 |
| Identités source domaine + ID dans l’union | 69 619 |
| Observations détaillées du backup | 6 250 |
| Observations détaillées Neon | 3 740 |
| Observations historiques détaillées de l’union | **9 990** |
| Fiches Neon à cinq champs | 44 426 (définition distincte) |
| Observations vérifiées dans les 30 derniers jours | **0** |
| Dernier last_seen_at Neon | 2026-09-26; fraîcheur actuelle non démontrée |
| Quarantaine préexistante conservée | **975 groupes** |
| Nouveaux conflits exacts identité + horodatage | **0** |
| Biens physiques uniques prouvés | **UNKNOWN** |
| Droits d’exploitation prouvés | **0** |
| Écart à l’objectif de 200 000 observations détaillées | **190 010** |

Les 231 818 clés L0 sont des URLs candidates et ne sont pas ajoutées à ce total. Les archives Akaar/Domio et l’inventaire historique L0/L1 de 253 372 restent non rapprochés de cette union.

### Lac privé, tests et empreintes

Lac SQLite privé actualisé de manière idempotente avec source_listing_evidence (171 521 lignes de preuve), source_identity_union (69 619 identités), unresolved_source_rows (100 054 lignes sans rapprochement exact), observations_detailed_union (9 990 observations) et la quarantaine préexistante (975 groupes).

Validation : 151 900 lignes d’export et IDs uniques; 76 pages et 31 pages de relation parent sans lacune; identité et compteurs concordants avec SQL Neon; PRAGMA integrity_check=ok; foreign_key_check=0; deux ingestions complètes consécutives donnent des empreintes de tables SQLite identiques. Aucune URL ni annonce brute n’est placée dans ce dépôt ou dans Notion.

Artefacts privés : neon_recovery_export_20261107.jsonl.gz (151 900 lignes), neon_parent_map_20261107.csv.gz, source_identity_union_20261107.jsonl.gz, observations_detailed_union_20261107.jsonl.gz, unresolved_source_rows_20261107.jsonl.gz, couvertures par domaine, reconciliation_proof_queries.sql, et manifest.json + manifest.sha256, dans AkarFinder-DataMass-2026-11-07 sur le Bureau.

- Export Neon détaillé SHA-256 : c3d8a8c9476602baa7663d1e9903e6015cb7300d6e7539183bf48b735cb76b08.
- Union des identités SHA-256 : 3efb90a0ba422f2ae92a67848ad547cc652a1afe77da0f885c55f59542ec10db.
- Union des observations détaillées SHA-256 : 76635208549dbce618cf0de9de5e3109f0ac39deefb08f83a330a882fed5f1ee.
- Manifeste privé SHA-256 : 6dc6fe94cdc2ff909a769d8820b49eeac020f8d88061f245f85b5a1a25b8b523.

### Requêtes de preuve agrégées

Comptage des identités dans le lac privé :

    SELECT sum(backup_present=1 AND neon_present=1) AS intersection,
           sum(backup_present=1 AND neon_present=0) AS backup_only,
           sum(backup_present=0 AND neon_present=1) AS neon_only,
           count(*) AS union_count
    FROM source_identity_union;

Comptage des observations distinctes par source et total :

    SELECT evidence_stores, count(*) AS observations
    FROM observations_detailed_union
    GROUP BY evidence_stores
    ORDER BY evidence_stores;

CI vérifiée sur le commit 4a645aaaf997eb248e7ab32033d0ece533f4bf9a : validate, typecheck, inventory, gates et detect_drift SUCCESS; owner_approval et override_preflight SKIPPED comme attendu en Draft. PR #1176 maintenue en Draft, non fusionnée. Prochaine étape : rapprocher les 253 372 représentations historiques et les archives GitHub récupérables par clés prouvées, puis examiner les conditions d’usage avant tout enrichissement externe.




### Q1B complément — recoupement exact avec les URLs L0 (07/11/2026)

Un recoupement local supplémentaire a comparé les 151 900 URL Neon aux 231 818 paires domaine + URL du Candidate Lake L0, sans normaliser aucun caractère de l’URL. **17 631** paires exactes ont été référencées : **7 826** lignes Neon avec ID source et **9 805** sans ID. Elles sont conservées dans une table et un export privé de preuves de correspondance URL. **Aucune de ces correspondances URL n’est fusionnée comme identité source ou observation**, et les compteurs 69 619 identités / 9 990 observations restent inchangés. Les 9 805 sans ID restent non résolues.

Export privé : candidate_neon_exact_url_crossrefs_20261107.jsonl.gz, **17 631 lignes**, SHA-256 13ad6b4ba59f13cfa22ac96c822158ad877183e29ab8564996cdd35c6b891609. Deux exécutions ont donné le même hash de table logique et le même hash d’export; integrity_check SQLite demeure ok.

La vérification des fichiers locaux n’a pas retrouvé l’archive V2 nommée ci-dessus ni l’export complet des 253 372 représentations. Les artefacts GitHub du run 42365367984 sont toujours marqués disponibles jusqu’au 05/02/2027, dont le miroir 13570849757 (digest SHA-256 5c87cc1f8b362a9f7692b006c297afa7c884eef884b3f3c6a760c1cee29dc8e8). Le connecteur a fourni une référence de fichier téléchargeable, mais pas un chemin local; la commande gh run download échoue car le CLI local n’est pas authentifié (gh auth login requis). Aucun état vide ou HTTP 410 n’est inféré pour cet artefact. L’union complète contre 253 372 représentations reste donc non certifiée jusqu’à matérialisation privée de l’archive et de ses preuves.


### Q1C/J6 — réconciliation exacte URL du miroir Akaar/Domio (07/11/2026)

**GOAL :** rapprocher les empreintes privées du lac L0 et le miroir GitHub existant sans diffuser de données brutes ni compter de nouvelles annonces à tort. Exécution indépendante dans ChatGPT après réception du fichier `AKARFINDER_J6_MINIMAL_EXPORT.zip` transmis par Codex.

**PROOF :** SHA-256 du ZIP minimal `4be70ebef3bd0d55d909c6050ae794f0a61ef88b5be48385596ee764fe08a91b` ; ZIP miroir `5c87cc1f8b362a9f7692b006c297afa7c884eef884b3f3c6a760c1cee29dc8e8` ; CRC de toutes les archives OK. Les 231 818 empreintes URL et 69 619 empreintes d'identités source sont au bon format, triées, uniques et correspondent au SHA-256 déclaré dans le manifeste. La règle `stored-canonical-url-v1` a été respectée : hachage des URL littérales du miroir par encodage versionné à longueur UTF-8, sans réécriture d'hôte, chemin ou query.

| Indicateur vérifié | Résultat |
|---|---:|
| URL candidates distinctes du lac privé | **231 818** |
| URL candidates distinctes du miroir Akaar | 78 202 |
| URL candidates distinctes du miroir Domio | 17 623 |
| Intersection exacte miroir/lac — Akaar | 0 |
| Intersection exacte miroir/lac — Domio | 129 |
| Intersection totale | **129** |
| URL miroir absentes du lac | **95 696** |
| URL seulement dans le lac | 231 689 |
| **Union URL candidats dédupliquée** | **327 514** |
| Indices d'annonces du miroir | 78 863, sous-ensemble des URL candidates |
| Indices d'annonces en intersection avec le lac | 42 |

**Limites / comptabilité :** les 327 514 éléments sont des **URL candidates historiques**, pas des offres exploitables. Les identités source certifiées restent **69 619** et les observations historiques détaillées **9 990** ; aucune URL n'est convertie en observation. Cette réconciliation couvre le lac privé L0 et les **deux archives** disponibles, **pas** les 15 archives historiques HTTP 410 ni les 253 372 représentations historiques complètes. Aucun nouveau bien physique unique, aucune fraîcheur et aucun droit d'exploitation ne sont prouvés. Le timeout historique `domio.ma/sitemap-properties.xml` rend sa couverture incomplète. L'intégrité du SQLite original est **rapportée par le manifeste Codex**, non revérifiée directement ici faute de fichier brut.

**SUCCESS :** union exacte d'URL calculée et indépendante du backup complet. **Next exact :** importer les 95 696 URL absentes en staging L0 privé, de façon idempotente, avec provenance explicite, puis confronter la couverture au reste des représentations et vérifier droits / fraîcheur avant toute qualification. Ne pas envoyer d'URL privées sur GitHub/Notion ; aucun write Supabase/Neon, merge ou déploiement.


### Q1C — import privé J6 exécuté et vérifié (staging isolé)

**Statut : staging effectué sur une copie locale distincte, le lac source est intact.** Les URL en clair demeurent uniquement dans le stockage privé du Bureau.

- Paquet d'import reçu : SHA-256 `6b039536925e96e6bf0a67be8a3363b33ca6a9fb4a19cd23b64cfc9b1fd8bd05`. Delta privé : SHA-256 `c284833c1bcc0b66d541169276a8f2af9b32ac5e6401c65ab50262ff6a112a50`.
- Recalcul indépendant de la règle `stored-canonical-url-v1` confirme **95 825 URL distinctes** : **129** intersection exacte avec le lac initial et **95 696** candidates nouvelles. Akaar : 78 202 nouvelles, 0 intersection. Domio : 17 494 nouvelles, 129 intersection. Les 78 863 listing hints sont heuristiques (42 en intersection, 78 821 nouvelles). Les 3 erreurs de parsing rapportées dans l'archive Domio ne sont pas comptées parmi les lignes récupérées.
- Staging local privé `candidate_lake_Q1C_staging.sqlite` : **95 825** lignes, dont **95 696** dans la vue des nouvelles URL. SHA-256 fichier **`1f356c1af1c49b221b3cd814d9ce97da7460b0b66aa2ad747d80b6da267fa654`** ; hash logique **`9823cf3a44c1b4fbd5c0e3acd36ae45a4ff27b142f2c7df7f84abc8d02fe0275`**. Deux exécutions successives ont donné les mêmes hashes et compteurs.
- Le lac source n'a pas été modifié : SHA-256 avant/après **`314fa850a2f5e35b55e19c91b906c6f23f4abeb9f0187d9303847adb77086c2e`**, avec **231 818** clés L0 et **69 619** identités source inchangées. Le recalcul a vérifié chaque hash du delta ; **129** indicateurs d'intersection concordent exactement avec les clés du lac. `integrity_check=ok`, `foreign_key_check=0`.
- Le test synthétique d'idempotence, de rejet d'une source modifiée et de refus d'une cible étrangère passe. Deux corrections locales de compatibilité Windows ont été nécessaires dans les scripts du paquet : fermeture explicite de la connexion de clonage avant renommage et ouverture URI du staging pour maintenir l'attachement du delta en lecture seule. Aucun script corrigé ni URL brute n'a été committé.
- Rapport privé agrégé : `Q1C_STAGING_RESULT.manifest.json`, SHA-256 **`d7e89e1b60654b6b9c35885db00f6f4c1482bdf46d19b1f57095f44d20a9673b`**. Il inclut hashes des scripts privés corrigés et preuves de staging.

Cette étape ajoute des URL candidates L0, pas des annonces détaillées : union exacte **327 514** URL, observations détaillées inchangées **9 990**, écart à 200 000 détaillées **190 010**. Fraîcheur actuelle, unicité des biens physiques et droits d'exploitation restent **UNKNOWN / NOT PROVEN**. Aucun écrit Supabase/Neon, merge, déploiement ou scraping n'a eu lieu.

**Next exact :** confronter les 253 372 représentations historiques et les autres preuves récupérables à cette union privée par clés vérifiables, puis établir les droits et la fraîcheur avant tout enrichissement de contenu.


### Q1D — triage structurel indépendant des routes Akaar/Domio (07/11/2026)

**GOAL :** éviter de traiter les URL candidates J6 comme 95 696 nouvelles annonces. Classification reproductible et **hors ligne** à partir du fichier privé `AKARFINDER_J6_PRIVATE_DELTA.sqlite` (SHA-256 `c284833c1bcc0b66d541169276a8f2af9b32ac5e6401c65ab50262ff6a112a50`, `integrity_check=ok`) et des `summary.json` des archives GitHub Akaar/Domio. **Aucune requête aux sites et aucune écriture dans les bases de données cloud.**

| Provenance | URL candidates | Chemins « fiche/unité » probables | Autres chemins | Déjà dans L0 |
|---|---:|---:|---:|---:|
| Akaar.fr | 78 202 | **76 843** : 49 034 `/listing/<ID>` + 27 809 `/listing/<ID>/unit/<ID>` | 1 359 (dont 1 248 `/shop`) | 0 |
| Domio.ma | 17 623 | **7** : routes localisées avec ID numérique + slug | 17 616 (catégories/filtres/navigation dominants) | 129 |
| **Total** | **95 825** | **76 850** | **18 975** | **129** |

Sur les **95 696 URL miroir absentes** du lac L0, **76 850** sont compatibles avec une fiche/unité au seul niveau de l'URL et **18 846** relèvent d'autres catégories. Ceci est un **triage de chemins, pas une vérification de contenu, d'activité, de Maroc, de droits, ni d'unicité physique**.

**Défaut de métrique constaté :** le fichier Domio `listing_hint_urls.txt` contient 2 020 URL « hints », alors que seulement **3** d'entre elles présentent une route probable de fiche ; **2 017** ne sont pas des chemins de détail reconnus. Inversement, **4** chemins de fiche probable Domio n'ont pas le flag « hint ». La nomenclature `listing_hint` doit rester indicative, jamais être promue automatiquement en observation ou annonce. Le `summary.json` Domio rapporte que `sitemap-properties.xml` était en timeout : l'inventaire des fiches Domio n'est pas complet.

**PROOF :** classification exacte, stricte, déterministe par segments d'URL ; contrôle de 95 825 lignes, somme par source, recoupement des flags 129, et correspondance avec les volumes des sitemaps historiques. Rapport agrégé Q1D privé disponible dans la conversation, SHA-256 du Markdown `0ba543f43a0a77a2ef5cc9b91fda67eda7a06263ef0c1a7f636a9f322829301b`. Aucun listing brut, URL individuelle ou export de données privé dans ce commit.

**Next exact :** ajouter une classification versionnée **dans la copie privée du staging Windows**, vérifier les totaux et éviter toute promotion des filtres Domio en fiches. Ensuite, vérifier pertinence Maroc et droit d'utilisation avant un échantillon de vérification de pages ou une collecte autorisée, et maintenir le suivi des 15 archives historiques inaccessibles. L0 reste **327 514** URL candidates ; identités **69 619**, observations détaillées **9 990** (écart **190 010**) ; aucune preuve nouvelle de fraîcheur ou d'exploitation. Aucun merge ni Vercel.


**Q1D sidecar classifié sans URL en clair :** paquet privé `AKARFINDER_Q1D_CLASSIFICATION_PRIVEE_2026-11-07.zip`, créé à partir du delta J6 sans accès aux sites. Contient un SQLite annexe `classification` (une ligne par URL-hash, sans URL en clair) et un manifeste des règles `q1d-urlpath-v1`. **95 825** lignes, dont **76 850** chemins de fiche/unité probable ; 129 recoupements L0. `integrity_check=ok`, `foreign_key_check=0` ; SHA-256 du SQLite annexe `2fc1d451540a426600fdaa1594686173e099dd5c7f00a62dd8fb578dadfde2c9`, SHA logique `7d0dadb739ac7252d4e046af00f3b3158c624f3114a7b5fb883f7b7471142031`, ZIP `65851d1800b0f436c963968029f03aff58a9d98a90f65befcfd0b01a7c0e052b` (CRC OK). Le fichier est **privé dans la conversation**, non publié dans ce dépôt. **Prochaine action locale** : joindre ce sidecar à la copie de staging Windows en lecture seule sur `url_hash`; vérifier la couverture et contrôler la pertinence Maroc et les droits avant toute consultation automatisée de pages. Aucune altération du lac Windows dans cette session.


### Q1E — étude d'application du parseur aux candidats L0, audit direct Neon (07/11/2026)

**GOAL :** distinguer l'index de liens du contenu réellement re-parsable ; inventorier les capacités effectives des parseurs existants et mesurer, en lecture seule, ce qui pourrait être requalifié sans réseau ni données inventées.

**Code réellement inspecté sur le dépôt (main) :** `scripts/acquisition/canonical_listing_extractor.py` consomme **URL + HTML** (JSON-LD, meta, texte) ; `lib/intelligence/structured-listing-pipeline.ts` adapte des **fiches structurées / flux** ; `scripts/acquisition/cross_source_dedupe.py` et `lib/dedup-clustering/v2-scorer.ts` identifient des paires. **Point de performance important** : les fonctions `cluster_records` et `findCandidatePairs` comportent chacune une boucle imbriquée globale sur toutes les paires. **Ne pas les lancer tels quels sur 327 514 lignes**. Préférer dédoublonnage exact par hash/clé et génération de paires *indexée/bloquée* (ville, type, transaction et dimensions proches) pour le fuzzy, sans fusion automatique des collisions.

**Neon Recovery, branche `recovery-schema-cert-20260924`, base `AkarFinder` ; toutes les requêtes ont été des `SELECT` agrégés :**

| Mesure | Observé |
|---|---:|
| URL distinctes du lac Q1C (backup + miroir) | **327 514** (index de liens, pas HTML) |
| `raw_listings` (Neon Recovery et test) | **0 lignes** |
| `property_listings` (Neon Recovery) | **151 900** fiches structurées |
| Fiches avec ville/type/transaction/prix positif/surface positive | **53 083** |
| Fiches avec description non vide | **14 950** |
| Descriptions associées à un prix manquant | 9 528 |
| Descriptions associées à une surface manquante | 5 232 |
| Fiches avec champs structurés requis, sans `source_offer_key` | **9 259** |
| Parmi celles-ci, avec `first_seen_at` renseigné | **1 048** |
| Fiches complètes avec clé explicite + `first_seen_at` | **3 740** (compteur historique strict Neon inchangé) |

**Pilote URL→ID sans réseau, ni écriture :** correspondance du motif d'URL avec des clés explicites déjà stockées, avant toute attribution aux lignes sans clé :

| Source | Lignes sans clé à motif correspondant | IDs distincts à motif | IDs distincts non déjà clés dans Neon | Contradictions URL/clé constatées parmi les lignes clés |
|---|---:|---:|---:|---:|
| Mubawab | 12 066 | 12 049 | **11 649** | **34** |
| Avito | 578 | 574 | **574** | 0 |
| Agenz | 3 004 | 2 463 | **2 111** | **15** |
| **Total** | **15 648** | **15 086** | **14 334** | **49** |

**Attention :** 14 334 = **IDs candidats supplémentaires par rapport aux clés explicites de Neon seulement**, et non nouveaux biens, nouvelles observations ni nouvelles identités dans l'union avec le backup. Les 49 divergences sont à isoler et à revoir manuellement/avec règles propres à chaque source. Les éventuels ID présents dans le backup et les ID de plusieurs observations d'un même bien ne sont pas ici retirés.

**Potentiel de qualification temporelle immédiat beaucoup plus faible** : parmi les **1 048** fiches Neon avec champs requis + `first_seen_at` mais sans clé, **137** lignes ont le motif Mubawab/Avito (122 + 15), et **266** le motif Agenz : **403 lignes**, correspondant à **339 IDs distincts jusque-là non explicitement clés dans Neon** (Mubawab 119, Avito 13, Agenz 207). Ne pas les promouvoir sans contrôle d'identité, de provenance, de collisions, d'horodatages et d'intersection avec le backup ; compteur strict global **9 990** inchangé. Ces chiffres ne prouvent ni fraîcheur ni droit d'exploitation.

**SUCCESS de cet audit :** les 327 514 liens ne constituent pas un corpus HTML brut ; le parseur existant a besoin de contenu sauvegardé pour une extraction complète. Un retraitement **hors ligne** des 151 900 lignes structurées et des 19 908 observations source du backup (à inspecter localement) est une piste ; il faut ne pas remplacer des timestamps manquants par des dates d'exécution. **Next exact :** sur le poste Codex, créer un adaptateur lecture seule de flux `source_offer_observations` / `property_listings` et faire un dry-run stratifié, rapporter les changements de couverture et le taux d'erreur des IDs avant un batch ; ajouter un générateur de paires O(n)-indexé / buckets, jamais O(n²) global ; ne pas ingérer/publier sans droits. Aucune modification de base ni Vercel.
