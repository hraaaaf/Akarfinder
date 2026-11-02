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
- `scripts/pilots/mubawab-v646/tests/test_parser_evidence.py` : 13 nouveaux tests de reconnaissance HTML, prix MAD/MDH, surface, localité, rejets, doublons, persistance et idempotence. Les HTML sont expressément **synthétiques**, pas une capture Mubawab.
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
- [Run #41548735455](https://github.com/hraaaaf/Akarfinder/actions/runs/41548735455) créé sur commit `b3d0cadc4dd2110fece8d28ced2ff0fd36a188b0`, état **queued** au contrôle initial.
- Aucun chiffre de complétude historique publié avant artefact/logs.

## Gate réel restant
1. Résultat CI + lecture du rapport JSON, correction si échec.
2. HTML réellement capturé et admissible ; comparaison de sélecteurs/fixtures sans confondre synthèse et source.
3. Benchmark live V646 borné (requêtes, réponses, blocs, délais, fiches, complet, uniques et doublons), uniquement sur un accès permis, aucun bypass.
4. Test de reprise sur interruption, intégrité SQLite, qualité, validation CI puis closeout Notion.
5. **NO-GO** pour extrapoler à 200k tant que rendement et catalogue disponible ne sont pas démontrés.

Aucun Vercel, aucun Supabase/Neon ni merge dans ce chantier.
