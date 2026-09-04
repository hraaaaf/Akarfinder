# HANDOVER — AkarFinder Data Ingestion

Date: 2026-09-04

## Boussole canonique

Lire dans cet ordre :

1. `data-ingestion/canonical.md` — architecture / roadmap canonique ;
2. `data-ingestion/HANDOVER.md` — état opérationnel courant ;
3. `AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md` — canonique visuel Search par type de bien ;
4. `data-ingestion/LOT7_STATUS.md` — closeout détaillé Lot 7.

Certaines lignes de statut historiques de `data-ingestion/canonical.md` peuvent être anciennes. Pour l’état opérationnel courant, ce HANDOVER + les fichiers `LOT*_STATUS.md` font foi.

## Canonique visuel verrouillé

Pour tout rendu Search sans photo / `public_indexed` :

- Appartement : bleu azur ;
- Villa : vert émeraude ;
- Terrain : orange terre ;
- Bureau : violet ;
- Local commercial : turquoise ;
- Riad : or chaleureux.

Le système visuel de référence reste celui certifié dans `AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md`.

## Repo / branche / PR

- Repo : `hraaaaf/Akarfinder`
- Branche : `feat/data-ingestion-canonical`
- PR : `#996`
- PR : OPEN / DRAFT / non mergée
- Aucun déploiement Vercel autorisé dans ce chantier
- Aucun write production autorisé
- Ne jamais toucher à la SQLite historique `scripts/scrapers/output/akarfinder.db`

## Architecture verrouillée

Pipeline :

`Discovery → extraction → Collection Listing Contract → validation → adapter → CanonicalPropertyV1 / CanonicalOfferV1 / MediaAssetV1 → ingestion contrôlée AkarFinder`

Les données portail et les données directes/partenaires restent indépendantes.

Une purge Mubawab ne doit jamais supprimer une annonce `agency_direct` ou `partner_feed` représentant le même bien.

`data-ingestion/schema/listing.schema.json` est le Collection/Input Contract, pas un second modèle canonique applicatif.

## Lots — état courant

- Lot 1 : GREEN
- Lot 2 : CLOSED
- Lot 3 : CLOSED
- Lot 4 : CLOSED
- Lot 5 : CLOSED
- Lot 6 : CLOSED pour crawl/transaction ; mismatch taxonomique historique séparé
- Lot 7 : ✅ CLOSED — functional + browser visual proof complete

## Lot 7 — closeout final

Les gates principaux ont prouvé :

- sandbox 20 / 100 / 1000 ;
- vraie lecture SQLite AkarFinder ;
- ranking ;
- lifecycle ;
- API routing ;
- SSR Search / Search page contract ;
- idempotence ;
- deactivation ;
- purge source ;
- survie direct/partner.

La purge est explicitement bornée par `source_type='portal'`. `origin_type='unknown'` n’est plus utilisé comme proxy de portail.

### Preuve navigateur finale

Le premier artefact `9938075383` avait prouvé le navigateur mais pas la conformité visuelle : la lane tombait sur un fallback générique/contextuel.

La preuve corrigée qui fait foi est :

- workflow : `Data Ingestion Lot 7 Visual Proof` ;
- run : `33877438332` ✅ SUCCESS ;
- HEAD produit prouvé : `10ecf3b36afdcbf68b84857ddc8f153cd3ab2610` ;
- artifact : `9938461473` ;
- size : `1,176,379 bytes` ;
- digest : `sha256:08b2c8f3679c22e4c3c02075b29d1f26276b460664aac7c0832ccd7da9746ee9` ;
- step `Seed isolated Lot 7 indexed visual SQLite` ✅ ;
- step `Capture and assert real indexed Search artwork` ✅ ;
- step `Upload visual proof` ✅.

Captures finales inspectées :

- `lot7-search-property-types-desktop-1440.png` ;
- `lot7-search-property-types-mobile-390.png` ;
- `lot7-search-apartment-desktop-1440.png` ;
- `lot7-search-apartment-mobile-390.png`.

### Inspection visuelle finale

Comparaison au canonique `AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md` : **CONFORME**.

- Villa : langage premium vert, pas fallback générique ✅ ;
- Appartement : bleu ✅ ;
- Terrain : orange ✅ ;
- Bureau : violet ✅ ;
- Local commercial : turquoise ✅ ;
- Riad : or ✅ ;
- hiérarchie de carte conservée ✅ ;
- mobile 390 sans overflow/collision bloquante observé ✅ ;
- desktop 1440 cohérent avec le canonique ✅.

Le détail du verdict est enregistré dans `data-ingestion/LOT7_STATUS.md`.

### Cleanup visual-proof

Le trigger `push` temporaire de `Data Ingestion Lot 7 Visual Proof` a été supprimé.

- commit cleanup : `4910066e7760354692d2a331b8bbdccca17f8d02` ;
- workflow conservé sur `pull_request` + `workflow_dispatch` uniquement.

Closeout Lot 7 enregistré dans :

- commit status : `35cbe50315aac5d6d1402a29515c631f3a31146c`.

## Sécurité inchangée

- pas de merge sans autorisation explicite ;
- pas de Vercel sans autorisation explicite ;
- pas de prod DB write ;
- sandbox SQLite uniquement ;
- CI en cours ne bloque pas les autres actions sûres ;
- toute capture présentée comme preuve doit venir du vrai navigateur Playwright, jamais d’un mockup.

## NEXT EXACT

Le Lot 7 est fermé. Ne plus retoucher son implémentation sans nouvelle régression prouvée.

Pour la suite du chantier Data Ingestion : repartir de `data-ingestion/canonical.md` et de l’état des lots, tout en gardant PR `#996` OPEN / DRAFT / non mergée jusqu’à une autorisation explicite de merge.

**Handover Lot 7 : CLOSED ✅**
