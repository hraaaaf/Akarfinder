# Akarfinder — Mubawab V6.4.6 : parser + mesure réelle de complétude (2026-11-02)

**Goal :** prouver par données l'extraction, la qualité et l'unicité des annonces, sans confondre CI, IDs et biens publiables.

## État initial vérifié
- Handover Notion : https://app.notion.com/p/40c77c66336281e8b50fddde1076eea5
- Branche source `sandbox/akar-chrome-probe-20261101`, HEAD `cf688f61e558935489a8fc5f1a54880f7776e4d9`.
- CI V646 https://github.com/hraaaaf/Akarfinder/actions/runs/41479752149 : **19/19 PASS**, sécurité/manifest uniquement.
- Run V645 https://github.com/hraaaaf/Akarfinder/actions/runs/41327076337 : **97 enregistrements SQLite historiques sur 3 pages**, distinct du scraper V646 live.
- 200 000 fiches uniques fraîches complètes : **NON PROUVÉ**. Aucun déploiement ni écriture DB produit.

## Instrumentation et tests de reprise
- Branche de travail `sandbox/akar-v646-parser-benchmark-20261102`.
- `scripts/pilots/mubawab-v646/tests/test_parser_evidence.py` : 14 nouveaux tests de reconnaissance HTML, prix MAD/MDH, surface, localité, rejets, doublons, persistance et idempotence. Les HTML sont expressément **synthétiques**, pas une capture Mubawab.
- `scripts/pilots/mubawab-v646/benchmark_evidence.py` : mode replay HTML synthétique et mode audit de SQLite préexistante en lecture seule. Aucun accès réseau ni write dans l'outil.
- `.github/workflows/mubawab-v646-offline-tests.yml` : tests et relecture de l'artefact `mubawab-v645-multishard-sqlite-state` du run #41327076337 (97 lignes attendues) ; sortie JSON `mubawab-v646-historical-evidence`.

## Contrat de mesure
- `observed_rows` : lignes source parcourues (doublons éventuels inclus).
- `unique_source_ids` : identifiants du **même portail** distincts, pas biens physiques uniques.
- `complete_core_without_district` : titre + prix MAD numérique ou on-request explicite + surface + ville + URL de détail.
- `complete_core_with_district` : mêmes champs + quartier observé ; `_numeric_price` sépare la présence d'un prix numérique.
- `duplicate_source_id_occurrences` : répétitions d'identifiants ; la déduplication **physique** inter-IDs reste inconnue.
- `verified_active`, `physical_unique_properties` et `live_extraction_rate_per_hour` : `null` faute de preuve.
- `publication_eligible_proven = 0` tant que fraîcheur, activité et droits ne sont pas contrôlés.
- Les secondes de traitement du benchmark sont **CPU/offline** et non un débit de crawl.

## Validation en cours
- [Run #41548735455](https://github.com/hraaaaf/Akarfinder/actions/runs/41548735455) : workflow initial, queued au contrôle ; [run final de code #41549175495](https://github.com/hraaaaf/Akarfinder/actions/runs/41549175495) sur `6ac202be403564610bde8b0b53dd43b59a14460e`, **queued** au contrôle initial. Les métriques ne sont pas publiées avant logs.
- Aucun chiffre de complétude historique publié avant artefact/logs.

## Gate réel restant
1. Résultat CI + lecture du rapport JSON, correction si échec.
2. HTML réellement capturé et admissible ; comparaison de sélecteurs/fixtures sans confondre synthèse et source.
3. Benchmark live V646 borné (requêtes, réponses, blocs, délais, fiches, complet, uniques et doublons), uniquement sur un accès permis, aucun bypass.
4. Test de reprise sur interruption, intégrité SQLite, qualité, validation CI puis closeout Notion.
5. **NO-GO** pour extrapoler à 200k tant que rendement et catalogue disponible ne sont pas démontrés.

Aucun Vercel, aucun Supabase/Neon ni merge dans ce chantier.

## Observation complémentaire : 1 page de résultats consultée (non parsée)
- `robots.txt` obtenu le 02/11 avec politique générique excluant `/*:`, mais ne bloquant pas le shard non paginé de Rabat.
- Une lecture publique ponctuelle du shard Rabat a montré des prix, surfaces et localisations visibles. Le service d'extraction consulté **nettoie les attributs CSS et les liens** : zéro `.listingBox` dans le HTML nettoyé ne prouve PAS leur absence dans le HTML source. Impossible de valider les sélecteurs V646 sur cette sortie.
- Le rendu de résultats mélange parfois un contenu de catégorie différente (exemple historique visible : villa en tête de résultats appartements) ; type de bien à qualifier, pas à supposer depuis le shard.
- Ce contrôle n'est pas un benchmark du parseur V646 : zéro HTML brut fidèle conservé, zéro fiche V646 nouvellement certifiée, zéro débit live mesuré.
- Correctif compteur ajouté : fusion non destructive des champs d'un même ID source lors du replay, test de régression `partial_duplicate` ; CI final toujours non confirmé.
