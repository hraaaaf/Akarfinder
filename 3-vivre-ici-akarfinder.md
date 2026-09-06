# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET 9,8/10 LOCKED / LOT 2j RECERTIFICATION APRÈS CORRECTIF OVERLAP**  
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
- SHA-256 : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`

**Règle : cette image est l’autorité visuelle. Toute note future est calculée contre elle. Seuil de clôture : ≥9,8/10.**

Le mockup contient des éléments illustratifs (photos, prix, météo, scores, proximité, labels). Ils définissent le niveau visuel et la hiérarchie, **pas une autorisation d’inventer ces données en production**. Les données absentes restent absentes ou sont présentées honnêtement.

## TARGET — CRITÈRES À MATCHER
1. Desktop : carte 3D spectaculaire et lisible, couvrant la majorité de l’écran, chrome flottant fin et premium.
2. Desktop : rail quartier riche, éditorial et aéré, avec image uniquement si une vraie image fiable existe.
3. Mobile : carte 3D héro, contrôles regroupés, bottom sheet compact et riche, navigation légère.
4. Basemap : densité de labels maîtrisée, relief/bâtiments lisibles, rendu chaud et premium.
5. Cohérence marque AkarFinder : typographie, rayons, ombres, blanc cassé/bleu-teal, hiérarchie nette.
6. Truth gate : aucun prix/photo/temps/distance/score/position n’est fabriqué.

## PREUVES DE CONVERGENCE
- Lot 2a : run `34030333919`, artifact `9988409177`, ~6,5/10.
- Lot 2b : run `34030849447`, artifact `9988593627`, ~7,4/10.
- intermédiaire : run `34032104891`, artifact `9988982037`, ~7,6/10.
- Lot 2c : run `34033038551`, artifact `9989287797`, ~8,1/10.
- Lot 2d : run `34036441560`, artifact `9990349262`, ~8,8/10 contre l’ancienne cible.
- Lot 2e post-sync : run `34042235527`, artifact `9992071591`, techniquement certifié ; réévaluation stricte ~8,3/10.
- Lot 2f : commit `1581c108a5b0ebe41170bcdec91c96e535aafc5a`, run `34044165796`, artifact `9992613601`, digest `sha256:8b759ccf1a3803aa5a6e50fb1fdd32f3b9f783da4b4ff3d9002044e81619e4e8`, techniquement certifié ; ~8,7/10 avant TARGET LOCK 9,8.
- Lot 2g : commit `c9a8e28a62a42874f58e7d8df3905a40405198c6`, run `34044522522`, artifact `9992715124`, digest `sha256:05e389d9b3c3ac83af1dce66398f2e724d2dd70612b409c402e84f994b6a9211`, techniquement certifié.
- Lot 2i : HEAD `ff6e7330bf248e2c74fbc9e444284678404f6465`. `Mockup Convergence Target Gate` run `34052743509` SUCCESS. `Carte National Zillow UI Certification` run `34052743504` SUCCESS, artifact `9995086969`, digest `sha256:50fa657a86369fc0b2bbbad04a8db380f1f44646c097c42feb17f4f2710101ad`. Cet artifact prouve la carte nationale/Casablanca, **pas à lui seul le rendu canonique Maârif 3D**. Donc aucun ≥9,8 déclaré.

## LOT 2j — CONVERGENCE ÉDITORIALE TARGET LOCK
But : supprimer l’effet dashboard encore visible sans modifier la vérité des données.

Implémentation initiale :
- `app/map/premium-lot5.css` créé au commit `6d3c58017bcff8cd8229ebb928c3db1a5e325c4f` ;
- activation dans `app/map/page.tsx` au commit code `db43f168a262a58be2b7825a7773df960b59db05` ;
- rail desktop : marché vide masqué, signalétique ramenée à trois lignes éditoriales, CTA/teinte rapprochés du TARGET ;
- desktop : chrome carte plus fin, rail 350 px, carte héro conservée ;
- mobile : un seul bottom sheet éditorial, tabs masqués, trois facts compacts, contrôles regroupés ;
- aucune création de prix/photo/score/distance/temps/coordonnée.

Première certification dédiée :
- workflow `Vivre Ici AFTER Certification` ;
- run `34057285291` ; job `101551374883` ; HEAD `db43f168a262a58be2b7825a7773df960b59db05` ;
- contracts ✅ ; TypeScript ✅ ; build ✅ ; Chromium ✅ ;
- capture AFTER ❌ uniquement sur l’invariant `topChromeToggleOverlap=true` en Maârif 1280 ;
- artifact partiel réel `9996408072`, digest `sha256:a7f48e2d848283f499df8f97e46ff35d2465525443cbd61bf59d54f9934f4877` ;
- preuve 1280 : 3D layer/source présents, pitch 60°, bearing -28°, zoom 15.5, 69 bâtiments rendus, map share 0.6953125, district-search overlap false.

Correctif minimal :
- recherche desktop : marge droite portée de `102px` à `118px` pour séparer la recherche du toggle 3D ;
- commit `6dccce7c148da6e1e21eab9d24f71e2032aff61c` (`fix(vivre-ici): clear desktop search toggle overlap`).

Recertification en cours :
- run dédié `34059445434` ;
- job `101557220830` (`certify-after`) ;
- HEAD `6dccce7c148da6e1e21eab9d24f71e2032aff61c` ;
- au dernier contrôle : contracts ✅, TypeScript ✅, build ✅, Chromium ✅, capture AFTER `in_progress`.

Aucun score ≥9,8 n’est déclaré tant que les 8 captures du run corrigé ne sont pas vérifiées et comparées au TARGET LOCK.

## TRUTH GATE GÉOGRAPHIQUE
Audit Supabase production read-only :
- `property_listings` : `7 926`, aucune sémantique coordonnée exploitable ;
- `geo_entities` : `45`, coordonnée exploitable `0` ;
- `geo_resolution_events` : `102`, coordonnée exploitable `0` ;
- `mubawab_listing_corpus_v1` : `37 420`, coordonnée exploitable `0`.

`isExactMapListing` exige `geo_precision="exact"` + provenance `scraped_coordinates|manual_import` + coordonnées valides au Maroc.

**Conclusion : `0` bien actuellement éligible à un pin/callout EXACT. Aucun faux pin bien n’est autorisé.**

## SYNCHRONISATION MAIN
- main synchronisé lors du dernier gate : `b8c89681358e93ec254016bcca9b78f4717ea8de`.
- merge sync : `f7c28368ce2d9de54be42985e8c690fa3c6e080f`.
- intersection main/Vivre lors de cette sync : `0`.

## ROADMAP
- [x] Target premium initial
- [x] Lots 2a→2g convergence technique
- [x] Lot 3 truth gate `0 EXACT`, fail-closed
- [x] TARGET LOCK 2026-09-06 stocké durablement + SHA-256
- [x] Seuil officiel relevé à ≥9,8/10
- [x] Lot 2i vérifié techniquement sans fausse déclaration ≥9,8
- [x] Lot 2j implémenté
- [x] Premier run 2j diagnostiqué : overlap 1280 isolé
- [x] Correctif overlap 2j poussé
- [ ] Recertification 2j corrigée + artifact 8 captures
- [ ] Comparaison directe TARGET LOCK ↔ 2j corrigé desktop + mobile
- [ ] Correction 2k immédiate si score <9,8
- [ ] Certification finale visuelle ≥9,8
- [ ] Canonical closeout final
- [ ] Human gate merge PR #1025
- [ ] Vercel uniquement après autorisation explicite

## NEXT EXACT
Run `34059445434` → artifact `vivre-ici-after` → vérifier les 8 captures réelles et les overlaps → montrer Maârif desktop/mobile → produire `TARGET LOCK | 2j corrigé` → scorer strictement → si <9,8 corriger immédiatement en 2k et recertifier. Aucun merge ni déploiement Vercel avant le gate correspondant.
