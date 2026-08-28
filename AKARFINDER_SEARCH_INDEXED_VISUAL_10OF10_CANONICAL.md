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
- Line-art fin et aéré au niveau du TARGET.
- aucune collision badge / disclosure sur mobile.
- footer complet et lisible sur mobile et desktop.
- Suppression des overlays/pills redondants dans la zone illustration.
- Prix et provenance reprennent la couleur transactionnelle.
- Facts visuellement allégés.
- Gros CTA desktop supprimé pour les cartes indexées afin de retrouver le footer léger du TARGET.
- aucune photo tierce ; aucune modification ranking/data/DB.
- findings Chromium = 0.
- ne jamais déclarer 10/10 si un écart visuel manifeste subsiste.

## État repo
- Repo : `hraaaaf/Akarfinder`
- Base de départ : `main@b36111644ea5d50e3205e8313c8c6bc6b8885a47`
- Branche : `feat/search-indexed-visual-10of10`
- PR : `#947` draft
- HEAD fonctionnel courant avant ce commit documentaire : `d511b6c0e1be9063dc739f160fcd72abcffc43b0`
- Vercel : aucun déploiement sans autorisation explicite.

## Implémentation
- `IndexedTransactionArtwork.tsx` : line-art affiné, compositions rapprochées du mockup.
- labels premium intégrés dans l'artwork.
- CSS scoped aux cartes `data-indexed-artwork-card=true` pour rapprocher le vrai composant du TARGET sans toucher les cartes partenaires/utilisateurs.
- overlays redondants masqués pour `public_indexed`.
- prix/provenance colorés par transaction.
- facts débarrassés des pills.
- CTA primaire desktop masqué pour les cartes indexées.
- footer réécrit visuellement vers `Annonce indexée / Voir sur la source ↗`.

## Passe rejetée — HEAD `687b866ce51cb6dd098b39a384d26135e2942297`
CI :
- UI All Pages Baseline `33202660902` ✅
- UI All Pages Certification `33202660789` ✅
- artifact certification `9698539870` ✅

Inspection réelle :
- desktop 1280 : convergence nette avec le TARGET, mais pas suffisante pour déclarer 10/10 ;
- mobile 390 : **échec visuel** — collision du badge transaction et de `Annonce indexée`, footer tronqué, lien mobile supplémentaire absent du TARGET.

Conclusion : cette passe est explicitement **REFUSÉE comme 10/10** malgré la CI Chromium verte.

## Correction suivante — HEAD `d511b6c0e1be9063dc739f160fcd72abcffc43b0`
- badge transaction réduit sur mobile ;
- `Annonce indexée` repositionné à droite sur mobile, centré seulement à partir de `sm` ;
- footer mobile compacté pour conserver les deux libellés complets ;
- lien mobile redondant `Voir l’annonce` masqué sur les cartes indexées ;
- desktop inchangé dans son principe.

## CI globale hors diff
Le workflow `UX-SEARCH-FINAL-10OF10-1` sur la passe précédente échoue avant ses screenshots sur deux contrats Bottom Nav historiques (`Compte` et `/profil-recherche`). Ce défaut est hors des 2 fichiers du présent lot. Les certifications Chromium exhaustives du composant restent les preuves visuelles pertinentes ; aucun échec hors diff n’est maquillé en succès.

## NEXT EXACT
1. Obtenir la CI Chromium exact-HEAD de la passe `d511b6c0...`.
2. Récupérer AFTER 390/430/768/1280.
3. Comparer au TARGET.
4. Si une collision, troncature ou divergence notable subsiste : corriger et recertifier.
5. Déclarer 10/10 seulement si la comparaison visuelle le justifie réellement.
6. Closeout canonique → ready → merge uniquement après preuve 10/10.
7. Aucun déploiement Vercel sans human gate explicite.

## Avancement
**Actif — dernière passe visuelle rejetée ; correction mobile poussée ; recertification requise.**
