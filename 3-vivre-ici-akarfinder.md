# 3 — Vivre Ici AkarFinder

**Statut : PREMIUM ≥9 CERTIFIÉ POST-SYNC / HUMAN GATE MERGE**  
**Dernière mise à jour : 2026-09-06**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `docs/3-vivre-ici-akarfinder`**  
**PR : `#1025` — OPEN**  
**Fondation produit : `/map`**  
**Vercel : aucun déploiement sans accord explicite d’Achraf.**

## GOAL
Transformer Vivre ici (`/map`) en expérience territoriale premium : Maroc 2D → ville/quartier 3D, carte dominante, chrome léger, panneau/bottom-sheet premium, aucune fausse précision.

Succès : score visuel global ≥9/10 + build/TypeScript/tests verts + mêmes captures 390/430/768/1280 + truth gate géographique fail-closed.

## TARGET FREEZE 2026-09-06
1. Desktop Maroc 2D premium.
2. Desktop Casablanca → Maârif 3D.
3. Mobile Casablanca → Maârif 3D.

Aucun prix, photo, temps, distance, métrique ou position n'est inventé pour reproduire le mockup.

## PREUVES DE CONVERGENCE
- P0 2D : run `33990212630`, artifact `9976424591`, ancien Goal P0 ~9,0/10.
- 3D-L2b : run `33992903877`, artifact `9977221838`, ~7,5/10.
- Lot 2a : run `34030333919`, artifact `9988409177`, ~6,5/10.
- Lot 2b : run `34030849447`, artifact `9988593627`, ~7,4/10.
- intermédiaire : run `34032104891`, artifact `9988982037`, ~7,6/10.
- Lot 2c : run `34033038551`, artifact `9989287797`, ~8,1/10.
- Lot 2d : run `34036441560`, artifact `9990349262`, ~8,8/10.
- Lot 2e pré-sync : run `34039217117`, artifact `9991177033`, ~9,0/10.

## SYNCHRONISATION MAIN
- ancien HEAD visuel : `88df506241d77fbe8d67718fd421f6ac9b7fd496`.
- main synchronisé : `b8c89681358e93ec254016bcca9b78f4717ea8de`.
- intersection des changements main avec les 21 fichiers Vivre Ici : `0`.
- merge sync : `f7c28368ce2d9de54be42985e8c690fa3c6e080f`.
- comparaison après sync : behind `0`, diff limité aux 21 fichiers Vivre Ici attendus.
- ancrage de recertification : `45cd3174ca3a6dd10035eadd8755c03116ad1236`.

## CERTIFICATION FINALE POST-SYNC
Run `34042235527` : artifact produit et proof gate exécuté sur HEAD `45cd3174ca3a6dd10035eadd8755c03116ad1236`.

Artifact :
- ID `9992071591` ;
- digest `sha256:d3da569fb2e1a850302996c117564cd640343961576ef37149f8a65043676a61` ;
- taille `2 909 302` octets ;
- 8 captures mêmes viewports/scénarios.

Mesures post-sync :
- 8/8 HTTP 200 ;
- Maroc strictement 2D sur 390/430/768/1280 ;
- Maârif : pitch `60°`, zoom `15.5`, bearing `-28°` ;
- bâtiments rendus `43 / 46 / 65 / 70` ;
- POI Maârif `2` ;
- carte desktop Maârif ≈ `73,91 %` ;
- bottom sheet mobile 390/430 ≈ `202,25 px`, tablette ≈ `216,94 px` ;
- aucun overlap top chrome ;
- `zeroDbWritesByScript=true` ;
- `zeroDeploymentActionsByScript=true`.

Inspection visuelle des captures desktop 1280 et mobile 390 : système 2e préservé après sync, 3D immédiatement lisible, carte dominante, rail éditorial compact, mobile hero-map + sheet cohérent. **Score final maintenu ~9,0/10. Goal premium atteint sur le tree synchronisé.**

## TRUTH GATE GÉOGRAPHIQUE
Audit Supabase production read-only :
- `property_listings` : `7 926`, aucune sémantique coordonnée exploitable ;
- `geo_entities` : `45`, coordonnée exploitable `0` ;
- `geo_resolution_events` : `102`, coordonnée exploitable `0` ;
- `mubawab_listing_corpus_v1` : `37 420`, coordonnée exploitable `0`.

`isExactMapListing` exige `geo_precision="exact"` + provenance `scraped_coordinates|manual_import` + coordonnées valides au Maroc.

**Conclusion : `0` bien actuellement éligible à un pin/callout EXACT.** Aucun faux pin bien n'est autorisé.

## ROADMAP
- [x] L0 BEFORE `/map`
- [x] P0 2D
- [x] 3D-L1 / L2b
- [x] Target premium
- [x] Lots 2a→2e convergence
- [x] Lot 3 truth gate `0 EXACT`, fail-closed
- [x] Lot 4 certification finale post-sync ≥9
- [x] Canonical closeout
- [ ] Human gate merge PR #1025
- [ ] Vercel uniquement après autorisation explicite
- [ ] P2 terrain/soleil/modèles neufs seulement si données + ROI prouvés

## NEXT EXACT
Human gate : merge PR `#1025`. Après merge, vérifier HEAD/main et CI post-merge. Aucun déploiement Vercel sans autorisation explicite.