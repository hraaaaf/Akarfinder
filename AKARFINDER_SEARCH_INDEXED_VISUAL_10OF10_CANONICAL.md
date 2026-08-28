# AKARFINDER_SEARCH_INDEXED_VISUAL_10OF10_CANONICAL.md

## Chantier
AkarFinder — Search Indexed Visual — 10/10 pass

Dernière mise à jour : 2026-08-28

## Goal
Faire converger les cartes `public_indexed` vers le mockup premium approuvé, avec reproduction vectorielle dans l’application des trois compositions visuelles de référence.

## Succès observable
- BEFORE : certification Chromium du lot P1, run `33196086594`, artifact `9695997166`.
- TARGET : mockup utilisateur `Concept premium — Système visuel par type de transaction` fourni dans la conversation.
- AFTER requis : 390×844 / 430×932 / 768×900 / 1280×900 sur le vrai composant `SearchListingCardDark`.
- Achat : maison + pin + clé + skyline légère.
- Location : porte arquée ouverte + ville légère + chemin d’entrée.
- Neuf : grue treillis + crochet + structure ouverte de chantier.
- même échelle, respiration et finesse de trait que le TARGET.
- aucune collision badge / disclosure sur mobile.
- footer complet et lisible sur mobile et desktop.
- aucune photo tierce ; aucune modification ranking/data/DB.
- findings Chromium = 0.
- ne jamais déclarer 10/10 si un écart visuel manifeste subsiste.

## État repo
- Repo : `hraaaaf/Akarfinder`
- Base de départ : `main@b36111644ea5d50e3205e8313c8c6bc6b8885a47`
- Branche : `feat/search-indexed-visual-10of10`
- PR : `#947` draft
- HEAD fonctionnel du retracé final avant ce commit documentaire : `e0d0c29523f96bc3bab83cb3ca58f81e288ccef8`
- Vercel : aucun déploiement sans autorisation explicite.

## Implémentation finale candidate
- `IndexedTransactionArtwork.tsx` : dernier retracé manuel à partir des crops du mockup approuvé.
- Fond illustration rendu blanc pour retrouver la respiration réelle du TARGET.
- Achat : maison plus basse et étroite, double toit léger, pin recentré, clé posée sur l’horizon, skyline/terrain atténués.
- Location : double arche, porte cobalt pleine en perspective, petite poignée blanche, suppression de la grosse clé flottante qui n’existe pas sur le dessin principal du TARGET, chemin d’entrée courbe et ville légère.
- Neuf : tour treillis compacte, sommet triangulé, contrepoids/flèche, crochet, structure ouverte plus légère et proportions rapprochées du TARGET.
- aucune image raster ni URL externe utilisée.
- cartes partenaires/utilisateurs, ranking, data et DB inchangés.

## Passe précédente certifiée — HEAD `8741c606d631c53c6f183ceaeace8289b68cf64d`
- UI All Pages Baseline `33208151451` ✅
- UI All Pages Certification `33208151387` ✅
- artifact baseline `9700686701` ✅
- findings Chromium : `0` ✅

Inspection directe TARGET/AFTER :
- structure et responsive propres ;
- dessins nettement rapprochés ;
- score visuel estimé `9,5/10`, donc **refusé comme 10/10** en raison de divergences fines de proportions sur maison, porte et grue.

## Passe actuelle — retracé final
HEAD fonctionnel : `e0d0c29523f96bc3bab83cb3ca58f81e288ccef8`.

## CI globale hors diff
Plusieurs workflows historiques Search/Bottom Nav peuvent rester rouges hors diff du présent lot. Les certifications Chromium exact-HEAD du composant constituent la preuve visuelle pertinente ; aucun échec hors diff ne sera maquillé en succès.

## NEXT EXACT
1. Obtenir la CI Chromium exact-HEAD de la passe finale.
2. Récupérer AFTER 390/430/768/1280.
3. Comparer directement au TARGET.
4. Si une divergence visuelle manifeste subsiste : corriger et recertifier.
5. Déclarer 10/10 uniquement si la comparaison le justifie réellement.
6. Closeout canonique → ready → merge après preuve.
7. Aucun déploiement Vercel sans human gate explicite.

## Avancement
**Actif — dernier retracé SVG poussé ; certification visuelle finale requise.**
