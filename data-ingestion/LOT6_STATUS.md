# Lot 6 Status

**Status: 🟡 OPEN — shakedown mechanics proven; semantic hardening required before expansion**

## Goal

Produire un dataset Mubawab large, chunké, reprenable et auditable sans l'injecter dans AkarFinder.

## Lot 6A — shakedown contrôlé

Périmètre :

- villes : Casablanca, Rabat ;
- catégories : `apartment_sale`, `apartment_rent` ;
- 2 pages discovery par combinaison ;
- 200 détails max ;
- chunks JSONL de 50 ;
- première passe 50 puis reprise ;
- délai 750 ms ;
- zéro DB write / image download / ingestion AkarFinder.

### Preuve mécanique

Workflow : `Data Ingestion Lot 6 Shakedown`

- run : **#2**
- run ID : **33801636244**
- head SHA : **2b0b00e3bae404b42e98bf70399622142cf86513**
- artifact : `mubawab-lot6-shakedown`
- artifact ID : **9911415210**
- digest : `sha256:801861f08d9b48512851d1a677a4f4b5b67ec7d52dd20438decde17f27fea50b`

Résultat inspecté :

- pages discovery : **8/8** ;
- annonces uniques découvertes : **254** ;
- candidats traités : **200** ;
- écrites : **200** ;
- source IDs uniques : **200/200** ;
- chunks : **4 × 50** ;
- première passe : **50** ;
- checkpoint final : **200** ;
- reprise observée : **oui** ;
- normalisées : **199** ;
- rejetées : **1** ;
- erreurs réseau : **0** ;
- doublons écrits : **0** ;
- transactions explicites : **180** ;
- contextuelles : **19** ;
- manquantes : **1** ;
- route/detail mismatches : **3** ;
- context conflicts observés dans les 200 écrites : **0** ;
- `database_writes = 0` ;
- `production_writes = 0` ;
- `image_downloads = 0` ;
- `akar_ingestion = false`.

### Couverture discovery

- Casablanca / sale : **62** uniques ;
- Casablanca / rent : **64** uniques ;
- Rabat / sale : **64** uniques ;
- Rabat / rent : **64** uniques.

Le détail des 200 candidats n'est pas encore équilibré par scope : **126 Casablanca / 74 Rabat**. Cette exécution prouve donc le moteur de crawl/chunk/reprise, pas encore une couverture finale représentative.

## Findings sémantiques bloquants avant élargissement

### 1. Prix vente contextuel aberrant

`8407358` a été découvert dans `Rabat apartment_sale` avec un prix **6 300 MAD** et aucun signal transactionnel explicite. Le fallback l'a classé `sale`.

Ce classement n'est pas acceptable : un prix contextuel manifestement incompatible avec une vente d'appartement doit rester `transaction=null` plutôt que fabriquer une vente.

Garde-fou ajouté : `data-ingestion/transaction-context.ts` + tests. Pour un appartement, un fallback `sale` inférieur à **100 000 MAD** est refusé.

### 2. Prix marocain en millions de centimes

`8406807` contient dans sa description : prix 180 millions, prix actuel 170 millions. L'extracteur n'a pas normalisé ce prix et l'annonce est restée `transaction_missing` / prix non normalisé.

La formulation est désormais détectable via `hasMoroccanCentimeMillionPriceLanguage()` pour traitement local ultérieur. Aucune conversion automatique naïve vers 170 000 000 MAD n'est autorisée.

### 3. Route vente contenant des locations

Trois annonces découvertes en `apartment_sale` sont explicitement `rent` dans le détail et sont correctement conservées comme location :

- `8399856` ;
- `8391927` ;
- `8371385` — 25 000 MAD/mois, description `propose à la location`.

Le détail reste prioritaire sur la route discovery.

## Garde-fous ajoutés

- `data-ingestion/transaction-context.ts`
- `scripts/scrapers/__tests__/data-ingestion-transaction-context.test.ts`
- CI Lot 6 exécute ces tests avant le crawl.

Règles :

- contexte sale/rent contradictoire → aucune inférence ;
- prix numérique absent → aucune inférence ;
- appartement sale contextuel < 100 000 MAD → refus ;
- appartement rent contextuel > 100 000 MAD → refus ;
- langage `prix ... N millions` signalé pour revue de normalisation centimes.

## Conclusion Lot 6A

**Mécanique : ✅ PROUVÉE.**

**Sémantique pour élargissement : 🟡 À DURCIR.**

Le shakedown ne ferme pas Lot 6 et ne justifie pas encore un crawl complet.

## Next exact

1. intégrer `transaction-context.ts` au prochain runner large ;
2. équilibrer la sélection de détails par scope ;
3. revalider les contextual transactions ;
4. seulement ensuite élargir villes / catégories.

## Interdictions inchangées

- zéro write production
- zéro ingestion AkarFinder
- zéro contournement anti-bot
- aucun merge automatique
- aucun déploiement Vercel
