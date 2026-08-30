# AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md

## Chantier
AkarFinder — Search Property Type Visual System

Statut : ACTIVE
Date de verrouillage TARGET : 2026-08-30
Branche : `feat/search-property-type-visuals`
Base de départ : `main@66715e555ccf1ee6f5edf82f1b69fc57a0587cb8`

## TARGET VISUEL — APPROVED / LOCKED

Référence validée par l’utilisateur : mockup « Concept premium — Système visuel par type de bien » fourni le 2026-08-30.

Identité du fichier source validé :
- nom source : `5867AEDD-B66C-44C7-B716-E80590EFE467.jpeg`
- dimensions : `1448 × 1086`
- format : JPEG / RGB
- taille : `492052` octets
- SHA-256 : `004b46faab6a642674b9dac1eb623599418c3e22564884e38f2304725ce0909a`

Règle : aucune régénération, variation ou interprétation ultérieure ne remplace cette identité de TARGET sans nouvelle validation explicite utilisateur.

> Limitation connecteur actuelle : la mutation GitHub disponible sait écrire du texte mais ne sait pas transférer directement le binaire local JPEG. Le SHA-256 ci-dessus est donc l’identité canonique de l’image source. Une copie binaire GitHub ne pourra être déclarée présente que lorsqu’elle aura réellement été poussée et revérifiée au même SHA.

## Goal

Reproduire dans le vrai `/search` le langage visuel du TARGET pour les annonces indexées sans photo, en faisant dépendre l’illustration principale du **type de bien** plutôt que du seul type de transaction, sans modifier ranking, données métier ou DB.

## Succès observable

1. Les six familles du TARGET sont reconnaissables au premier coup d’œil :
   - Appartement
   - Villa
   - Terrain
   - Bureau
   - Local commercial
   - Riad
2. Chaque famille possède son illustration propriétaire et son code couleur cohérents avec le TARGET.
3. Les annonces `public_indexed` sans photo utilisent le système par type de bien dans le vrai composant Search.
4. Aucun asset tiers n’est utilisé pour simuler une photo de bien indexé.
5. La hiérarchie carte reste alignée au TARGET : badge type, illustration, prix, titre, localisation, facts, provenance/source.
6. Aucun clipping, collision ou overflow aux viewports canoniques.
7. Ranking/data/DB inchangés.

## Preuve obligatoire

Séquence obligatoire :
`BEFORE → Goal → TARGET LOCKED → implémentation → AFTER mêmes viewports → comparaison → tests → score visuel`.

Viewports canoniques :
- 390×844
- 430×932
- 768×900
- 1280×900

BEFORE de départ : produit `main@66715e555ccf1ee6f5edf82f1b69fc57a0587cb8`, où `public_indexed` utilise encore `IndexedTransactionArtwork` par transaction.

## Spécification visuelle verrouillée

### Appartement
- couleur : bleu azur
- illustration : immeuble résidentiel urbain, line-art fin
- perception : modernité, confort, proximité

### Villa
- couleur : vert émeraude
- illustration : villa avec jardin / portail
- perception : espace, prestige, tranquillité

### Terrain
- couleur : orange terre
- illustration : parcelle balisée + repère
- perception : potentiel, projet, valorisation

### Bureau
- couleur : violet dynamique
- illustration : tour / immeuble de bureaux
- perception : business, professionnalisme, performance

### Local commercial
- couleur : bleu turquoise
- illustration : façade commerciale / vitrine
- perception : commerce, visibilité, activité

### Riad
- couleur : or chaleureux
- illustration : patio traditionnel / arches / fontaine
- perception : authenticité, élégance, patrimoine

## Contraintes produit

- Conserver l’ADN AkarFinder existant.
- Ne pas casser le système de source/provenance.
- Ne pas rendre une illustration comme une photo réelle.
- Ne pas modifier ranking, ingestion, DB, vérité commerciale ou autorisations d’image.
- Pas de déploiement Vercel sans autorisation explicite.

## Barème visuel — objectif 10/10

### A. Fidélité illustration — 3.0 pts
- silhouette et sujet du type corrects
- line-art, finesse, composition et densité proches du TARGET
- aucune ambiguïté entre familles

### B. Fidélité couleur — 2.0 pts
- teinte propre à chaque type
- saturation légère/premium
- contraste texte/illustration cohérent

### C. Fidélité carte — 2.0 pts
- badge, illustration, prix, titre, facts et footer alignés
- respiration et proportions proches du TARGET

### D. Fidélité système global — 2.0 pts
- cohérence des six familles
- sensation premium, claire, moderne, non-générique

### E. Responsive / intégration réelle — 1.0 pt
- 390/430/768/1280 sans clipping, collision ni régression
- vrai flux Search, pas un prototype isolé

Règle de score :
- `< 9.5/10` : non validable, corriger et recapturer
- `9.5–9.9/10` : très proche mais objectif non atteint
- `10/10` : uniquement si comparaison et preuves justifient chaque catégorie

## Roadmap

### L0 — Canonique / TARGET — ACTIVE
- [x] branche dédiée créée
- [x] image source validée
- [x] dimensions + SHA-256 calculés
- [x] Goal / succès / preuve verrouillés
- [x] barème 10/10 verrouillé
- [ ] copie binaire GitHub au même SHA, si un canal binaire GitHub devient disponible

### L1 — Taxonomie produit
- [ ] ajouter `Local commercial` au resolver visuel sans casser la taxonomie métier
- [ ] normaliser les aliases pertinents
- [ ] tests unitaires de résolution des six familles

### L2 — Illustrations premium
- [ ] créer les six illustrations propriétaires dans le style du TARGET
- [ ] couleurs canoniques par famille
- [ ] fallback sûr pour type inconnu

### L3 — Intégration Search
- [ ] remplacer la priorité `IndexedTransactionArtwork` par le système type-de-bien pour `public_indexed` sans photo
- [ ] préserver favorite/source/facts/disclosure
- [ ] aucun changement ranking/data/DB

### L4 — Tests
- [ ] TypeScript/build
- [ ] contrats visuels
- [ ] tests Search existants
- [ ] assertions six types + fallback

### L5 — AFTER / score
- [ ] captures 390×844
- [ ] captures 430×932
- [ ] captures 768×900
- [ ] captures 1280×900
- [ ] comparaison au TARGET
- [ ] score A/B/C/D/E
- [ ] corriger tant que score < 10/10 ou qu’un défaut observable subsiste

### L6 — Closeout
- [ ] CI exact-head verte
- [ ] mise à jour du présent canonique avec preuves AFTER
- [ ] PR
- [ ] merge
- [ ] post-merge

## État technique initial vérifié

- `SearchListingCardDark.tsx` utilise actuellement `shouldUseIndexedTransactionArtwork(listing)` pour les annonces indexées.
- `IndexedTransactionArtwork.tsx` est un système par transaction `buy / rent / new`.
- `PropertyTypeArtwork.tsx` possède déjà une taxonomie visuelle historique pour Appartement / Villa / Terrain / Studio / Riad / Bureau, mais son style et sa couverture ne correspondent pas au nouveau TARGET.
- `lib/property-types/presentation.ts` ne couvre pas encore `Local commercial` dans `OptionAPropertyType`.

## NEXT EXACT
Implémenter L1 : taxonomie/résolution des six familles du TARGET, puis L2 illustrations premium dans le vrai composant Search.