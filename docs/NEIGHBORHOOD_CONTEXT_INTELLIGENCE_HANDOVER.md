# HANDOVER — AkarFinder / Neighborhood Context Intelligence

Date : 2026-08-26
Titre cible : **AkarFinder — Neighborhood Context Intelligence**
Statut vérifié : **CLOSED — 7/7 lots fermés = 100 %**
Human gate final : **VALIDÉ par l’utilisateur le 2026-08-26**
Base produit certifiée : `main@89b033e40ecb74521fdd3c22f5669857f7ad1e4b`
Closeout pré-human-gate : `main@34bb6358b0d922fc629bd7068be48b39f404dfd0`

## Goal atteint

Nationaliser et unifier les repères utiles de quartier afin que Carte, page quartier, homepage et `Vivre ici` utilisent une même vérité POI, avec provenance, fraîcheur et précision territoriale explicites.

## Lots fermés

1. Réconciliation + contrat — PR #902 — merge `58de80ff29bf128a3881bfc5951be6380baaecab` ✅
2. National POI Source + Registry — PR #904 — merge `b2a899eaf11f945e980a3c39f4e195c51270b859` ✅
3. Assignment + Anchor Selection — PR #906 — merge `fb177022594f5cbc7a628e3edad3c4ffd5ec0ae5` ✅
4. Read Model + API — PR #907 — merge `c304e4bd0ae0b23334fe3a6c510459ecedf7c77f` ✅
5. Carte Repères + Semantic Zoom — PR #913 — merge `ff7ab0e9ba5acd59dd143084dc8cbb593eb62923` ✅
6. Surface Convergence — PR #918 — merge `dcf690de81abf1d8b14fff0fbe9f89201ff13e6d` ✅
7. National Scale + Quality/Freshness — PR #931 — merge `89b033e40ecb74521fdd3c22f5669857f7ad1e4b` ✅

## Preuve visuelle de convergence

L6 : run `32965282547`, artifact `9605551739`, 16/16 captures 390/430/768/1280, `report.json ok=true`, 0 finding/overflow/page error, score **9,5/10**.

L7-B n’a modifié aucun fichier UI produit. Un smoke transversal a également publié des runs aboutis à **48 captures / 0 finding**.

## Certification nationale finale L7

- exact HEAD : `13e9483fc32df8af6bd49426b57b29eefe593728`
- run : `32983514419` — SUCCESS
- artifact : `9612476675`
- digest : `sha256:f7a624ce468f496a1f342eee4bdbddafda68ea5650af75a0461ac2b41b746640`
- `quality-report.json` : `ok=true`, 0 finding
- régressions L1/L2/L3/L4/L5 + L7-A/L7-B : PASS
- TypeScript : PASS
- production build : PASS
- baseline : 21 quartiers / 8 villes
- couverture : 1 covered / 1 partial / 2 insufficient / 17 unavailable
- covered rate : 4,76 %
- runtime models : 6 ; missing : 15
- anchors : 12 ; provenance manquante : 0
- freshness : 30 jours
- cibles : 17 queryables / 4 bloquées sans repère fiable
- bloquées : Racine, Aïn Diab, Bourgogne, Souissi
- mode par défaut `plan` : 0 réseau
- live : uniquement avec endpoints explicitement configurés
- read-model runtime : 10 915 octets / 10,659 KiB
- baseline sérialisé : 15 550 octets / 15,186 KiB
- latence : médiane 0,398 ms / p95 0,903 ms / max 1,079 ms
- aucun seuil latence arbitraire
- coût monétaire provider : non certifiable sans provider payant configuré, donc `null`
- aucun Vercel

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

## Incident utile corrigé

Le validator L7 a détecté que la projection baseline perdait `source_url`, `license_policy` et `license_url`. Ces champs existaient déjà dans L3. La projection a été corrigée pour les préserver ; le validator est resté strict.

Les workflows visuels L4/L5 ont aussi été corrigés pour ne plus rejouer leurs audits BEFORE sur les PR L7, tandis que leurs tests déterministes restent inclus dans le gate final.

## Closeout

- PR produit L7 : #931 ✅
- PR closeout READY FOR HUMAN GATE : #932 — merge `34bb6358b0d922fc629bd7068be48b39f404dfd0` ✅
- human gate final : **VALIDÉ** ✅
- Lot 7 : **CLOSED** ✅
- Chantier : **7/7 = 100 % — CLOSED** ✅

## Blocage réel

Aucun blocage restant dans le périmètre NCI certifié.

## Suite éventuelle

Toute activation live provider, extension de couverture au-delà du registre actuellement éligible, changement de seuil produit ou déploiement Vercel constitue un chantier séparé. Aucun Vercel n’est autorisé implicitement.

## Prompt de reprise

« AkarFinder — Neighborhood Context Intelligence est CLOSED à 7/7 = 100 %. Lire `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_ROADMAP.md` et ce handover pour les preuves. Le produit certifié L7 est mergé via PR #931, run final `32983514419`, artifact `9612476675`; le human gate final utilisateur est validé. Ne rouvrir NCI que pour un nouveau scope explicite. Aucun Vercel sans autorisation. »
