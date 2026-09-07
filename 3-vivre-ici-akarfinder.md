# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — TARGET 9,8/10 LOCKED / ÉTAPE 1 CAMÉRA CERTIFIÉE / ÉTAPE 2 COMPOSITION EN VALIDATION**  
**Dernière mise à jour : 2026-09-07**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche : `docs/3-vivre-ici-akarfinder`**  
**PR : `#1025` — OPEN / non mergée**  
**Fondation produit : `/map`**  
**Baseline 2L.3 certifiée : `1e36c08935673980c36e25725c66324e139f7a0c`**  
**Dernier HEAD visuel étape 1 certifié : `1f93e91befe236dfcec9b5a03a12434e4b50a75f`**  
**HEAD UI étape 2 avant canonique : `4aa0b4ae7faca98726692f20c247d896aad13443`**  
**Main vérifié : `df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2`**  
**Vercel : aucun déploiement sans accord explicite d’Achraf.**

## GOAL
Transformer Vivre ici (`/map`) en expérience territoriale premium : carte héro dominante, quartier lisible, rail desktop éditorial, bottom sheet mobile premium, aucune fausse précision.

**Succès observable : score visuel global ≥9,8/10 contre le TARGET LOCK + build/TypeScript/tests verts + captures 390/430/768/1280 + truth gate géographique fail-closed.**

## TARGET LOCK — AUTORITÉ VISUELLE DURABLE
Cible approuvée explicitement par Achraf : mockup unique Desktop Maârif + Mobile Maârif.

- fichier durable : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- Google Drive ID : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- dimensions : `1536 × 1024`
- SHA-256 : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`
- seuil de clôture : **≥9,8/10**

Le TARGET est une autorité de **composition et qualité visuelle**, pas une autorisation d’inventer photos, prix, météo, scores, proximité, temps, distances ou positions.

## TRUTH GATE GÉOGRAPHIQUE
Audit Supabase production read-only :
- `property_listings` : `7 926`, aucune coordonnée exploitable ;
- `geo_entities` : `45`, géométrie exploitable `0` ;
- `geo_resolution_events` : `102`, coordonnée exploitable `0` ;
- `mubawab_listing_corpus_v1` : `37 420`, coordonnée exploitable `0`.

`isExactMapListing` exige `geo_precision="exact"` + provenance `scraped_coordinates|manual_import` + coordonnées valides au Maroc.

**Conclusion : `0` bien actuellement éligible à un pin/callout EXACT. Aucun faux pin bien n’est autorisé.**

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

Écarts structurants constatés :
1. caméra/perspective trop plate et trop quartier ;
2. composition desktop incomplète ;
3. rail éditorial trop pauvre ;
4. mobile trop utilitaire ;
5. matière satellite/finition encore éloignée du rendu premium cible.

Ce score est une évaluation visuelle par grille, pas une métrique mathématique automatisée.

## ÉTAPE 1 — CAMÉRA / PERSPECTIVE — CERTIFIÉE
Itérations réelles comparées au TARGET. La v4 est retenue comme meilleure base actuelle du stack MapLibre/Esri :

- HEAD : `1f93e91befe236dfcec9b5a03a12434e4b50a75f`
- run : `34125068246` — **SUCCESS**
- artifact : `10019831615` — `vivre-ici-after`
- digest : `sha256:4621d022835b298c14b5e8daca9bd8337ee22d90d4847f763c4124ca724464ac`
- caméra Maârif : zoom `14.0`, pitch `58°`, bearing `-12°`
- bâtiments rendus : `73 / 78 / 119 / 120`
- overlaps : `false` partout
- zéro DB write / zéro deploy

**Score caméra manuel : ~`7,4/10` vs `5,8/10` sur la baseline 2L.3.**

Conclusion : la caméra reste moins spectaculaire que le TARGET mais n’est plus le principal bloqueur visuel. La profondeur réelle et le contexte côte/ville sont présents ; poursuivre les micro-ajustements caméra avant de corriger composition/rail serait de rendement décroissant.

## ÉTAPE 2 — COMPOSITION DESKTOP — EN VALIDATION
Goal : rapprocher la silhouette desktop du TARGET avant toute refonte éditoriale du rail.

Mutation UI actuelle :
- page : bande basse compacte `Découvrez les quartiers autrement` ;
- layout desktop : map/rail intégrés dans une surface beige chaude ;
- hauteur carte/rail réduite pour rendre la bande basse visible dans le viewport ;
- map/rail gardés autour de `70/30` ;
- aucun contenu factuel ajouté.

HEAD UI avant mise à jour canonique : `4aa0b4ae7faca98726692f20c247d896aad13443`.
Run `Vivre Ici AFTER Certification` : `34139351676`, lancé sur ce HEAD ; état au dernier contrôle : `queued`.

Ne pas déclarer l’étape 2 réussie sans artifact + captures AFTER + comparaison TARGET.

## RECHERCHE / DÉCISIONS À CONSERVER
1. Le satellite réel doit rester la matière principale ; les extrusions doivent rester discrètes.
2. Ne pas simuler une photogrammétrie texturée non disponible/vérifiée pour Casablanca.
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
Main vérifié le 2026-09-07 : `df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2`.

**Obligation de reprise : re-fetch branch HEAD + PR #1025 + main, puis comparer/synchroniser avant le merge final.**

## ROADMAP
- [x] TARGET LOCK durable + SHA-256 + Drive ID
- [x] truth gate géographique fail-closed / `0 EXACT`
- [x] baseline 2L.3 technique : 8 captures + verify vert
- [x] artifact exact 2L.3 inspecté
- [x] comparaison TARGET ↔ 2L.3 construite
- [x] score baseline honnête : `6,4/10`
- [x] Étape 1 caméra/perspective : v4 certifiée techniquement et visuellement retenue
- [ ] Étape 2 composition desktop : implementation poussée, AFTER à certifier
- [ ] Étape 3 rail éditorial
- [ ] Étape 4 responsive mobile/tablette
- [ ] Étape 5 polish + captures 390/430/768/1280 + score final
- [ ] closeout canonique final + PR body final
- [ ] re-fetch/compare/sync latest main
- [ ] human merge gate PR #1025
- [ ] Vercel uniquement après autorisation explicite

## NEXT EXACT
**Laisser le run `34139351676` produire l’artifact sans polling passif → télécharger `vivre-ici-after` → afficher les captures AFTER 1280/768/430/390 → comparer TARGET ↔ AFTER → scorer l’étape 2. Si insuffisant : corriger uniquement la composition ; si validé : enchaîner immédiatement sur l’étape 3 rail éditorial.**
