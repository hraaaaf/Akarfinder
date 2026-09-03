# Lot 4 Status

**Status: 🟡 OPEN — controlled rehearsal proven; canonical pilot 100 launched**

## Goal

Valider le comportement du crawl pilote Mubawab sur un périmètre volontairement limité avant toute ingestion AkarFinder.

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

Résultat inspecté :

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

La transaction du détail reste prioritaire. Quand le détail ne contient aucun signal transactionnel explicite, le pipeline peut confirmer `sale` uniquement avec le contexte contrôlé `apartment_sale` **et** un prix numérique non périodique. Cette inférence est enregistrée séparément dans `raw.transaction_evidence` avec `confidence = contextual`.

Sur la preuve rehearsal finale, une seule annonce utilise ce fallback contextuel : **source ID 8278761**.

Le cas `8399780` a exposé une limite réelle : le signal `Vente pour cause d'achat plus grand` se trouvait après le 700e caractère. L'extracteur lit désormais toute la description principale, et un test de régression dédié couvre ce cas.

## Lot 3 non régressé

Workflow : `Data Ingestion Lot 3 Extractor Gate`

- run : **#32**
- run ID : **33799055555**
- `test-extractor` : SUCCESS
- `live-proof` : SUCCESS
- `sample-20` : SUCCESS

## Lot 4B — canonical pilot 100

Runner : `scripts/mubawab-pilot-100.ts`

Gate : `Data Ingestion Lot 4 Pilot 100`

Périmètre :

- source : Mubawab
- ville : Casablanca
- catégorie : `apartment_sale`
- pages discovery max : **4**
- détails : **100 exactement**
- première passe : **25**
- reprise checkpoint jusqu'à **100**
- délai inter-requêtes : **750 ms**
- arrêt immédiat sur robots disallow / HTTP 403 / HTTP 429
- mesure des mismatches route/detail
- provenance transactionnelle explicite vs contextuelle
- zéro écriture DB
- zéro téléchargement image
- zéro ingestion AkarFinder

**État : lancé — preuve CI à inspecter avant toute clôture.**

## Interdictions inchangées

- aucune DB production
- aucune ingestion AkarFinder
- aucune collecte massive hors périmètre contrôlé
- aucun contournement anti-bot
- aucun merge automatique
- aucun déploiement Vercel
