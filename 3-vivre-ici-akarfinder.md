# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET LOCK conservé / PIVOT MAPLIBRE NATIONAL VALIDÉ / INTÉGRATION `/map` EN POLISH**  
**Dernière mise à jour : 2026-09-10**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche active : `spike/vivre-ici-maplibre-morocco`**  
**PR : `#1025` — OPEN / non mergée / branche distincte `docs/3-vivre-ici-akarfinder`**  
**Fondation produit : `/map`**  
**HEAD MapLibre intégré validé : `6185cfed2d70c371ff6f6c6390f65d1fe7c5fb54`**  
**Main vérifié : `df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2`**  
**Vercel : aucun déploiement sans accord explicite d’Achraf.**

## GOAL
Transformer Vivre ici (`/map`) en expérience territoriale premium : carte héro dominante, quartier lisible, rail desktop éditorial, bottom sheet mobile premium, aucune fausse précision, avec un moteur 3D scalable du quartier au Maroc.

**Succès observable : score visuel final contre le TARGET LOCK + build/TypeScript/tests verts + captures 390/430/768/1280 + truth gate géographique fail-closed + moteur cartographique national réutilisable.**

## TARGET LOCK — AUTORITÉ VISUELLE DURABLE
Cible approuvée explicitement par Achraf : mockup unique Desktop Maârif + Mobile Maârif.

