# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET 9,8/10 LOCKED / LOT 2g CERTIFIÉ TECHNIQUEMENT / ÉVALUATION VISUELLE À FAIRE**  
**Dernière mise à jour : 2026-09-06**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `docs/3-vivre-ici-akarfinder`**  
**PR : `#1025` — OPEN**  
**Fondation produit : `/map`**  
**Vercel : aucun déploiement sans accord explicite d’Achraf.**

## GOAL
Transformer Vivre ici (`/map`) en expérience territoriale premium inspirée du site référent : carte héro dominante, ville/quartier 3D, chrome léger, rail desktop éditorial, bottom sheet mobile premium, aucune fausse précision.

**Succès observable : score visuel global ≥9,8/10 contre le TARGET LOCK ci-dessous + build/TypeScript/tests verts + captures 390/430/768/1280 + truth gate géographique fail-closed.**

## TARGET LOCK — 2026-09-06 — AUTORITÉ VISUELLE
Cible approuvée explicitement par Achraf le 2026-09-06 : mockup unique contenant **Desktop Maârif 3D + Mobile Maârif 3D**.

Artefact durable :
- fichier : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- stockage canonique : Google Drive
- file ID : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- URL : `https://drive.google.com/file/d/1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL/view?usp=drivesdk`
- dimensions : `1536 × 1024`
- taille originale : `2 879 788` octets
- SHA-256 de l’original généré et approuvé : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`

**Règle : cette image remplace toutes les anciennes descriptions vagues de cible. Toute future note visuelle doit être calculée contre cette image. Le seuil de clôture est désormais ≥9,8/10.**

Important : le mockup contient des éléments illustratifs (photos, prix, météo, scores, proximité, labels). Ils définissent le niveau de qualité visuelle et la hiérarchie, **pas une autorisation d’inventer ces données en production**. Les données absentes restent absentes ou présentées honnêtement.

## TARGET — CRITÈRES À MATCHER
1. Desktop : carte 3D spectaculaire et lisible, couvrant la majorité de l’écran, chrome flottant fin et premium.
2. Desktop : rail quartier visuel riche, éditorial et aéré, avec image uniquement si une vraie image fiable existe.
3. Mobile : carte 3D héro, contrôles regroupés, bottom sheet compact et riche, navigation légère.
4. Basemap : densité de labels maîtrisée, relief/bâtiments lisibles, rendu chaud et premium.
5. Cohérence marque AkarFinder : typographie, rayons, ombres, blanc cassé/bleu, hiérarchie nette.
6. Truth gate : aucun prix/photo/temps/distance/score/position n’est fabriqué.

## PREUVES DE CONVERGENCE
- Lot 2a : run `34030333919`, artifact `9988409177`, ~6,5/10.
- Lot 2b : run `34030849447`, artifact `9988593627`, ~7,4/10.
- intermédiaire : run `34032104891`, artifact `9988982037`, ~7,6/10.
- Lot 2c : run `34033038551`, artifact `9989287797`, ~8,1/10.
- Lot 2d : run `34036441560`, artifact `9990349262`, ~8,8/10 contre l’ancienne cible.
- Lot 2e post-sync : run `34042235527`, artifact `9992071591`, techniquement certifié ; réévaluation stricte ~8,3/10.
- Lot 2f : commit `1581c108a5b0ebe41170bcdec91c96e535aafc5a`, run `34044165796`, artifact `9992613601`, digest `sha256:8b759ccf1a3803aa5a6e50fb1fdd32f3b9f783da4b4ff3d9002044e81619e4e8`, techniquement certifié ; estimation visuelle ~8,7/10 avant TARGET LOCK 9,8.

## LOT 2g — BASEMAP / MOBILE CHROME
Commit : `c9a8e28a62a42874f58e7d8df3905a40405198c6` (`style(vivre-ici): reduce 3d basemap noise and mobile chrome`).

Certification :
- run `34044522522` — `completed / success`
- artifact `9992715124`
- digest `sha256:05e389d9b3c3ac83af1dce66398f2e724d2dd70612b409c402e84f994b6a9211`
- HEAD certifié `c9a8e28a62a42874f58e7d8df3905a40405198c6`

**2g est certifié techniquement. Il n’est pas déclaré ≥9,8 tant que les captures ne sont pas comparées directement au TARGET LOCK.**

## TRUTH GATE GÉOGRAPHIQUE
Audit Supabase production read-only :
- `property_listings` : `7 926`, aucune sémantique coordonnée exploitable ;
- `geo_entities` : `45`, coordonnée exploitable `0` ;
- `geo_resolution_events` : `102`, coordonnée exploitable `0` ;
- `mubawab_listing_corpus_v1` : `37 420`, coordonnée exploitable `0`.

`isExactMapListing` exige `geo_precision="exact"` + provenance `scraped_coordinates|manual_import` + coordonnées valides au Maroc.

**Conclusion : `0` bien actuellement éligible à un pin/callout EXACT. Aucun faux pin bien n’est autorisé.**

## SYNCHRONISATION MAIN
- main synchronisé : `b8c89681358e93ec254016bcca9b78f4717ea8de`.
- merge sync : `f7c28368ce2d9de54be42985e8c690fa3c6e080f`.
- intersection main/Vivre lors de la sync : `0`.

## ROADMAP
- [x] Target premium initial
- [x] Lots 2a→2f convergence
- [x] Lot 3 truth gate `0 EXACT`, fail-closed
- [x] TARGET LOCK 2026-09-06 stocké durablement + SHA-256
- [x] Seuil officiel relevé à ≥9,8/10
- [x] Lot 2g certification technique
- [ ] Comparaison directe TARGET LOCK ↔ 2g, desktop + mobile
- [ ] Corrections 2h+ jusqu’à ≥9,8/10
- [ ] Certification finale visuelle ≥9,8
- [ ] Canonical closeout final
- [ ] Human gate merge PR #1025
- [ ] Vercel uniquement après autorisation explicite

## NEXT EXACT
Télécharger l’artifact `9992715124` → montrer les captures 2g → produire un côte-à-côte **TARGET LOCK | 2g** desktop et mobile → scorer précisément les écarts → corriger immédiatement tout écart empêchant ≥9,8 → recertifier. Aucun merge ni déploiement Vercel avant le gate correspondant.