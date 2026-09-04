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

- Lot 1 : ✅ CLOSED
- Lot 2 : ✅ CLOSED
- Lot 3 : ✅ CLOSED
- Lot 4 : ✅ CLOSED
- Lot 5 : ✅ CLOSED
- Lot 6 : ✅ CLOSED pour crawl / transaction ; mismatch taxonomique historique séparé
- Lot 7 : ✅ CLOSED — functional + browser visual proof
- Lot 8 : ✅ CLOSED — controlled massive ingestion proof GREEN
- Lot 9 : 🟡 OPEN — Mubawab Full Coverage
- Lot 10 : ⚪ À FAIRE
- Lot 11 : ⚪ À FAIRE
- Lot 12 : ⚪ À FAIRE

## Lot 7 — preuve de référence

- workflow : `Data Ingestion Lot 7 Visual Proof` ;
- run : `33877438332` ✅ SUCCESS ;
- HEAD produit : `10ecf3b36afdcbf68b84857ddc8f153cd3ab2610` ;
- artifact : `9938461473` ;
- digest : `sha256:08b2c8f3679c22e4c3c02075b29d1f26276b460664aac7c0832ccd7da9746ee9`.

Canonique visuel Search conforme.

## Lot 8 — preuve de référence

- workflow : `Data Ingestion Lot 8 Controlled Massive Gate` ;
- run : `33879281908` ✅ SUCCESS ;
- HEAD produit : `979c7f57e46f5eb39c6d0a552fe78b635185e634` ;
- job : `controlled-massive` ;
- job id : `101043688350` ;
- régression Lot 7 : 1/1 GREEN ;
- Lot 8 : 4/4 GREEN.

Prouvé : 2 500 annonces, batching, idempotence, checkpoint / reprise, rollback mid-batch, purge portail sélective, protection direct/partner, SQLite sandbox uniquement.

## Lot 9 — chantier courant

**Goal :** parcourir exhaustivement le périmètre Mubawab accessible et autorisé afin de mesurer le stock canonique réel avant d’ouvrir une deuxième source.

Le nouveau canonique a été aligné sur ce cap au commit :

`6912915f4f6a5eb96ae3552f15c30397a2156c55`

### Étape 1 — Full Coverage planner

Fichiers :

- `data-ingestion/sources/mubawab/full-coverage.ts` ;
- `scripts/scrapers/__tests__/data-ingestion-lot9-full-coverage-planner.test.ts` ;
- `.github/workflows/data-ingestion-lot9-full-coverage.yml` ;
- `data-ingestion/LOT9_STATUS.md`.

La config actuelle produit :

- 12 villes ;
- 11 catégories activées ;
- **132 scopes** initiaux `ville × catégorie`.

Le scheduler découpe chaque scope en fenêtres de pages :

```text
1–25 → 26–50 → 51–75 → ...
```

La fenêtre suivante n’existe que si la précédente est terminée avec `window_exhausted`.

Un scope s’arrête sur `zero_new_unique_ids` ou sur un signal de sécurité explicite.

Chaque partition possède un ID stable, statut, checkpoint, compteurs et erreurs.

### Gate planner

- workflow : `Data Ingestion Lot 9 Full Coverage Planner Gate` ;
- run initial : `33881976620` ;
- état au moment de ce handover : en cours / preuve non encore enregistrée comme GREEN.

Le gate exécute :

1. régression Discovery Mubawab ;
2. contrat du scheduler Lot 9.

### Sécurité live héritée du Lot 6

Toute future collecte :

- passe par contrôle robots ;
- stoppe sur blocage explicite 403 / 429 ;
- n’essaie jamais de contourner CAPTCHA, authentification ou contrôle d’accès ;
- reste hors production ;
- produit manifests / checkpoints reproductibles.

## NEXT EXACT

1. vérifier le verdict du run `33881976620` ;
2. si rouge, corriger uniquement la cause exacte ;
3. si vert, enregistrer la preuve du planner dans `LOT9_STATUS.md` ;
4. construire le runner Full Coverage reprenable en réutilisant les garde-fous Lot 6 ;
5. lancer d’abord une vague limitée de partitions ;
6. mesurer couverture / doublons / erreurs / stock unique ;
7. étendre progressivement jusqu’au manifest Full Coverage final ;
8. garder PR `#996` OPEN / DRAFT / non mergée et ne rien déployer sans autorisation explicite.

**Lots 1–8 : CLOSED ✅**
**Lot 9 : OPEN — Full Coverage planner proof pending 🟡**
