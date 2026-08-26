# HANDOVER — AkarFinder / Neighborhood Context Intelligence

Date : 2026-08-26
Titre cible : **AkarFinder — Neighborhood Context Intelligence**
Statut vérifié : **READY FOR HUMAN GATE — 6/7 lots fermés = 85,7 %**
Base produit vérifiée : `main@89b033e40ecb74521fdd3c22f5669857f7ad1e4b`

## Goal

Nationaliser et unifier les repères utiles de quartier afin que Carte, page quartier, homepage et `Vivre ici` utilisent une même vérité POI, avec provenance, fraîcheur et précision territoriale explicites.

## État vérifié

### Lots 1–6 CLOSED

1. Réconciliation + contrat — PR #902 — merge `58de80ff29bf128a3881bfc5951be6380baaecab` ✅
2. National POI Source + Registry — PR #904 — merge `b2a899eaf11f945e980a3c39f4e195c51270b859` ✅
3. Assignment + Anchor Selection — PR #906 — merge `fb177022594f5cbc7a628e3edad3c4ffd5ec0ae5` ✅
4. Read Model + API — PR #907 — merge `c304e4bd0ae0b23334fe3a6c510459ecedf7c77f` ✅
5. Carte Repères + Semantic Zoom — PR #913 — merge `ff7ab0e9ba5acd59dd143084dc8cbb593eb62923` ✅
6. Surface Convergence — PR #918 — human gate validé — merge `dcf690de81abf1d8b14fff0fbe9f89201ff13e6d` ✅

L6 certification visuelle : run `32965282547`, artifact `9605551739`, 16/16 captures 390/430/768/1280, `report.json ok=true`, 0 finding/overflow/page error, score **9,5/10**.

## Lot 7 — National Scale + Quality / Freshness

Statut : **READY FOR HUMAN GATE**.

### Produit livré et mergé

- PR #931
- exact HEAD `13e9483fc32df8af6bd49426b57b29eefe593728`
- merge `89b033e40ecb74521fdd3c22f5669857f7ad1e4b`
- aucun Vercel

### Preuves finales

- run exact-head `32983514419` — SUCCESS
- artifact `9612476675`
- digest `sha256:f7a624ce468f496a1f342eee4bdbddafda68ea5650af75a0461ac2b41b746640`
- `quality-report.json` : `ok=true`, 0 finding
- régressions L1/L2/L3/L4/L5 + L7-A/L7-B : PASS
- TypeScript : PASS
- production build : PASS
- baseline : 21 quartiers / 8 villes
- couverture : 1 covered / 1 partial / 2 insufficient / 17 unavailable
- covered rate : 4,76 %
- runtime models : 6 ; missing runtime models : 15
- anchors : 12 ; provenance manquante : 0
- freshness policy : 30 jours
- 17 cibles queryables
- 4 cibles bloquées sans repère fiable : Racine, Aïn Diab, Bourgogne, Souissi
- mode par défaut `plan` : 0 réseau
- live : uniquement avec endpoints explicitement configurés
- read-model runtime : 10 915 octets / 10,659 KiB
- baseline sérialisé : 15 550 octets / 15,186 KiB
- latence : médiane 0,398 ms / p95 0,903 ms / max 1,079 ms
- aucun seuil latence arbitraire
- coût monétaire provider non certifiable sans provider payant configuré : `null`

### Provenance renforcée

Le validator final a détecté une vraie perte de provenance dans la projection L7-A : `source_url`, `license_policy` et `license_url` existaient dans L3 mais disparaissaient du baseline. La projection a été corrigée pour préserver ces champs. Le validator est resté strict.

### CI NCI corrigée

Les workflows visuels L4/L5 ne rejouent plus leurs audits BEFORE sur une PR L7. Leurs tests déterministes restent inclus dans le gate L7 final.

### UI

L7-B ne modifie aucun fichier UI produit. La dernière certification visuelle NCI reste celle de L6 : **9,5/10**. Un smoke transversal sur la PR L7 a également publié des runs aboutis à **48 captures / 0 finding**.

## Décisions verrouillées

- une seule taxonomie POI ;
- mêmes `poi_id` / `canonical_neighborhood_id` sur toutes les surfaces ;
- aucune appartenance « dans le quartier » sans preuve territoriale ;
- aucune minute depuis un centroïde quartier ;
- mesures de route uniquement depuis un bien exact ;
- acquisition POI hors render path ;
- fail-closed stale/rejected/indisponible ;
- aucun seuil national inventé ;
- aucun coût provider inventé ;
- aucun Vercel sans autorisation explicite.

## Blocage réel

Un seul gate reste ouvert : **certification humaine finale du chantier NCI**.

Tant que cette validation explicite n’existe pas :
- Lot 7 n’est pas CLOSED ;
- le chantier reste **6/7 = 85,7 %** ;
- aucun statut 100 % n’est autorisé.

## Next exact

1. publier et merger ce closeout documentaire `READY FOR HUMAN GATE` ;
2. présenter les preuves finales à l’utilisateur ;
3. obtenir le human gate explicite ;
4. seulement après validation : passer Lot 7 à CLOSED, roadmap/handover à `7/7 = 100 %` et effectuer le dernier closeout documentaire ;
5. aucun déploiement Vercel sans autorisation explicite.

## Prompt de reprise

« Reprends AkarFinder — Neighborhood Context Intelligence depuis `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_HANDOVER.md`. Le produit L7 est mergé sur `main@89b033e40ecb74521fdd3c22f5669857f7ad1e4b` et le run final `32983514419` est SUCCESS avec artifact `9612476675`. Le chantier est READY FOR HUMAN GATE, 6/7 = 85,7 %. Ne le passe à 100 % qu’après validation humaine explicite. Aucun Vercel. »
