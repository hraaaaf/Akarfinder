# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET 9,8/10 LOCKED / 2K CERTIFIÉ / REFRAME RESEARCH LOCKED**  
**Dernière mise à jour : 2026-09-06**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `docs/3-vivre-ici-akarfinder`**  
**PR : `#1025` — OPEN**  
**Fondation produit : `/map`**  
**Vercel : aucun déploiement sans accord explicite d’Achraf.**

## GOAL
Transformer Vivre ici (`/map`) en expérience territoriale premium : carte héro dominante, quartier lisible, rail desktop éditorial, bottom sheet mobile premium, aucune fausse précision.

**Succès observable : score visuel global ≥9,8/10 contre le TARGET LOCK + build/TypeScript/tests verts + captures 390/430/768/1280 + truth gate géographique fail-closed.**

## TARGET LOCK — 2026-09-06 — AUTORITÉ VISUELLE
Cible approuvée explicitement par Achraf : mockup unique Desktop Maârif + Mobile Maârif.

- fichier : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- Google Drive ID : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- dimensions : `1536 × 1024`
- taille originale : `2 879 788` octets
- SHA-256 : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`
- seuil de clôture : **≥9,8/10**

Le mockup est une autorité de **composition et qualité visuelle**, pas une autorisation d’inventer photos, prix, météo, scores, proximité, temps, distances ou positions.

## TRUTH GATE GÉOGRAPHIQUE
Audit Supabase production read-only :
- `property_listings` : `7 926`, aucune coordonnée exploitable ;
- `geo_entities` : `45`, géométrie exploitable `0` ;
- `geo_resolution_events` : `102`, coordonnée exploitable `0` ;
- `mubawab_listing_corpus_v1` : `37 420`, coordonnée exploitable `0`.

`isExactMapListing` exige `geo_precision="exact"` + provenance `scraped_coordinates|manual_import` + coordonnées valides au Maroc.

**Conclusion : `0` bien actuellement éligible à un pin/callout EXACT. Aucun faux pin bien n’est autorisé.**

## PREUVES DE CONVERGENCE — DERNIER ÉTAT
Historique utile : 2a ~6,5/10 → 2b ~7,4 → intermédiaire ~7,6 → 2c ~8,1 → 2d ~8,8 ancienne cible → 2f/2g haut 8 → 2i techniquement vert mais sous TARGET LOCK.

### Lot 2j — convergence éditoriale
Code initial : `db43f168a262a58be2b7825a7773df960b59db05`.

Premier run dédié `34057285291` : build/TypeScript verts, échec capture uniquement sur `topChromeToggleOverlap=true` en Maârif 1280.

Correctif minimal :
- commit `6dccce7c148da6e1e21eab9d24f71e2032aff61c` ;
- run `34059445434` ;
- job `101557220830` ;
- artifact `9997023623` ;
- digest `sha256:4f3b8686409e7f04e76625c2931a517ac0c8e9bec95ec86396ffa2ae104b8e1d` ;
- 8 captures réelles produites ;
- capture AFTER ✅ ; verify AFTER ✅ ; overlap corrigé ✅ ;
- zéro DB write / zéro deploy.

Verdict visuel : **2j corrigé reste nettement sous 9,8**. Gap principal : carte vectorielle/3D trop technique et rail/mobile trop pauvres face au TARGET.

### Lot 2k — satellite réel sous bâtiments 3D
Commit : `d2d89c88e9e9c5b185851e914ed788740ecd04f9`.

Implémentation :
- source raster Esri World Imagery sous le rendu 3D ;
- attribution intégrée ;
- fallback vectoriel conservé ;
- aucune donnée immobilière inventée.

Certification :
- workflow `Vivre Ici AFTER Certification` ;
- run `34059691255` ;
- job `101557881082` ;
- conclusion `SUCCESS` ;
- artifact `9997112230` ;
- digest `sha256:9f1919b914f703614429025761aff6ce65254b9a14daa54872c381f539fb36ea` ;
- contracts ✅ TypeScript ✅ build ✅ Chromium ✅ capture ✅ verify ✅ upload artifact ✅.

Paramètres 2k actuellement vérifiés dans `National3DBuildingsLayer.tsx` :
- zoom `15.5` ; pitch `60°` ; bearing `-28°` ;
- raster opacity `0.93` ;
- extrusion opacity `0.82` ;
- labels de fond fortement atténués.

Verdict visuel : **amélioration majeure du matériau de carte, mais écart structurel toujours important**. Le TARGET montre une vue urbaine beaucoup plus large, aérienne et éditoriale ; 2k reste block-level avec extrusions trop dominantes.

## RECHERCHE EXTERNE — 2026-09-06 — DÉCISION MÉTHODOLOGIQUE
Recherche effectuée avant toute nouvelle modification UI, à partir de documentation primaire MapLibre, Mapbox, Esri/ArcGIS et Google Map Tiles, complétée par l’étude UX de Zillow/Redfin/Idealista/StreetEasy.

### Constats vérifiés
1. **Caméra** : les exemples officiels 3D MapLibre/Mapbox utilisent typiquement un pitch autour de `45°` à zoom ~`15.5`, pas `60°` comme 2k. Le TARGET, lui, est beaucoup plus large que le cadrage actuel ; sa composition ne doit donc pas être poursuivie en restant bloqué à zoom 15.5.
2. **Extrusions** : l’exemple Mapbox 3D utilise une extrusion sensiblement plus transparente (`~0.6`). À `0.82`, 2k masque trop l’imagerie et crée un effet de maquette beige.
3. **Satellite-first** : MapLibre supporte officiellement raster satellite, hybrid satellite/terrain et couches 3D. La voie propre est donc de faire de l’imagerie réelle la matière principale puis de superposer une 3D discrète.
4. **Photorealistic 3D** : Google propose bien des Photorealistic 3D Tiles, mais la table de couverture actuelle ne confirme pas la surface 3D pour le Maroc. **Ne pas baser Casablanca sur cette technologie sans validation explicite de couverture/API.**
5. **Esri production** : le chemin développeur moderne Esri/MapLibre repose sur les services de basemap avec accès authentifié + attribution. Le endpoint legacy utilisé en 2k doit être validé juridiquement/techniquement ou remplacé par le chemin officiel avant production.
6. **Modèle produit** : le TARGET ressemble davantage à un **neighborhood guide éditorial avec carte héro** qu'à une interface de recherche cartographique technique. Les produits immobiliers de référence séparent généralement recherche carte et contenu de quartier/guide ; le rail doit donc raconter le quartier avec des faits sourcés, pas afficher un dashboard vide.
7. **Média quartier** : une photo Wikimedia explicitement prise depuis Maârif et publiée CC0 a été identifiée comme candidate, mais les droits liés à certains bâtiments marocains nécessitent prudence. Aucun média architecture-focused ne sera intégré sans validation de licence/usage.

### Décision
**STOP aux micro-retouches 2l/2m/2n.**  
La prochaine passe est une reconstruction structurante nommée **2L REFRAME**.

## LOT 2L — REFRAME RESEARCH-BACKED
### Goal
Rapprocher la **composition** du TARGET sans prétendre disposer d'une photogrammétrie 3D inexistante/non vérifiée et sans inventer de contenu.

### Success
- même hiérarchie générale que TARGET desktop/mobile ;
- carte aérienne = matériau dominant ;
- cadrage urbain beaucoup plus large et respirant ;
- extrusions discrètes, sans effet “blocs beige” ;
- rail desktop réellement éditorial et dense uniquement avec contenu sourcé ;
- mobile = carte héro + sheet compact, pas copie réduite du dashboard desktop ;
- attribution fournisseur conforme et visuellement maîtrisée ;
- zéro fausse donnée ;
- 390/430/768/1280 sans overlap ;
- build/TypeScript/tests verts ;
- comparaison directe TARGET ↔ AFTER avant toute déclaration de score.

### Plan d'implémentation verrouillé
1. **Reframe caméra** : partir d'une vue Casablanca/Maârif plus large ; tuner zoom/pitch/bearing contre TARGET par captures, pas par intuition.
2. **Satellite-first** : conserver l'imagerie réelle visible ; réduire fortement la domination des extrusions et des overlays territoriaux.
3. **3D sobre** : extrusions plus transparentes et éclairage plus naturel ; aucune tentative de simuler de la photogrammétrie texturée avec des blocs opaques.
4. **Rail éditorial** : reconstruire la hiérarchie title/context/story/facts/POI/CTA ; supprimer les grands vides ; ne montrer que faits et médias sourcés.
5. **Mobile dédié** : simplifier top controls ; donner la majorité de la hauteur à la carte ; sheet unique, compacte, riche en contenu réellement disponible.
6. **Provider cleanup** : avant production, utiliser un chemin d'imagerie officiellement supporté/licencié ou prouver explicitement la conformité du service retenu.
7. **Certification** : BEFORE 2k conservé → implémentation 2L → AFTER mêmes viewports → contact sheet → TARGET vs 2L → score honnête → correction suivante seulement sur écarts prouvés.

## GARDE-FOUS
- aucun ImageGen pour évaluer ou certifier le site ;
- aucune nouvelle cible : TARGET LOCK reste inchangé ;
- aucune photo/score/prix/distance/temps/position inventé ;
- aucun pin immobilier sans EXACT ;
- aucun deploy Vercel sans autorisation explicite ;
- aucun ≥9,8 déclaré sans comparaison visuelle prouvée.

## SYNCHRONISATION MAIN
Dernière sync explicitement prouvée dans ce chantier : main `b8c89681358e93ec254016bcca9b78f4717ea8de`, merge sync `f7c28368ce2d9de54be42985e8c690fa3c6e080f`. À revérifier avant merge final.

## ROADMAP
- [x] TARGET LOCK durable + SHA-256
- [x] Truth gate géographique fail-closed / `0 EXACT`
- [x] 2i techniquement vérifié
- [x] 2j corrigé et certifié techniquement
- [x] comparaison 2j ↔ TARGET : gap structurel confirmé
- [x] 2k satellite réel implémenté et certifié
- [x] comparaison 2k : gap structurel confirmé
- [x] recherche externe primaire effectuée avant reprise
- [x] méthode **2L REFRAME** verrouillée
- [ ] BEFORE 2L : conserver/figer captures 2k 390/430/768/1280
- [ ] 2L REFRAME implémentation structurante
- [ ] 2L certification + 8 captures
- [ ] TARGET LOCK ↔ 2L desktop/mobile
- [ ] correction uniquement selon écarts prouvés
- [ ] certification finale visuelle ≥9,8 si réellement atteinte
- [ ] canonical closeout final
- [ ] human gate merge PR #1025
- [ ] Vercel uniquement après autorisation explicite

## NEXT EXACT
**Ne plus micro-polir 2k.** Figer 2k comme BEFORE → implémenter 2L REFRAME selon le plan ci-dessus → recertifier → montrer les captures réelles → comparer strictement au TARGET LOCK. Aucun merge ni déploiement Vercel avant les gates correspondants.
