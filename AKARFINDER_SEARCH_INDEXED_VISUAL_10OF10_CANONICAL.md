# AKARFINDER_SEARCH_INDEXED_VISUAL_10OF10_CANONICAL.md

## Chantier
AkarFinder — Search Indexed Visual — 10/10 pass

Dernière mise à jour : 2026-08-28

## Goal
Faire converger les cartes `public_indexed` vers le mockup premium approuvé : illustration propriétaire fine et aérée, badge transaction coloré, `Annonce indexée` lisible, prix et accents cohérents avec Achat / Location / Neuf, corps de carte plus éditorial et moins "UI générique".

## Succès observable
- BEFORE : certification Chromium du lot P1, run `33196086594`, artifact `9695997166`.
- TARGET : mockup utilisateur "Concept premium — Système visuel par type de transaction" fourni dans la conversation.
- AFTER requis : 390×844 / 430×932 / 768×900 / 1280×900 sur le vrai composant `SearchListingCardDark`.
- Achat orange / Location cobalt / Neuf émeraude immédiatement identifiables.
- Line-art plus fin et plus proche du TARGET.
- Suppression des overlays/pills redondants dans la zone illustration.
- Prix et provenance reprennent la couleur transactionnelle.
- Facts visuellement allégés.
- Gros CTA desktop supprimé pour les cartes indexées afin de retrouver le footer léger du TARGET.
- aucune photo tierce ; aucune modification ranking/data/DB.
- findings Chromium = 0.

## État repo
- Repo : `hraaaaf/Akarfinder`
- Base de départ : `main@b36111644ea5d50e3205e8313c8c6bc6b8885a47`
- Branche : `feat/search-indexed-visual-10of10`
- HEAD fonctionnel initial : `2781264eefa52039ede962cea12a06fe4118849d`
- Vercel : aucun déploiement sans autorisation explicite.

## Implémentation en cours
- `IndexedTransactionArtwork.tsx` : line-art affiné, compositions rapprochées du mockup.
- labels premium intégrés dans l'artwork.
- CSS scoped aux cartes `data-indexed-artwork-card=true` pour rapprocher le vrai composant du TARGET sans toucher les cartes partenaires/utilisateurs.
- overlays redondants masqués pour `public_indexed`.
- prix/provenance colorés par transaction.
- facts débarrassés des pills.
- CTA primaire desktop masqué pour les cartes indexées.

## NEXT EXACT
1. Ouvrir PR draft.
2. Lancer/observer la CI sur HEAD exact.
3. Récupérer les AFTER 390/430/768/1280.
4. Comparer BEFORE/TARGET/AFTER.
5. Corriger jusqu'à absence de défaut critique ; ne jamais déclarer 10/10 sans preuve visuelle.
6. Closeout canonique → ready → merge si preuves vertes.
7. Aucun déploiement Vercel sans human gate explicite.
