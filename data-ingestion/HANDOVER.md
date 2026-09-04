# HANDOVER — AkarFinder Data Ingestion

Date: 2026-09-04

## Boussole canonique

Lire dans cet ordre :

1. `data-ingestion/canonical.md` — architecture + roadmap canonique actuelle ;
2. `data-ingestion/HANDOVER.md` — état opérationnel courant ;
3. `data-ingestion/LOT9_STATUS.md` — chantier courant ;
4. `data-ingestion/LOT8_STATUS.md` — closeout Lot 8 ;
5. `data-ingestion/LOT7_STATUS.md` — closeout Lot 7 ;
6. `AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md` — canonique visuel Search.

## Goal produit actuel

Atteindre puis maintenir **≥ 100 000 annonces canoniques exploitables** dans AkarFinder.

Le seuil 100K se mesure après normalisation / déduplication, jamais sur le volume brut découvert.

Ordre stratégique verrouillé :

```text
Lots 1–8 CLOSED
      ↓
Lot 9  — Mubawab Full Coverage
      ↓
Lot 10 — Massive Dataset Certification
      ↓
Lot 11 — Massive AkarFinder Ingestion
      ↓
Lot 12 — Multi-source jusqu’à ≥100K
```

On ne passe pas prématurément à un second portail avant d’avoir mesuré le stock réel de la source pilote, sauf blocage documenté.

## Repo / branche / PR

- Repo : `hraaaaf/Akarfinder`
- Branche : `feat/data-ingestion-canonical`
- PR : `#996`
- PR : OPEN / DRAFT / non mergée
- aucun merge sans autorisation explicite ;
- aucun déploiement Vercel sans autorisation explicite ;
- aucun write production autorisé ;
- ne jamais toucher à `scripts/scrapers/output/akarfinder.db` pendant les preuves.

## Architecture verrouillée

```text
Discovery
→ extraction
→ Collection Listing Contract
→ validation
→ adapter
→ CanonicalPropertyV1 / CanonicalOfferV1 / MediaAssetV1
→ déduplication / lifecycle / provenance
→ ingestion contrôlée AkarFinder
```

Le modèle canonique applicatif reste `lib/property-schema/`.

`data-ingestion/schema/listing.schema.json` reste uniquement le Collection/Input Contract.

Les données portail et les données directes / partenaires sont indépendantes.

Une purge Mubawab ne doit jamais supprimer une annonce `agency_direct`, `partner_feed`, `owner_direct` ou autre provenance indépendante représentant éventuellement le même bien.

## Lots — état courant

- Lots 1–8 : ✅ CLOSED
- Lot 9 : 🟡 OPEN — Mubawab Full Coverage
- Lot 10 : ⚪ À FAIRE
- Lot 11 : ⚪ À FAIRE
- Lot 12 : ⚪ À FAIRE

## Preuves historiques de référence

### Lot 7

- workflow : `Data Ingestion Lot 7 Visual Proof` ;
- run : `33877438332` ✅ SUCCESS ;
- HEAD produit : `10ecf3b36afdcbf68b84857ddc8f153cd3ab2610` ;
- artifact : `9938461473` ;
- digest : `sha256:08b2c8f3679c22e4c3c02075b29d1f26276b460664aac7c0832ccd7da9746ee9`.

### Lot 8

- workflow : `Data Ingestion Lot 8 Controlled Massive Gate` ;
- run : `33879281908` ✅ SUCCESS ;
- HEAD produit : `979c7f57e46f5eb39c6d0a552fe78b635185e634` ;
- job : `controlled-massive` ;
- job id : `101043688350` ;
- régression Lot 7 : 1/1 GREEN ;
- Lot 8 : 4/4 GREEN.

## Canonique roadmap ≥100K

Le fichier `data-ingestion/canonical.md` a été réaligné au commit :

`6912915f4f6a5eb96ae3552f15c30397a2156c55`

Décision canonique :

> terminer la couverture Mubawab, mesurer le stock réel, certifier le dataset massif, l’ingérer de manière contrôlée, puis seulement ajouter les sources nécessaires pour atteindre ou dépasser 100K.

## Lot 9 — étape 1 planner ✅ CERTIFIED

Fichier : `data-ingestion/sources/mubawab/full-coverage.ts`.

Config actuelle :

- 12 villes ;
- 11 catégories activées ;
- 132 scopes `ville × catégorie`.

Scheduler :

```text
1–25 → 26–50 → 51–75 → ...
```

La fenêtre suivante est créée uniquement après `window_exhausted`.

Un scope s’arrête sur `zero_new_unique_ids` ou stop sécurité explicite.

Preuve :

- workflow initial : `Data Ingestion Lot 9 Full Coverage Planner Gate` ;
- run : `33881976620` ✅ SUCCESS ;
- job : `full-coverage-planner` ;
- job id : `101052543906` ;
- HEAD produit prouvé : `1f9f0ae095fd28b9821008dd33dfb83e120ff5b4`.

## Lot 9 — étape 2 bounded runner 🟡

Implémentation :

- `data-ingestion/sources/mubawab/full-coverage-runner.ts` ;
- `scripts/scrapers/__tests__/data-ingestion-lot9-full-coverage-runner.test.ts` ;
- `.github/workflows/data-ingestion-lot9-full-coverage.yml`.

Le runner :

- traite une vague bornée par `maxPartitions` ;
- maintient la déduplication globale des `source_id` ;
- checkpoint après chaque page ;
- arrête un scope sur zéro nouvel ID unique ;
- classe robots / 403-429 comme stops sécurité ;
- conserve les autres erreurs en `failed` ;
- honore le kill-switch ;
- génère la partition suivante uniquement après épuisement normal de la fenêtre ;
- ne fait aucun write DB dans cette preuve.

Gate courant :

- workflow : `Data Ingestion Lot 9 Full Coverage Gate` ;
- run : `33882260391` ;
- HEAD produit : `83526761f40b68429349b2513c2d96862bf0de4a` ;
- état au dernier contrôle : `queued` ;
- job : `full-coverage`.

Le gate exécute : Discovery regression + planner + bounded runner.

## Sécurité live héritée du Lot 6

Toute future collecte live :

- passe par contrôle robots ;
- stoppe sur blocage explicite 403 / 429 ;
- n’essaie jamais de contourner CAPTCHA, authentification ou contrôle d’accès ;
- reste hors production ;
- produit manifests / checkpoints reproductibles.

## NEXT EXACT

1. vérifier le verdict du run `33882260391` ;
2. si rouge, corriger uniquement la cause exacte ;
3. si vert, certifier le bounded runner dans `LOT9_STATUS.md` ;
4. construire la persistance manifest / checkpoint du Full Coverage run ;
5. lancer ensuite seulement une vague live limitée ;
6. mesurer couverture / doublons / erreurs / stock unique ;
7. étendre progressivement jusqu’au manifest Full Coverage final ;
8. garder PR `#996` OPEN / DRAFT / non mergée et ne rien déployer sans autorisation explicite.

**Lots 1–8 : CLOSED ✅**
**Lot 9 : OPEN — bounded runner proof pending 🟡**