- fichier durable : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- Google Drive ID : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- dimensions : `1536 × 1024`
- SHA-256 : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`
- seuil historique de clôture visuelle : **≥9,8/10**

Le TARGET est une autorité de **composition et qualité visuelle**, pas une autorisation d’inventer photos, prix, météo, scores, proximité, temps, distances ou positions.

## TRUTH GATE GÉOGRAPHIQUE
Audit Supabase production read-only historique :
- `property_listings` : `7 926`, aucune coordonnée exploitable ;
- `geo_entities` : `45`, géométrie exploitable `0` ;
- `geo_resolution_events` : `102`, coordonnée exploitable `0` ;
- `mubawab_listing_corpus_v1` : `37 420`, coordonnée exploitable `0`.

`isExactMapListing` exige `geo_precision="exact"` + provenance `scraped_coordinates|manual_import` + coordonnées valides au Maroc.

**Conclusion historique : `0` bien éligible à un pin/callout EXACT au moment de cet audit. Aucun faux pin bien n’est autorisé.**

## BASELINE 2L.3 — CERTIFICATION TECHNIQUE
Workflow : `Vivre Ici AFTER Certification`  
Run : `34065048997` — **SUCCESS**  
Job : `101572225137` — **SUCCESS**  
HEAD : `1e36c08935673980c36e25725c66324e139f7a0c`  
Artifact : `9998699255` — `vivre-ici-after`  
Digest : `sha256:4bf145289444fd137f7be1593082b55f7694aba33f75cdb74f214595573c0608`

8 captures réelles : National + Casablanca/Maârif en `390×844`, `430×932`, `768×900`, `1280×900`.

Maârif 2L.3 : pitch `46°`, bearing `-14°`, zoom `14.3`, bâtiments `60 / 66 / 105 / 116`, POI `2`, zéro overlap, zéro DB write, zéro deploy.

## INSPECTION VISUELLE TARGET ↔ 2L.3 — PROUVÉE
L’artifact exact `9998699255` a été téléchargé et inspecté. Comparaison visuelle directe TARGET ↔ 2L.3 construite aux mêmes viewports.

**Score manuel de référence 2L.3 : `6,4/10` contre TARGET.**

Écarts structurants constatés : caméra/perspective trop plate, composition desktop incomplète, rail trop pauvre, mobile trop utilitaire, matière satellite/finition éloignée du TARGET.

## PIVOT ARCHITECTURE — MAPLIBRE NATIONAL — VALIDÉ
Le chantier a abandonné la génération manuelle de volumes quartier par quartier au profit d’un moteur MapLibre réutilisable.

Architecture validée :
- `MapLibreNeighborhood3D.tsx` paramétré par ville/quartier/centre ;
- bâtiments vectoriels globaux OpenFreeMap ;
- fond satellite Esri pour le prototype ;
- données quartier issues du registre canonique ;
- aucun asset local de bâtiments Maârif requis ;
- aucune écriture DB ;
- aucun déploiement Vercel.

Benchmark national réel :
- commit : `628947bb24bf247a73c5161b64a25fc47aafe33c`
- run : `34513592437` — **SUCCESS**
- Casablanca / Maârif : `66` volumes desktop
- Rabat / Agdal : `96` volumes desktop
- Marrakech / Guéliz : `53` volumes desktop
- HTTP `200`, render `ready`, source `available`, requêtes cartographiques obligatoires en échec `0`.

**Conclusion : la scalabilité quartier → Maroc est prouvée sur 3 villes avec un même moteur.**

## INTÉGRATION `/map` — VALIDÉE TECHNIQUEMENT
Le moteur MapLibre national est branché dans `NationalMapRouter` pour les couples ville + quartier canoniques, sans remplacer la vue nationale ville seule.

- commit intégration : `11769c0c2e7a9abb262bd19614efb314f9d5b4b3`
- run : `34526882196` — **SUCCESS**
- TypeScript : SUCCESS
- Build : SUCCESS
- captures intégrées : SUCCESS
- artifact : `10171990999`
- digest : `sha256:75c4223becbdb1bfe0f3342a8c64a88a14455b1d59ada3d121546f6fbd4327b0`
- Maârif intégré : `68` volumes desktop, `45` mobile
- zéro DB write / zéro deploy.

## POLISH INTÉGRATION — DOUBLON OUTRO — CORRIGÉ ET PROUVÉ
Premier essai `5917eaf3a990cade76c125640f1b9680f6ba7afa` : CI verte mais BEFORE/AFTER visuellement identique, donc non retenu comme preuve de correction.

Correction effective :
- HEAD : `6185cfed2d70c371ff6f6c6390f65d1fe7c5fb54`
- run : `34531542541` — **SUCCESS**
- artifact : `10173769689`
- digest : `sha256:eb52a650a2dfb26f376fa6779ea31caaeae9600efbe2fd402d21272b1798fb0f`
- TypeScript / Build / Capture : SUCCESS
- desktop 1280 : la bande basse interne MapLibre est réellement supprimée et la carte récupère la hauteur correspondante ;
- mobile 390 : composition stable, pas de régression observée ;
- Maârif : `67` volumes desktop, `45` mobile ;
- HTTP `200`, render `ready`, source `available`, required failed requests `0` ;
- zéro DB write / zéro deploy.

## RECHERCHE / DÉCISIONS À CONSERVER
1. MapLibre est désormais le moteur cible pour la 3D quartier scalable.
2. Le satellite réel reste la matière principale ; les extrusions restent discrètes.
3. Ne pas simuler une photogrammétrie texturée non disponible/vérifiée pour Casablanca.
4. Le TARGET est un neighborhood guide éditorial avec carte héro, pas un dashboard GIS.
5. Le rail ne doit utiliser que du contenu sourcé ; aucun remplissage factice.
6. Le mobile doit rester une expérience dédiée, pas une réduction mécanique du desktop.
7. Avant production, le provider d’imagerie doit avoir un chemin officiellement supporté/licencié ou une conformité explicitement prouvée.
8. Aucun score final ≥9,8 n’est déclaré à ce stade.

## GARDE-FOUS
- aucun ImageGen pour évaluer/certifier le site ;
- aucune nouvelle cible sans décision explicite d’Achraf ;
- aucune photo/score/prix/distance/temps/position inventé ;
- aucun pin immobilier sans EXACT ;
- aucune DB mutation pour ce lot ;
- aucun deploy Vercel sans autorisation explicite ;
- aucun merge PR #1025 avant human gate ;
- aucun ≥9,8 déclaré sans comparaison visuelle prouvée.

## SYNCHRONISATION MAIN / PR
- main vérifié : `df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2`
- PR #1025 : OPEN, mergeable au dernier contrôle ; branche `docs/3-vivre-ici-akarfinder`, distincte du spike MapLibre.
- le spike ne doit pas être mergé directement sans intégration propre avec la branche PR et revalidation finale.

## ROADMAP
- [x] TARGET LOCK durable + SHA-256 + Drive ID
- [x] truth gate géographique fail-closed / `0 EXACT` lors de l’audit de référence
- [x] baseline 2L.3 technique + inspection visuelle
- [x] pivot MapLibre national
- [x] benchmark 3 villes : Casablanca / Rabat / Marrakech
- [x] intégration MapLibre quartier dans `/map`
- [x] correction du doublon d’outro + BEFORE/AFTER réel
- [ ] rail desktop final contre TARGET
- [ ] responsive mobile/tablette final
- [ ] captures finales 390/430/768/1280 + score final honnête
- [ ] intégration du spike dans la branche PR #1025
- [ ] closeout PR body final
- [ ] re-fetch/compare/sync latest main avant merge
- [ ] human merge gate PR #1025
- [ ] Vercel uniquement après autorisation explicite

## NEXT EXACT
**Comparer le rail desktop intégré au TARGET sur la capture 1280 validée du HEAD `6185cfed` → corriger uniquement le défaut dominant du rail sans toucher caméra/3D → recapturer aux mêmes viewports → si validé, passer au polish mobile/tablette.**
