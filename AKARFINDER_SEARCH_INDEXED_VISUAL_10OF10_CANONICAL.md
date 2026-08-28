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
- Location : porte arquée ouverte + clé + ville légère.
- Neuf : grue détaillée + structure de chantier.
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
- HEAD fonctionnel de la passe SVG exacte : `6787399e4a09d7537c5625eea49f6d9835a26e75`
- Vercel : aucun déploiement sans autorisation explicite.

## Implémentation
- `IndexedTransactionArtwork.tsx` : trois tracés SVG reconstruits à partir du mockup.
- Achat : maison centrée, pin intérieur, clé sous la maison, skyline et courbes de sol légères.
- Location : arche, porte ouverte, clé à droite, ville et végétation légères.
- Neuf : grue détaillée avec treillis, flèche, crochet, structure de chantier quadrillée et arbres.
- aucune image raster ni URL externe utilisée pour ces illustrations.
- labels premium intégrés dans l'artwork.
- CSS scoped aux cartes `data-indexed-artwork-card=true`.
- overlays redondants masqués pour `public_indexed`.
- prix/provenance colorés par transaction.
- CTA primaire et lien mobile redondant masqués pour les cartes indexées.

## Passe précédente certifiée — HEAD `b2690f320ed1d67f4eee9a05fedea1987a5ccb58`
- UI All Pages Baseline `33206268727` ✅
- UI All Pages Certification `33206268836` ✅
- artifact baseline `9699951155` ✅

Inspection réelle :
- structure de carte nettement rapprochée du TARGET ;
- mobile nettoyé ;
- dessins encore trop interprétés, surtout `Neuf`, donc **refusé comme 10/10**.

## Passe actuelle — SVG reconstruits
HEAD fonctionnel : `6787399e4a09d7537c5625eea49f6d9835a26e75`.

Goal de cette passe : ne plus seulement s'inspirer des dessins, mais reproduire leurs compositions dans le vrai composant.

## CI globale hors diff
Plusieurs workflows historiques Search/Bottom Nav restent susceptibles d'échouer hors diff du présent lot. Les certifications Chromium exact-HEAD du composant constituent la preuve visuelle requise ; aucun échec hors diff ne sera maquillé en succès.

## NEXT EXACT
1. Obtenir la CI Chromium exact-HEAD de la passe SVG reconstruite.
2. Récupérer AFTER 390/430/768/1280.
3. Comparer directement au TARGET.
4. Si une divergence visuelle notable subsiste : corriger et recertifier.
5. Déclarer 10/10 uniquement si la comparaison le justifie réellement.
6. Closeout canonique → ready → merge uniquement après preuve 10/10.
7. Aucun déploiement Vercel sans human gate explicite.

## Avancement
**Actif — tracés SVG du mockup intégrés dans l’application ; certification visuelle requise.**
