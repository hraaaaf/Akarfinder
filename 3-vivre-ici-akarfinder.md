# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET 9,8/10 LOCKED / 2L.3 TECHNIQUEMENT CERTIFIÉ / SCORE VISUEL FINAL À CERTIFIER**  
**Dernière mise à jour : 2026-09-07**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `docs/3-vivre-ici-akarfinder`**  
**PR : `#1025` — OPEN**  
**Fondation produit : `/map`**  
**HEAD produit 2L.3 certifié : `1e36c08935673980c36e25725c66324e139f7a0c`**  
**Main observé avant handover : `84c1a01141f23246cf0c62a183acc270ac50b71b`**  
**Vercel : aucun déploiement sans accord explicite d’Achraf.**

## GOAL
Transformer Vivre ici (`/map`) en expérience territoriale premium : carte héro dominante, quartier lisible, rail desktop éditorial, bottom sheet mobile premium, aucune fausse précision.

**Succès observable : score visuel global ≥9,8/10 contre le TARGET LOCK + build/TypeScript/tests verts + captures 390/430/768/1280 + truth gate géographique fail-closed.**

## TARGET LOCK — AUTORITÉ VISUELLE DURABLE
Cible approuvée explicitement par Achraf : mockup unique Desktop Maârif + Mobile Maârif.

