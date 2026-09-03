# Lot 6 Status

**Status: 🟡 OPEN — balanced 200 proof passed; broader coverage remains**

## Goal

Produire un dataset Mubawab large, chunké, reprenable et auditable sans l'injecter dans AkarFinder.

## Lot 6A — shakedown mécanique

Workflow : `Data Ingestion Lot 6 Shakedown`

- run ID : `33801636244`
- head SHA : `2b0b00e3bae404b42e98bf70399622142cf86513`
- artifact ID : `9911415210`
- 200 détails traités, 4 chunks × 50, checkpoint/reprise prouvés
- 199 normalisées / 1 rejetée
- zéro erreur réseau / doublon / write DB / ingestion AkarFinder

Ce run a révélé les risques sémantiques suivants : prix vente contextuel aberrant, langage marocain en millions de centimes, et annonces location présentes sur routes vente.

## Garde-fous sémantiques

`data-ingestion/transaction-context.ts` impose :

- contexte contradictoire → aucune inférence ;
- prix numérique absent → aucune inférence ;
- appartement `sale` contextuel < 100 000 MAD → refus ;
- appartement `rent` contextuel > 100 000 MAD → refus ;
- langage `prix ... N millions` signalé pour revue centimes ;
- détail explicite prioritaire sur discovery.

## Lot 6B — balanced guarded crawl 200

Workflow : `Data Ingestion Lot 6 Balanced Crawl`

### Preuve autoritative

- run : **#1**
- run ID : **33803042568**
- head SHA : **ec828867e1e81ce2007251f16bc6397eba5ebc0f**
- artifact : `mubawab-lot6-balanced`
- artifact ID : **9911938970**
- digest : `sha256:e6b8f07bd47a11303a54214236c4eba3284d85bd6eb65d7ae791706b65ea834d`

### Couverture équilibrée

- Casablanca / `apartment_sale` : **50** candidats
- Casablanca / `apartment_rent` : **50** candidats
- Rabat / `apartment_sale` : **50** candidats
- Rabat / `apartment_rent` : **50** candidats

Discovery : **8/8 pages**, **254** annonces uniques découvertes.

### Résultat inspecté

- candidats : **200**
- détails fetchés : **200**
- source IDs uniques : **200/200**
- chunks : **4 × 50**
- première passe : **50**
- checkpoint final : **200**
- reprise observée : **oui**
- normalisées : **199**
- rejetées : **1**
- erreurs réseau : **0**
- doublons écrits : **0**
- transactions explicites : **173**
- contextuelles : **26**
- manquantes : **1**
- transactions finales : **98 sale / 101 rent / 1 missing**
- context conflicts : **0**
- route/detail mismatch : **1** (`8371385`, route sale mais détail rent)
- qualité moyenne : **97.75/100**
- langage millions de centimes signalé : **1**
- `database_writes = 0`
- `production_writes = 0`
- `image_downloads = 0`
- `akar_ingestion = false`

### Rejet volontaire validé

`8407358` — Rabat, découvert via `apartment_sale`, prix **6 300 MAD**, aucun signal transactionnel explicite.

Décision correcte :

- `transaction = null`
- warning `transaction_context_implausible_sale_price`
- aucune vente fabriquée depuis la route discovery.

Les **26** transactions contextuelles acceptées ont été inspectées : leurs prix restent cohérents avec leur contexte vente/location.

## Conclusion actuelle

- mécanique chunk/checkpoint/reprise : ✅
- équilibrage par scope : ✅
- garde-fous transactionnels : ✅
- dataset 200 auditable : ✅
- couverture large multi-types / multi-villes : ⏳

**Lot 6 reste OPEN** : le goal canonique demande encore une couverture élargie des catégories / villes / transactions ciblées avant fermeture.

## Next exact

Étendre prudemment le runner hors appartement à un périmètre multi-types, toujours hors production, avec sélection équilibrée et cap contrôlé :

- Casablanca + Rabat ;
- `apartment_sale`, `apartment_rent` ;
- `villa_sale`, `villa_rent` ;
- `house_sale`, `house_rent` ;
- `commercial_sale`, `commercial_rent` ;
- `land_sale` ;
- chunks/reprise/garde-fous identiques ;
- mesurer couverture et rejets avant toute extension à d'autres villes.

## Interdictions inchangées

- zéro write production
- zéro ingestion AkarFinder
- zéro contournement anti-bot
- aucun merge automatique
- aucun déploiement Vercel
