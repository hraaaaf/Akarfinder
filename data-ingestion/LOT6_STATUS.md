# Lot 6 Status

**Status: ✅ CLOSED — multi-type guarded crawl proven, zero unresolved rejection**

## Goal

Produire un dataset Mubawab large, chunké, reprenable et auditable sans l'injecter dans AkarFinder.

## Proof chain

### Lot 6A — shakedown mécanique

- workflow: `Data Ingestion Lot 6 Shakedown`
- run ID: `33801636244`
- head SHA: `2b0b00e3bae404b42e98bf70399622142cf86513`
- artifact ID: `9911415210`
- 200 détails traités, 4 chunks × 50, checkpoint/reprise prouvés
- 199 normalisées / 1 rejetée
- zéro erreur réseau / doublon / write DB / ingestion AkarFinder

Ce run a révélé les risques transactionnels qui ont conduit aux garde-fous contextuels.

### Lot 6B — balanced guarded crawl 200

- workflow: `Data Ingestion Lot 6 Balanced Crawl`
- run ID: `33803042568`
- head SHA: `ec828867e1e81ce2007251f16bc6397eba5ebc0f`
- artifact ID: `9911938970`
- digest: `sha256:e6b8f07bd47a11303a54214236c4eba3284d85bd6eb65d7ae791706b65ea834d`
- 200 candidats, 4 scopes équilibrés Casablanca/Rabat × appartement sale/rent
- 199 normalisées / 1 rejet volontaire (`8407358`, 6 300 MAD sur route sale sans preuve explicite)
- zéro erreur réseau / doublon / write DB / ingestion AkarFinder

### Lot 6C — multi-type guarded crawl final

- workflow: `Data Ingestion Lot 6 Multi-Type Crawl`
- run: **#17**
- run ID: **33810596251**
- head SHA: **6263ea26b50d77133c55194e230f9d14a889c99f**
- artifact: `mubawab-lot6-multitype`
- artifact ID: **9914877485**
- digest: **sha256:bea270cffda9bcb7173699ef6e1f0af072d10e0961d0130f7b31686b839ff38e**

Couverture ciblée:

- Casablanca + Rabat
- `apartment_sale`, `apartment_rent`
- `villa_sale`, `villa_rent`
- `house_sale`, `house_rent`
- `commercial_sale`, `commercial_rent`
- `land_sale`

Résultat final inspecté:

- annonces traitées: **268**
- normalisées: **268**
- rejetées: **0**
- erreurs réseau: **0**
- doublons écrits: **0**
- transactions explicites: **226**
- transactions contextuelles: **41**
- override humain: **1** (`8408402` = rent)
- transactions manquantes: **0**
- `rejection-review.json`: **0 rejet**
- `database_writes = 0`
- `production_writes = 0`
- `akar_ingestion = false`

## Garde-fous verrouillés

- détail explicite prioritaire sur discovery
- contexte discovery contradictoire → aucune inférence
- prix absent / `on_request` → aucune inférence automatique
- prix de vente contextuel < 100 000 MAD → refus
- prix de location contextuel > 100 000 MAD → refus
- calibration contextuelle pour appartement, villa, maison et commercial
- terrain: sale calibré, rent non calibré donc refusé
- URLs Mubawab: toujours URL canonique découverte, jamais reconstruite depuis l'ID
- override humain explicite conservé pour `8408402`
- toute vraie ambiguïté future reste reviewable, sans fabrication de transaction

## Conclusion

**Lot 6 = CLOSED.**

La mécanique chunk/checkpoint/reprise, la couverture multi-types ciblée, les transactions explicites/contextuelles, le rapport de rejets et les interdictions de write production sont tous prouvés.

## Next exact

Avant Lot 7 sandbox, terminer le re-audit Lot 1 de l'adapter Collection Listing → Property Schema V1, notamment:

- interdire `transaction = null` au lieu de la convertir implicitement en `sale`;
- revalider la provenance `agency_direct` face aux enums actuels du Property Schema;
- exécuter le gate contrat Lot 1.

## Interdictions inchangées

- zéro write production
- zéro ingestion AkarFinder production
- zéro contournement anti-bot
- aucun merge automatique
- aucun déploiement Vercel
