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

On ne passe pas prématurément à un second portail avant d’avoir mesuré le stock réel de Mubawab, sauf blocage documenté.

## Repo / branche / PR

- Repo : `hraaaaf/Akarfinder`
- Branche : `feat/data-ingestion-canonical`
- PR : `#996`
- PR : OPEN / DRAFT / non mergée
- aucun merge sans autorisation explicite ;
- aucun déploiement Vercel sans autorisation explicite ;
- aucun write production autorisé ;
- ne jamais toucher à `scripts/scrapers/output/akarfinder.db` pendant les preuves.

## Lots — état courant

- Lots 1–8 : ✅ CLOSED
- Lot 9 : 🟡 OPEN — Mubawab Full Coverage
- Lot 10 : ⚪ À FAIRE
- Lot 11 : ⚪ À FAIRE
- Lot 12 : ⚪ À FAIRE

## Preuves historiques

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
- job id : `101043688350` ;
- régression Lot 7 : 1/1 GREEN ;
- Lot 8 : 4/4 GREEN.

## Roadmap ≥100K

`data-ingestion/canonical.md` a été réaligné pour imposer la séquence : Mubawab Full Coverage → certification dataset massif → ingestion massive → multi-source uniquement pour combler le delta vers ≥100K.

## Lot 9 — état exact

### Étape 1 — planner ✅ CERTIFIED

- fichier : `data-ingestion/sources/mubawab/full-coverage.ts` ;
- 12 villes ;
- 11 catégories activées ;
- 132 scopes initiaux ;
- fenêtres déterministes ;
- checkpoint monotone ;
- progression seulement après `window_exhausted` ;
- stops `zero_new_unique_ids` / robots / source block / kill-switch.

Preuve :

- run `33881976620` ✅ SUCCESS ;
- job `101052543906` ;
- HEAD produit `1f9f0ae095fd28b9821008dd33dfb83e120ff5b4`.

### Étape 2 — bounded runner ✅ CERTIFIED

- fichier : `data-ingestion/sources/mubawab/full-coverage-runner.ts` ;
- vague bornée par `maxPartitions` ;
- dédup globale des `source_id` ;
- checkpoint après chaque page ;
- kill-switch ;
- classification des stops sécurité ;
- next partition uniquement après épuisement normal ;
- aucun write DB.

Preuve :

- run `33882260391` ✅ SUCCESS ;
- job `101053487441` ;
- Discovery regression ✅ ;
- planner contract ✅ ;
- bounded runner contract ✅.

### Étape 3 — première vague live ✅ GREEN

Workflow : `Data Ingestion Lot 9 Live Wave`.

Preuve :

- run `33882641901` ✅ SUCCESS ;
- job `101054741842` ;
- HEAD produit `df0ba4494dd75b846d99d0a3b854fac30fd302c6` ;
- artifact `9940542354` ;
- digest `sha256:ca1b1a6b45cf0ff178e818145ef82d4189b96239b1082a65751845816a72ce5e`.

Périmètre : Casablanca appartement vente + location, 2 pages par partition, soit 4 pages maximum.

Résultat réel :

- 2 partitions démarrées / 2 complétées ;
- 0 failed ;
- 4 pages demandées / 4 réussies ;
- 126 annonces découvertes ;
- 126 uniques ajoutées ;
- 0 doublon observé dans cette vague ;
- 2 partitions suivantes créées ;
- 0 blocage source ;
- 0 kill-switch ;
- stop reason : `window_exhausted` pour les deux scopes.

Cette vague ne fait aucune extraction de détail, aucun téléchargement d’image, aucun write DB et aucune action production.

## Lecture

Le chemin réel de découverte Full Coverage est maintenant prouvé sur un petit périmètre live. Il est trop tôt pour extrapoler 126 annonces / 4 pages à tout Mubawab. Le prochain travail est d’augmenter progressivement la couverture tout en persistants manifests / checkpoints / set global de source IDs et en maintenant les stops sécurité.

## Sécurité live

- contrôle robots avant requête ;
- User-Agent identifiable ;
- aucun cookie / login / CAPTCHA / contournement d’accès ;
- arrêt global sur blocage explicite 403 / 429 ;
- aucun write production ;
- manifests / checkpoints reproductibles.

## NEXT EXACT

1. étendre la vague live de manière progressive et bornée ;
2. persister l’état global entre vagues : partitions, checkpoint, `seen_source_ids`, métriques ;
3. mesurer rendement par ville / catégorie / page-range ;
4. continuer jusqu’à extinction naturelle de chaque scope ou stop sécurité documenté ;
5. produire le manifest Full Coverage final avec stock Mubawab unique réel ;
6. seulement alors ouvrir Lot 10 ;
7. garder PR `#996` OPEN / DRAFT / non mergée et ne rien déployer sans autorisation explicite.

**Lots 1–8 : CLOSED ✅**
**Lot 9 : OPEN — first live wave GREEN, progressive expansion next 🟡**
