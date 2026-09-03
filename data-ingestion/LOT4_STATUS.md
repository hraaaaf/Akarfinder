# Lot 4 Status

**Status: 🟡 OPEN — controlled rehearsal proven; canonical 100–500 pilot still required**

## Goal

Valider le comportement du crawl pilote Mubawab sur un périmètre volontairement limité avant tout volume canonique 100–500 et avant toute ingestion AkarFinder.

## Lot 4A rehearsal

Périmètre strict :

- source : Mubawab
- ville : Casablanca
- catégorie de discovery : `apartment_sale`
- pages de discovery max : 2
- détails max : 40
- délai inter-requêtes détail : 750 ms
- première passe : 15 détails max
- deuxième passe : reprise depuis checkpoint

## Preuve finale contrôlée

Workflow : `Data Ingestion Lot 4 Controlled Rehearsal`

- run : **#12**
- run ID : **33799055629**
- head SHA : **78927affe95a2bbb15e50bdc4363cb957366cade**
- artifact : `mubawab-lot4-controlled-rehearsal`
- artifact ID : **9910362535**
- digest : `sha256:37662c920312d3c5c280419190ab23d152527f054b31ae669f4219725dae98b7`

Résultat inspecté dans `proof.json`, `manifest.json`, `checkpoint.json`, `errors.jsonl` et `listings.jsonl` :

- pages découvertes : **2**
- pages traitées : **2**
- annonces découvertes : **62**
- candidats plafonnés : **40**
- détails fetchés : **40**
- normalisées : **40**
- rejetées : **0**
- doublons : **0**
- erreurs : **0**
- première passe : **15**
- reprise checkpoint observée : **oui**
- `checkpoint_next_index = 40`
- transactions explicites dans le détail : **39**
- transactions contextuelles : **1**
- transactions manquantes : **0**
- `database_writes = 0`
- `image_downloads = 0`
- `mass_ingestion = false`

### Provenance transactionnelle

La transaction du détail reste prioritaire.

Quand le détail ne contient aucun signal transactionnel explicite, le rehearsal peut confirmer `sale` uniquement avec le contexte contrôlé `apartment_sale` **et** un prix numérique non périodique. Cette inférence est enregistrée séparément dans `raw.transaction_evidence` avec `confidence = contextual`; elle n'est jamais présentée comme une lecture explicite du détail.

Sur la preuve finale, une seule annonce utilise ce fallback contextuel : **source ID 8278761**.

Le cas `8399780` a permis d'identifier une limite réelle : le signal `Vente pour cause d'achat plus grand` se trouvait après le 700e caractère de la description. L'extracteur lit désormais toute la description principale pour les signaux transactionnels. Un test de régression dédié couvre explicitement un signal situé après 700 caractères.

## Lot 3 non régressé

Workflow : `Data Ingestion Lot 3 Extractor Gate`

- run : **#32**
- run ID : **33799055555**
- `test-extractor` : SUCCESS
- `live-proof` : SUCCESS
- `sample-20` : SUCCESS

Le test-extractor inclut désormais :

- `mubawab-extractor-v3.test.ts`
- `mubawab-extractor-long-description.test.ts`

## Ce que ce rehearsal prouve

- pagination > 1 page
- compteurs discovery cohérents
- doublons mesurés
- checkpoint persistant
- reprise sans refetch des source IDs déjà traités
- erreurs et rejets auditables
- arrêt prévu sur robots disallow / 403 / 429
- extraction vers `CollectionListing`
- provenance explicite vs contextuelle conservée
- zéro écriture DB
- zéro téléchargement image
- zéro ingestion massive

## Limite volontaire

Ce rehearsal à 40 détails maximum **ne ferme pas Lot 4**.

Le prochain gate canonique reste un pilote contrôlé **100–500**. Le point de départ recommandé est **100 annonces**, avec les mêmes protections : délai inter-requêtes, checkpoint, arrêt 403/429/robots, provenance transactionnelle, zéro écriture AkarFinder.

## Interdictions inchangées

- aucune DB production
- aucune ingestion AkarFinder
- aucune collecte massive
- aucun contournement anti-bot
- aucun merge automatique
- aucun déploiement Vercel
