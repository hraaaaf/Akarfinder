# HANDOVER — AkarFinder Data Ingestion / Lot 7

Date: 2026-09-04

## Boussole canonique

**Fichier canonique principal à lire en premier :**

`data-ingestion/canonical.md`

Ce fichier est la boussole d’architecture du chantier Data Ingestion. Il verrouille notamment :

- pipeline source-agnostique ;
- séparation portail / agence directe / partenaire ;
- provenance obligatoire ;
- purge indépendante par source ;
- déduplication / lifecycle ;
- règles de sécurité ;
- roadmap par lots.

Attention : certaines lignes de statut historiques dans sa roadmap sont anciennes. Pour l’état opérationnel courant, utiliser ce `HANDOVER.md` + les preuves CI exactes ci-dessous.

## Canonique visuel à ne pas perdre

Pour tout rendu Search sans photo / public indexed :

`AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md`

Ce fichier verrouille le système visuel approuvé par type de bien :

- Appartement : bleu azur ;
- Villa : vert émeraude ;
- Terrain : orange terre ;
- Bureau : violet ;
- Local commercial : turquoise ;
- Riad : or chaleureux.

Le système avait été certifié 10/10 sur le scope Search puis 9.8/10 en LIVE.

## Repo / branche / PR

- Repo : `hraaaaf/Akarfinder`
- Branche : `feat/data-ingestion-canonical`
- PR : `#996`
- PR : OPEN / DRAFT / non mergée
- Aucun déploiement Vercel autorisé dans ce chantier
- Aucun write production autorisé
- Ne jamais toucher à la SQLite historique `scripts/scrapers/output/akarfinder.db`

HEAD au moment du handover :

`10ecf3b36afdcbf68b84857ddc8f153cd3ab2610`

Commit : `lot7: enable indexed visual publication lane in proof`

## Architecture verrouillée

Pipeline :

`Discovery → extraction → Collection Listing Contract → validation → adapter → CanonicalPropertyV1 / CanonicalOfferV1 / MediaAssetV1 → ingestion contrôlée AkarFinder`

Les données portail et les données directes/partenaires restent indépendantes.

Une purge Mubawab ne doit jamais supprimer une annonce `agency_direct` ou `partner_feed` représentant le même bien.

`data-ingestion/schema/listing.schema.json` est le Collection/Input Contract, pas un second modèle canonique applicatif.

## Lots

- Lot 1 : GREEN
- Lot 2 : CLOSED
- Lot 3 : CLOSED
- Lot 4 : CLOSED
- Lot 5 : CLOSED
- Lot 6 : CLOSED pour crawl/transaction ; mismatch taxonomique historique séparé
- Lot 7 : fonctionnellement très avancé ; closeout visuel en cours

## Lot 7 — preuves fonctionnelles

Les gates principaux ont déjà prouvé :

- sandbox 20 / 100 / 1000 ;
- vraie lecture SQLite AkarFinder ;
- ranking ;
- lifecycle ;
- API routing ;
- SSR Search ;
- idempotence ;
- deactivation ;
- purge source ;
- survie direct/partner.

Le bug de purge a été corrigé :

- `source_type` explicite est conservé ;
- `listing_sources.source_type` est persisté ;
- `purgePortalSource()` cible `source_type='portal'` ;
- `origin_type='unknown'` n’est plus utilisé comme proxy de portail ;
- witnesses `agency_direct` et `partner_feed` survivent.

## Incident visuel découvert

Premier artefact navigateur obtenu :

- run : `33876482782` ✅ SUCCESS
- artifact : `9938075383`
- digest : `sha256:9e5c16b11ac16b1bf3233777d8e8c0f4436a88d79d779898027b8da179a8ee86`

Ce run prouvait bien :

Collection → adapter → SQLite isolée → vrai Search Next → Chromium → screenshots.

Mais inspection humaine : **visuels hors cible** par rapport au système premium approuvé par type de bien.

Cause identifiée :

`SearchListingCardDark.tsx` n’utilise `IndexedPropertyTypeArtwork` que lorsque :

`shouldUseIndexedTransactionArtwork(listing) === true`

et cette politique retourne true uniquement lorsque :

`getSearchCommercialTier(listing) === 'public_indexed'`

Le premier proof passait par une lane qui tombait sur le fallback/contextual/generic au lieu de la voie `public_indexed`, d’où les images qui ne ressemblaient pas aux assets Appartement/Villa/Terrain/Riad validés.

## Correctif visuel actuel

Le workflow de preuve visuelle a été rendu réellement exécutable :

- correction du mauvais usage de `${{ runner.temp }}` au niveau `job.env` ;
- utilisation de `$RUNNER_TEMP` via `$GITHUB_ENV` ;
- trigger push temporaire de branche pour forcer la preuve ;
- publication lane indexed explicitement activée dans le proof avec :
  `PERSISTED_OPENSERP_LISTINGS_ENABLED=true` ;
- capture script doit maintenant vérifier le vrai indexed artwork.

HEAD actuel :

`10ecf3b36afdcbf68b84857ddc8f153cd3ab2610`

NOUVELLE preuve :

- workflow : `Data Ingestion Lot 7 Visual Proof`
- run : `33877438332` ✅ SUCCESS
- job : `visual-proof` ✅ SUCCESS
- step `Seed isolated Lot 7 indexed visual SQLite` ✅
- step `Capture and assert real indexed Search artwork` ✅
- step `Upload visual proof` ✅
- artifact : `9938461473`
- size : `1,176,379 bytes`
- digest : `sha256:08b2c8f3679c22e4c3c02075b29d1f26276b460664aac7c0832ccd7da9746ee9`

Cet artefact **supersède l’ancien artefact visuel `9938075383` pour la validation visuelle finale**.

## NEXT EXACT — à faire en premier dans la nouvelle fenêtre

1. Télécharger l’artifact `9938461473` du run `33877438332`.
2. Montrer les captures desktop 1440 et mobile 390 au user.
3. Les comparer humainement au canonique :
   `AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md`.
4. Vérifier en particulier que la Villa affiche bien le langage premium vert du système par type de bien, et non le fallback générique/contextuel.
5. Ne déclarer le Lot 7 visuellement CLOSED qu’après cette inspection humaine.
6. Si conforme, enregistrer la preuve finale dans la boussole/statut Lot 7.
7. Ensuite nettoyer les triggers `push` temporaires ajoutés pendant le debugging visual-proof, sans merge ni déploiement.

## Important

Ne pas confondre :

- preuve technique navigateur ;
- conformité au système visuel approuvé.

Le premier artefact avait la première mais pas la seconde.

Le nouveau run `33877438332` affirme techniquement la voie indexed et est GREEN, mais **la validation humaine des PNG reste le gate final**.

## Sécurité

- pas de merge sans autorisation explicite ;
- pas de Vercel sans autorisation explicite ;
- pas de prod DB write ;
- sandbox SQLite uniquement ;
- CI en cours ne bloque pas les autres actions sûres ;
- toute capture présentée comme preuve doit venir du vrai navigateur Playwright, jamais d’un mockup.
