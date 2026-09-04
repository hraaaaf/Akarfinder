# HANDOVER — AkarFinder Data Ingestion

Date: 2026-09-04

## Boussole canonique

Lire dans cet ordre :

1. `data-ingestion/canonical.md` — architecture / roadmap canonique ;
2. `data-ingestion/HANDOVER.md` — état opérationnel courant ;
3. `data-ingestion/LOT8_STATUS.md` — chantier opérationnel courant ;
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
- Lot 8 : 🟡 OPEN — controlled massive ingestion implementation landed; proof pending
- Lot 9 : ⚪ À FAIRE

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

## Lot 8 — chantier courant

Goal canonique : rendre possible une ingestion large depuis un dataset validé avec rollback et contrôle opérationnel.

Première implémentation volontairement bornée à une SQLite isolée dans le répertoire temporaire de l’OS :

- `data-ingestion/controlled-ingestion.ts` ;
- `scripts/scrapers/__tests__/data-ingestion-lot8-controlled-massive.test.ts` ;
- `.github/workflows/data-ingestion-lot8-controlled-massive.yml` ;
- `data-ingestion/LOT8_STATUS.md`.

Capacités actuellement implémentées :

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

La preuve dédiée couvre 2 500 annonces en batchs de 500, ré-ingestion idempotente, arrêt/reprise, rollback sur erreur en milieu de batch et purge sélective.

## Sécurité inchangée

- pas de merge sans autorisation explicite ;
- pas de Vercel sans autorisation explicite ;
- pas de prod DB write ;
- sandbox SQLite uniquement ;
- CI en cours ne bloque pas les autres actions sûres ;
- toute capture présentée comme preuve doit venir du vrai navigateur Playwright, jamais d’un mockup.

## NEXT EXACT

1. Obtenir le run du workflow `Data Ingestion Lot 8 Controlled Massive Gate` sur le HEAD exact.
2. Vérifier la régression Lot 7 1 000 annonces.
3. Vérifier le test Lot 8 : 2 500 annonces / batching / idempotence / stop-resume / rollback / purge sélective.
4. Si GREEN, enregistrer run + preuves dans `data-ingestion/LOT8_STATUS.md`.
5. Seulement alors décider si Lot 8 peut être CLOSED sur le scope isolé.
6. Garder PR `#996` OPEN / DRAFT / non mergée et ne rien déployer sans autorisation explicite.

**Handover Lot 7 : CLOSED ✅**
**Lot 8 : OPEN — proof pending 🟡**
