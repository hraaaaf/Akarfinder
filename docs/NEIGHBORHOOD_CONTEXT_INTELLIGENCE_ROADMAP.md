# AkarFinder — Neighborhood Context Intelligence — ROADMAP

Date : 2026-08-26
Base produit vérifiée : `main@89b033e40ecb74521fdd3c22f5669857f7ad1e4b`
Statut : **READY FOR HUMAN GATE — 6/7 lots fermés = 85,7 %**

## Goal global

Construire une couche nationale de **repères utiles de quartier** où Carte, page quartier, homepage et `Vivre ici` utilisent une même vérité POI, avec provenance, fraîcheur et précision territoriale explicites.

Chaîne cible :

`Quartier canonique → POI vérifiés → anchors utiles → read-model → Carte → page quartier → homepage → listing → certification nationale`

## Succès global

Le chantier est CLOSED uniquement lorsque :
- la source POI nationale est reproductible et hors render path ;
- chaque POI publié conserve source / licence / attribution / fraîcheur ;
- la relation POI ↔ quartier est explicite et fail-closed ;
- la sélection d’anchors est déterministe et diversifiée ;
- Carte, page quartier, homepage et listing consomment le même read-model ;
- aucun temps de trajet n’est produit depuis un simple centroïde quartier ;
- aucun POI proche n’est présenté comme « dans le quartier » sans preuve territoriale ;
- la Carte reste map-first ;
- la couverture nationale est mesurée avec `covered | partial | insufficient | unavailable` ;
- les données stale/rejected ne sont pas publiées ;
- la certification finale UI + API + build + tests + revue humaine est verte ;
- aucun Vercel n’est effectué sans autorisation explicite.

## Correspondance de numérotation

| Roadmap canonique | PR d’exécution |
|---|---|
| Lot 1 — Réconciliation + contrat | #902 |
| Lot 2 — National POI Source + Registry | #904 (`L1`) |
| Lot 3 — Assignment + Anchor Selection | #906 (`L2`) |
| Lot 4 — Read Model + API | #907 (`L3`) |
| Lot 5 — Carte Repères + Semantic Zoom | #913 (`L4`) |
| Lot 6 — Surface Convergence | #918 (`L5`) |
| Lot 7 — National Scale + Quality/Freshness | #931 (`L7-A/L7-B`) |

---

# Lot 1 — Réconciliation + contrat canonique ✅ CLOSED

**Preuve** : PR #902, merge `58de80ff29bf128a3881bfc5951be6380baaecab`.

---

# Lot 2 — National POI Source + Registry Foundation ✅ CLOSED

**Preuve** : PR #904, merge `b2a899eaf11f945e980a3c39f4e195c51270b859`.

Livré : `NeighborhoodPoiV1`, identité OSM stable, provenance/licence/attribution/fraîcheur, normalisation FR/AR, catégories canoniques, déduplication, snapshot read-only et aucune acquisition provider dans le render path.

---

# Lot 3 — Neighborhood Assignment + Anchor Selection ✅ CLOSED

**Preuve** : PR #906, merge `fb177022594f5cbc7a628e3edad3c4ffd5ec0ae5`.

Livré : relations territoriales explicites, point-in-polygon seulement sur géométrie certifiée, ranking déterministe/diversifié, max 2 anchors/catégorie, max 8 anchors et wording truth-safe.

---

# Lot 4 — Neighborhood Context Read Model + API ✅ CLOSED

**Preuve** : PR #907, merge `c304e4bd0ae0b23334fe3a6c510459ecedf7c77f`.

Livré : `NeighborhoodContextReadModelV1`, freshness fail-closed, `coverage_status`, provenance/licence/observed_at, API read-only et aucun provider dans le render path.

---

# Lot 5 — Carte « Repères » + Semantic Zoom ✅ CLOSED

**Preuve** : PR #913, merge `ff7ab0e9ba5acd59dd143084dc8cbb593eb62923` ; BEFORE `32911680354`, artifact `9586788602`.

Livré : overlay map-first, semantic zoom, filtres canoniques, popup provenance/wording, sheet mobile compact et aucune durée inventée. Le recouvrement mobile détecté humainement a été corrigé avant merge.

---

# Lot 6 — Convergence Page quartier + « Vivre ici » annonce ✅ CLOSED

**Preuve** : PR #918, human gate validé, merge `dcf690de81abf1d8b14fff0fbe9f89201ff13e6d`.