- fichier durable : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- Google Drive ID : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- Google Drive URL : `https://drive.google.com/file/d/1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL/view?usp=drivesdk`
- dimensions : `1536 × 1024`
- taille originale : `2 879 788` octets
- SHA-256 : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`
- seuil de clôture : **≥9,8/10**

Le chemin local historique `/mnt/data/wide_clean_ui_mockup_image_of_a_real_estate_neigh.png` est **éphémère** et ne doit jamais être la source de reprise. La source durable est le fichier Drive ci-dessus, contrôlé par nom + dimensions + SHA-256.

Le TARGET est une autorité de **composition et qualité visuelle**, pas une autorisation d’inventer photos, prix, météo, scores, proximité, temps, distances ou positions.

## TRUTH GATE GÉOGRAPHIQUE
Audit Supabase production read-only :
- `property_listings` : `7 926`, aucune coordonnée exploitable ;
- `geo_entities` : `45`, géométrie exploitable `0` ;
- `geo_resolution_events` : `102`, coordonnée exploitable `0` ;
- `mubawab_listing_corpus_v1` : `37 420`, coordonnée exploitable `0`.

`isExactMapListing` exige `geo_precision="exact"` + provenance `scraped_coordinates|manual_import` + coordonnées valides au Maroc.

**Conclusion : `0` bien actuellement éligible à un pin/callout EXACT. Aucun faux pin bien n’est autorisé.**

## CONVERGENCE — HISTORIQUE UTILE
- 2j corrigé : `6dccce7c148da6e1e21eab9d24f71e2032aff61c`, techniquement certifié, toujours sous TARGET.
- 2k : `d2d89c88e9e9c5b185851e914ed788740ecd04f9`, satellite réel Esri sous bâtiments 3D, techniquement certifié, gap structurel confirmé.
- recherche externe primaire MapLibre/Mapbox/Esri/Google + benchmark immobilier : décision de stopper les micro-polish et reconstruire en **2L REFRAME**.

## 2L REFRAME — ÉTAT ACTUEL
Objectif méthodologique : satellite-first, cadrage plus large, 3D discrète, rail éditorial truth-safe, mobile dédié, aucune photogrammétrie ou donnée fictive.

Commits structurants vérifiés :
- `f4a4fff904edb7a568f21131d3fe2e5f6c3f3121` — restore subtle 3D depth ;
- `1f6268f543d603370d677815e0c0966e393a335e` — align AFTER gate avec la caméra 2L.1 ;
- `fd9232b69f545d1058eab399e77aef544e471bd7` — brighten 2L satellite hierarchy ;
- `1e36c08935673980c36e25725c66324e139f7a0c` — refine 2L editorial split and typography.

### Certification technique 2L.3 — PROUVÉE
Workflow : `Vivre Ici AFTER Certification`  
Run : `34065048997` — **SUCCESS**  
Job : `101572225137` — **SUCCESS**  
HEAD certifié : `1e36c08935673980c36e25725c66324e139f7a0c`  
Artifact : `9998699255` — `vivre-ici-after`  
Taille artifact : `5 255 919` octets  
Digest ZIP : `sha256:4bf145289444fd137f7be1593082b55f7694aba33f75cdb74f214595573c0608`

Étapes vertes : contracts ✅ TypeScript ✅ production build ✅ Chromium ✅ capture AFTER ✅ verify AFTER ✅ upload artifact ✅.

Le verifier prouve **8 captures** : National + Casablanca/Maârif aux viewports `390×844`, `430×932`, `768×900`, `1280×900`.

Métriques Maârif vérifiées :
- pitch `46°`, bearing `-14°`, zoom `14.3` ;
- 3D layer/source présents ;
- bâtiments rendus : `60 / 66 / 105 / 116` selon viewport ;
- POI : `2` ;
- mobile bottom sheet : `170.875 px` ;
- desktop 1280 : map `890 px`, rail `350 px`, map share `0.6953125` ;
- `topChromeDistrictOverlap=false` et `topChromeToggleOverlap=false` partout ;
- `zeroDbWritesByScript=true` ;
- `zeroDeploymentActionsByScript=true`.

**Limite : cette certification est technique. Le score visuel 2L.3 contre TARGET LOCK n’est PAS encore certifié. Ne jamais déclarer ≥9,8 sans inspection de l’artifact et comparaison directe.**

## RECHERCHE / DÉCISIONS À CONSERVER
1. Le satellite réel doit rester la matière principale ; les extrusions doivent rester discrètes.
2. Ne pas tenter de simuler une photogrammétrie texturée non disponible/vérifiée pour Casablanca.
3. Le TARGET est un neighborhood guide éditorial avec carte héro, pas un dashboard GIS.
4. Le rail ne doit utiliser que du contenu sourcé ; aucun remplissage factice.
5. Le mobile doit rester une expérience dédiée, pas une réduction mécanique du desktop.
6. Avant production, le provider d’imagerie doit avoir un chemin officiellement supporté/licencié ou une conformité explicitement prouvée.

## GARDE-FOUS
- aucun ImageGen pour évaluer/certifier le site ;
- aucune nouvelle cible sans décision explicite d’Achraf ;
- aucune photo/score/prix/distance/temps/position inventé ;
- aucun pin immobilier sans EXACT ;
- aucune DB mutation pour ce lot ;
- aucun deploy Vercel sans autorisation explicite ;
- aucun merge PR #1025 avant le human gate ;
- aucun ≥9,8 déclaré sans comparaison visuelle prouvée.

## SYNCHRONISATION MAIN
- dernière ancienne sync documentée : main `b8c89681358e93ec254016bcca9b78f4717ea8de`, merge `f7c28368ce2d9de54be42985e8c690fa3c6e080f` ;
- main observé au handover : `84c1a01141f23246cf0c62a183acc270ac50b71b`.

**Obligation de reprise : re-fetch branch HEAD + PR #1025 + main, puis comparer/synchroniser avant le merge final. Ne pas supposer que main est resté immobile.**

## ROADMAP
- [x] TARGET LOCK durable + SHA-256 + Drive ID/URL
- [x] truth gate géographique fail-closed / `0 EXACT`
- [x] 2j techniquement certifié
- [x] 2k satellite-first techniquement certifié
- [x] recherche externe primaire + méthode 2L verrouillées
- [x] 2L REFRAME implémenté
- [x] 2L.1 profondeur 3D restaurée
- [x] AFTER gate modernisé sans supprimer l’exigence de bâtiments réellement rendus
- [x] 2L.2 hiérarchie satellite
- [x] 2L.3 split éditorial / typographie
- [x] 2L.3 AFTER technique : 8 captures + verify vert
- [ ] télécharger/inspecter l’artifact exact `9998699255`
- [ ] construire comparaison même viewport `TARGET LOCK ↔ 2L.3`
- [ ] attribuer un score visuel honnête
- [ ] si `<9,8` : corriger uniquement les écarts prouvés puis recertifier
- [ ] closeout canonique final + PR body final
- [ ] re-fetch/compare/sync latest main
- [ ] human merge gate PR #1025
- [ ] Vercel uniquement après autorisation explicite

## NEXT EXACT
**Télécharger artifact `9998699255` du run `34065048997` → inspecter les 8 captures réelles → construire une comparaison même viewport TARGET LOCK ↔ 2L.3 → scorer honnêtement → si <9,8 corriger uniquement les gaps visuellement prouvés puis recertifier. Ensuite seulement : closeout canonique/PR → compare/sync latest main → human merge gate.**
