# Lot 4 Status

**Status: ✅ CLOSED — canonical pilot 100 proven read-only**

## Goal

Valider le comportement du crawl pilote Mubawab sur un périmètre contrôlé avant toute ingestion AkarFinder.

## Lot 4A — controlled rehearsal

Workflow : `Data Ingestion Lot 4 Controlled Rehearsal`

Preuve de référence rehearsal :

- run : **#12**
- run ID : **33799055629**
- head SHA : **78927affe95a2bbb15e50bdc4363cb957366cade**
- artifact : `mubawab-lot4-controlled-rehearsal`
- artifact ID : **9910362535**
- digest : `sha256:37662c920312d3c5c280419190ab23d152527f054b31ae669f4219725dae98b7`
- 40 / 40 détails normalisés
- checkpoint + reprise prouvés
- zéro erreur / doublon / écriture DB / téléchargement image

## Lot 4B — canonical pilot 100

Runner : `scripts/mubawab-pilot-100.ts`

Workflow : `Data Ingestion Lot 4 Pilot 100`

### Preuve canonique finale

- run : **#9**
- run ID : **33800379888**
- head SHA : **c956c72da9716b4f09377611d48c61bc40375287**
- artifact : `mubawab-lot4-pilot-100`
- artifact ID : **9910872789**
- digest : `sha256:207dbaec3931fa17523c80829271ecc4427f37b02b496e10c01388f945d08ff3`

Artefact inspecté : `proof.json`, `manifest.json`, `checkpoint.json`, `errors.jsonl`, `listings.jsonl`, `discovery.json`.

Résultat :

- pages discovery demandées : **4**
- pages discovery réussies : **4**
- annonces uniques découvertes : **124**
- candidats contrôlés : **100**
- détails fetchés : **100**
- normalisées : **100**
- rejetées : **0**
- erreurs : **0**
- doublons : **0**
- source IDs uniques dans `listings.jsonl` : **100 / 100**
- première passe : **25**
- reprise checkpoint : **oui**
- `checkpoint_next_index = 100`
- transactions explicites détail : **86**
- transactions contextuelles : **14**
- transactions manquantes : **0**
- transactions finales : **98 sale / 2 rent**
- périodes incohérentes transaction/prix : **0**
- `database_writes = 0`
- `image_downloads = 0`
- `mass_ingestion = false`

### Route mismatches explicitement mesurés

`route_mismatch_count = 2`.

Les deux annonces étaient découvertes dans `apartment_sale`, mais leur détail prouve explicitement une location. Le détail prévaut correctement sur la route de discovery :

1. **8399856** — détail `rent`, prix **7 000 MAD / month** ; titre/description explicites `À louer` / `Je mets en location`.
2. **8391927** — détail `rent`, prix **8 000 MAD / month** ; description explicite `pour location longue durée`.

Ce second cas a permis de détecter puis corriger un faux fallback contextuel qui l'avait précédemment classé `sale`. Un test de régression couvre désormais `location longue durée`.

### Provenance transactionnelle

Ordre de vérité :

1. transaction explicite du détail ;
2. sinon seulement, contexte contrôlé de discovery + prix numérique non périodique ;
3. provenance enregistrée dans `raw.transaction_evidence` avec `confidence = explicit | contextual`.

Le fallback contextuel n'écrase jamais une transaction explicite contradictoire du détail.

## Lot 3 non régressé après les correctifs

Workflow : `Data Ingestion Lot 3 Extractor Gate`

- run : **#43**
- run ID : **33800379927**
- `test-extractor` : SUCCESS
- `live-proof` : SUCCESS
- `sample-20` : SUCCESS

Les régressions couvrent notamment :

- transaction après le 700e caractère de description ;
- `Vend appartement...` comme vente explicite ;
- `location longue durée` comme location explicite ;
- absence de contamination par recommandations ;
- priorité du détail sur le contexte de discovery.

## Conclusion Lot 4

Le minimum canonique de **100 annonces** est atteint avec preuve de pagination, reprise checkpoint, qualité, provenance transactionnelle, incohérences route/détail mesurées et protections source.

**Lot 4 est CLOSED.**

## Interdictions inchangées

- aucune DB production
- aucune ingestion AkarFinder
- aucune collecte massive hors périmètre contrôlé
- aucun contournement anti-bot
- aucun merge automatique
- aucun déploiement Vercel

## Next exact

Passer au Lot 5 : idempotence / clé source / déduplication, toujours sans écriture production. Avant merge final de la PR #996, Lot 1 devra aussi être ré-audité séparément.