Certification :
- HEAD `cac01d9b542641adf0bea955dbe85376a84512ee` ;
- run `32965282547` SUCCESS ;
- artifact `9605551739` ;
- digest `sha256:6691947ae925c72946f9c13dc24c8b724d3a114181a56945bf350c6520ae696a` ;
- TypeScript + build + Chromium : PASS ;
- 16/16 captures 390 / 430 / 768 / 1280 ;
- `report.json ok=true`, 0 finding, 0 overflow, 0 page error ;
- même signature NCI sur homepage / SEO quartier / page quartier / listing ;
- listing exact : contexte NCI sans minute + section séparée `Depuis ce bien exact` ;
- centroïde quartier : 0 provider réseau, 0 minute ;
- score visuel : **9,5/10**.

---

# Lot 7 — National Scale + Quality / Freshness Certification 🟠 READY FOR HUMAN GATE

## Goal

Passer du pilote à une couverture nationale réellement mesurable, fraîche et maintenable, puis fermer le chantier sur preuves.

## Livré et vérifié

- baseline national read-only de **21 quartiers / 8 villes** ;
- statuts réels : **1 covered / 1 partial / 2 insufficient / 17 unavailable** ;
- **6** read-models runtime, **15** quartiers sans modèle ;
- **12 anchors** publiés, tous frais et avec provenance complète ;
- **17** cibles queryables et **4** explicitement bloquées faute de repère fiable : Racine, Aïn Diab, Bourgogne, Souissi ;
- aucun centroïde inventé ;
- freshness policy : **30 jours** ;
- refresh reproductible hors render path ; mode par défaut `plan` = **0 appel réseau** ;
- mode live uniquement avec endpoints explicitement configurés ;
- fail-closed en cas de source indisponible ;
- 5 canaries représentatives ;
- détection de downgrade couverture, anchor drop et perte fraîcheur ;
- baseline + refresh conservent `poi_id`, source/URL, attribution, `license_policy`, `license_url`, `observed_at`, fraîcheur ;
- coût opérationnel : **0 appel réseau par défaut**, 17 cibles live potentielles ;
- coût monétaire provider : **non certifiable sans provider payant configuré**, donc aucun montant inventé ;
- taille read-model runtime : **10 915 octets / 10,659 KiB** ;
- baseline sérialisé : **15 550 octets / 15,186 KiB** ;
- latence read-model : **0,398 ms médiane / 0,903 ms p95 / 1,079 ms max** ; aucun seuil arbitraire ;
- régression **NCI L1–L6 + L7-A/L7-B : PASS** ;
- TypeScript : PASS ;
- build production : PASS ;
- aucun fichier UI produit modifié par L7-B ; certification visuelle L6 conservée ; smoke transversal PR observé à 48 captures / 0 finding ;
- aucun Vercel.

## Preuve exacte

- L7-A : run `32977534630` SUCCESS, artifact `9610110450` ;
- PR L7-B : #931 ;
- exact HEAD : `13e9483fc32df8af6bd49426b57b29eefe593728` ;
- run final : `32983514419` SUCCESS ;
- artifact : `9612476675` ;
- digest : `sha256:f7a624ce468f496a1f342eee4bdbddafda68ea5650af75a0461ac2b41b746640` ;
- `quality-report.json` : `ok=true`, 0 finding ;
- provenance : 12 anchors / 0 evidence manquante ;
- merge produit : `89b033e40ecb74521fdd3c22f5669857f7ad1e4b`.

## Incident utile corrigé pendant la certification

Le validator renforcé a détecté que la projection L7-A perdait `source_url`, `license_policy` et `license_url` alors que L3 les conservait. La projection baseline a été corrigée pour préserver ces champs ; le validator n’a pas été affaibli.

Les workflows visuels L4/L5 ne rejouent plus leurs audits BEFORE sur une PR L7 ; leurs tests déterministes restent inclus dans le gate L7.

## Gate restant

**Une seule condition manque pour fermer le chantier : la certification humaine finale.**

Le Lot 7 reste donc `READY FOR HUMAN GATE` et le chantier reste **6/7 = 85,7 %** jusqu’à cette validation explicite.

## Avancement

- Lots 1–6 : CLOSED ✅
- Lot 7 : READY FOR HUMAN GATE 🟠
- **Global vérifié : 6/7 = 85,7 %**

## Next exact

Human gate final sur les preuves ci-dessus. Après validation explicite : mettre Lot 7 `CLOSED`, passer le chantier à `7/7 = 100 %`, effectuer le dernier closeout documentaire et ne faire aucun déploiement Vercel sans autorisation explicite.
