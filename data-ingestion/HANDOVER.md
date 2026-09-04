# HANDOVER — AkarFinder Data Ingestion

Date: 2026-09-04

## Boussole canonique

Lire dans cet ordre :

1. `data-ingestion/canonical.md` — architecture / roadmap canonique ;
2. `data-ingestion/HANDOVER.md` — état opérationnel courant ;
3. `data-ingestion/LOT8_STATUS.md` — closeout détaillé Lot 8 ;
4. `data-ingestion/LOT7_STATUS.md` — closeout détaillé Lot 7 ;
5. `AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md` — canonique visuel Search par type de bien.

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
- Lot 8 : ✅ CLOSED — controlled massive ingestion proof GREEN
- Lot 9 : 🟡 NEXT — industrialisation multi-source

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

La preuve corrigée qui fait foi est :

- workflow : `Data Ingestion Lot 7 Visual Proof` ;
- run : `33877438332` ✅ SUCCESS ;
- HEAD produit prouvé : `10ecf3b36afdcbf68b84857ddc8f153cd3ab2610` ;
- artifact : `9938461473` ;
- digest : `sha256:08b2c8f3679c22e4c3c02075b29d1f26276b460664aac7c0832ccd7da9746ee9`.

Comparaison au canonique visuel : **CONFORME**.

Le trigger `push` temporaire du workflow visual-proof a été supprimé ; le workflow conserve `pull_request` + `workflow_dispatch` uniquement.

## Lot 8 — CLOSED

Goal canonique : rendre possible une ingestion large depuis un dataset validé avec rollback et contrôle opérationnel.

Implémentation bornée à une SQLite isolée dans le répertoire temporaire de l’OS :

- `data-ingestion/controlled-ingestion.ts` ;
- `scripts/scrapers/__tests__/data-ingestion-lot8-controlled-massive.test.ts` ;
- `.github/workflows/data-ingestion-lot8-controlled-massive.yml` ;
- `data-ingestion/LOT8_STATUS.md`.

Capacités prouvées :

- ingestion par batch ;
- métriques inserted/updated/batchs commités ;
- idempotence ;
- checkpoint `next_batch` ;
- reprise déterministe via `startBatch` ;
- kill-switch entre batchs ;
- rollback du batch courant via snapshot pré-batch ;
- purge source sélective ;
- survie des sources `agency_direct` / `partner_feed` ;
- refus de toute SQLite hors répertoire temporaire.

### Preuve finale Lot 8

- workflow : `Data Ingestion Lot 8 Controlled Massive Gate` ;
- run : `33879281908` ✅ SUCCESS ;
- HEAD exact prouvé : `979c7f57e46f5eb39c6d0a552fe78b635185e634` ;
- job : `controlled-massive` ;
- job id : `101043688350`.

Régression Lot 7 : 1/1 GREEN.

Lot 8 : 4/4 GREEN, couvrant :

- 2 500 annonces ;
- batching ;
- ré-ingestion idempotente ;
- stop/resume par checkpoint ;
- rollback après erreur mid-batch ;
- purge `portal` sélective ;
- protection `agency_direct` / `partner_feed` ;
- refus d’un chemin SQLite non isolé.

**Décision : Lot 8 CLOSED sur le scope sandbox / ingestion contrôlée.**

Cette fermeture n’autorise aucun write production, merge ou déploiement.

## Lot 9 — chantier suivant

Goal canonique : réutiliser le moteur pour une seconde source sans réécrire le cœur AkarFinder.

Architecture cible :

`MubawabAdapter / SecondSourceAdapter / AgencyFeedAdapter / PartnerFeedAdapter → CanonicalListing → AkarFinder ingestion pipeline`

Le critère déterminant est architectural : une seconde source doit produire un objet canonique valide puis traverser le même pipeline existant, sans branche spécifique injectée dans le cœur de recherche ou d’ingestion.

## Sécurité inchangée

- pas de merge sans autorisation explicite ;
- pas de Vercel sans autorisation explicite ;
- pas de prod DB write ;
- sandbox SQLite uniquement ;
- CI en cours ne bloque pas les autres actions sûres ;
- toute capture présentée comme preuve doit venir du vrai navigateur Playwright, jamais d’un mockup.

## NEXT EXACT

1. Ouvrir le Lot 9 comme chantier multi-source.
2. Choisir une seconde source de preuve qui minimise le risque légal/opérationnel et maximise la valeur architecturale.
3. Implémenter uniquement les briques spécifiques à cette source : Discovery / Extractor / mapping / fixtures / fraîcheur-purge.
4. Faire passer cette seconde source dans le même Collection Contract, le même adapter canonique et la même ingestion contrôlée.
5. Prouver qu’aucune modification structurelle du cœur canonique n’est nécessaire.
6. Garder PR `#996` OPEN / DRAFT / non mergée et ne rien déployer sans autorisation explicite.

**Handover Lot 7 : CLOSED ✅**
**Handover Lot 8 : CLOSED ✅**
**Lot 9 : NEXT 🟡**
