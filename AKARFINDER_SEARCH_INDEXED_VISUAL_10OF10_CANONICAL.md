# AKARFINDER_SEARCH_INDEXED_VISUAL_10OF10_CANONICAL.md

## Chantier
AkarFinder — Search Indexed Visual — 10/10 pass

Dernière mise à jour : 2026-08-28

## Goal
Faire converger les cartes `public_indexed` vers le mockup premium approuvé, illustrations **et carte complète**, sans modifier les cartes partenaires/utilisateurs, le ranking, la data ni la DB.

## Succès observable
- TARGET : mockup utilisateur `Concept premium — Système visuel par type de transaction`.
- AFTER requis : 390×844 / 430×932 / 768×900 / 1280×900 sur le vrai composant `SearchListingCardDark`.
- Achat : maison + pin + clé + skyline légère.
- Location : porte arquée ouverte + petite clé verticale + ville légère + chemin d’entrée.
- Neuf : grue treillis + crochet + structure ouverte de chantier.
- carte : prix groupé lisible, cœur en haut à droite, type + chambres + surface + SDB avec petites icônes, footer source fidèle au TARGET.
- aucune photo tierce pour `public_indexed`.
- aucune collision/clipping.
- findings Chromium = 0.
- aucun 10/10 déclaré si un écart visuel manifeste subsiste.

## État repo
- Repo : `hraaaaf/Akarfinder`
- Base de départ : `main@b36111644ea5d50e3205e8313c8c6bc6b8885a47`
- Branche : `feat/search-indexed-visual-10of10`
- PR : `#947` draft
- HEAD illustrations certifié : `7a62a9ae867626b778cc61ed262ee70d65862542`
- HEAD fonctionnel carte complète candidat : `eb5103fc88a9e4daa5ed8339cc39830043bd163f`
- Vercel : aucun déploiement sans autorisation explicite.

## Preuve illustrations — HEAD `7a62a9ae867626b778cc61ed262ee70d65862542`
- UI All Pages Baseline `33212168952` ✅
- UI All Pages Certification `33212169204` ✅
- artifact baseline `9702172187` ✅
- findings Chromium : `0` ✅
- AFTER 390 / 430 / 768 / 1280 inspectés ✅
- verdict : les trois illustrations sont conformes au TARGET, y compris la petite clé verticale de Location.

## Passe carte complète — HEAD fonctionnel `eb5103fc88a9e4daa5ed8339cc39830043bd163f`
Changements **scopés à `useIndexedArtwork`** :
- prix `public_indexed` formaté avec groupement français (`1 600 000 DH`) ;
- cœur affiché en haut à droite ;
- ligne de faits reconstruite avec petites icônes : type de bien, chambres, surface, salles de bain ;
- cartes non indexées conservent leur rendu existant.

CI exact-HEAD fonctionnel lancée :
- UI All Pages Baseline `33213554007` — en attente au moment de cette mise à jour ;
- UI All Pages Certification `33213554031` — en attente au moment de cette mise à jour.

## CI globale hors diff
Plusieurs workflows historiques Search/Bottom Nav peuvent rester rouges hors diff du présent lot. Les certifications Chromium exact-HEAD du composant constituent la preuve visuelle pertinente ; aucun échec hors diff ne sera maquillé en succès.

## NEXT EXACT
1. Obtenir la certification Chromium de la passe carte complète.
2. Récupérer AFTER 390/430/768/1280.
3. Comparer directement au TARGET : prix / cœur / facts / footer / dessins / mobile.
4. Corriger toute divergence manifeste et recertifier.
5. Si conforme : closeout canonique avec runs/artifact/score final.
6. PR ready → merge → vérification main.
7. Aucun déploiement Vercel sans human gate explicite.

## Avancement
**Actif — illustrations certifiées ; passe carte complète implémentée, certification visuelle finale requise.**
