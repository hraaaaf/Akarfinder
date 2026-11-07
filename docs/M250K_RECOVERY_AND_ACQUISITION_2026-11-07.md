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
