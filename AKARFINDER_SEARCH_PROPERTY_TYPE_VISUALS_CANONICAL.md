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

### BEFORE — VÉRIFIÉ

Surface produit précédente : `17c81df1b1f2f1a2c10abe0b3a26f165973bc67e` (ensuite mergée sur `main`; `66715e5…` n’ajoute que le closeout documentaire).

- UI All Pages Certification : `33306177902` ✅
- artifact : `9730741634`
- digest : `sha256:504f4fa43cef1a79b75189bf7136b0324017b1b476ec032334e96d016206b743`
- captures `visual-qa__search-indexed-cards` vérifiées : 390×844 / 430×932 / 768×900 / 1280×900
- état visible BEFORE : système transactionnel `Achat / Location / Neuf`.

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

### L0 — Canonique / TARGET — CLOSED sauf copie binaire optionnelle
- [x] branche dédiée créée
- [x] image source validée
- [x] dimensions + SHA-256 calculés
- [x] Goal / succès / preuve verrouillés
- [x] barème 10/10 verrouillé
- [ ] copie binaire GitHub au même SHA, uniquement si un canal binaire GitHub devient disponible

### L1 — Taxonomie produit — DONE / À RECERTIFIER EXACT-HEAD
- [x] resolver visuel six familles
- [x] alias commercial de présentation sans mutation du type métier
- [x] priorité au type métier explicite sur les mots incidents du titre
- [x] tests de résolution, y compris anti-faux-positif `Appartement avec bureau`

### L2 — Illustrations premium — DONE / VISUAL PASS ACTIVE
- [x] six illustrations propriétaires SVG
- [x] couleurs canoniques par famille
- [x] fallback sûr pour type inconnu
- [x] premier AFTER intermédiaire `ce56d1b…` : machine contract 10/10, 0 failure
- [x] comparaison humaine intermédiaire : familles/couleurs/hiérarchie correctes
- [x] correction décidée : présence graphique et badges renforcés pour mieux converger vers le TARGET
- [ ] AFTER exact-head du pass de densité à inspecter

### L3 — Intégration Search — DONE / À RECERTIFIER EXACT-HEAD
- [x] `public_indexed` sans photo utilise le système type-de-bien
- [x] favorite/source/facts/disclosure préservés
- [x] footer `Voir sur la source` conservé comme vrai lien pour les annonces indexées externes
- [x] aucun changement ranking/data/DB

### L4 — Tests — ACTIVE
- [x] contrats unitaires/taxonomie ajoutés
- [x] certifieur visuel dédié ajouté
- [x] premier run dédié `33313085152` ✅ sur `ce56d1b…`
- [ ] CI exact-head finale

### L5 — AFTER / score — ACTIVE
- [x] AFTER intermédiaire `ce56d1b…` : 390×844 / 430×932 / 768×900 / 1280×900, machine 10/10, 0 failure
- [x] comparaison au TARGET effectuée
- [x] défaut résiduel identifié : illustration trop petite/aérée et badge trop discret par rapport au TARGET
- [x] correction visuelle appliquée dans `app/search/search-property-type-visuals.css`
- [ ] captures AFTER exact-head final
- [ ] comparaison finale au TARGET
- [ ] score A/B/C/D/E final
- [ ] corriger si défaut observable ou score < 10/10

### L6 — Closeout — PENDING
- [ ] CI exact-head verte
- [ ] mise à jour finale du présent canonique avec preuves AFTER
- [ ] PR ready
- [ ] merge
- [ ] post-merge

## Preuve intermédiaire vérifiée

Run dédié `33313085152` sur `ce56d1b156766cd509431cc0fc5ece4ec973a2e9` : ✅

Artifact `9732760282` :
- digest `sha256:e84a48de8447756dca4e364f5cb06e80b71a97fb52b908c173fca2ab30588384`
- `machineScore: 10`
- `failures: []`
- axes : sixFamilies / colors / proprietaryArtwork / targetGeometry / targetCardHierarchy = `true`
- 390×844 : 6 cartes, 2 colonnes, 0 overflow, 6 clés uniques
- 430×932 : 6 cartes, 2 colonnes, 0 overflow, 6 clés uniques
- 768×900 : 6 cartes, 2 colonnes, 0 overflow, 6 clés uniques
- 1280×900 : 6 cartes, 4 colonnes, 0 overflow, 6 clés uniques

Cette preuve n’est **pas** le closeout final : le pass visuel de densité ultérieur doit être recapturé et recertifié exact-head.

## État technique vérifié

- `SearchListingCardDark.tsx` utilise désormais `IndexedPropertyTypeArtwork` pour la voie visuelle `public_indexed`.
- `IndexedTransactionArtwork.tsx` n’est plus la surface principale de cette voie dans la carte Search.
- Le resolver visuel couvre Appartement / Villa / Terrain / Bureau / Local commercial / Riad + fallback inconnu.
- Le type métier explicite est prioritaire ; le titre ne sert qu’aux aliases commerciaux sûrs et au fallback quand le type est non reconnu.
- Le lien source externe reste un vrai `<a>` sur les annonces indexées autorisées.
- Les corrections Premium historiques portent uniquement sur les contrats d’audit, pas sur ranking/data/DB.

## NEXT EXACT
Obtenir l’AFTER exact-head du pass visuel courant, vérifier `metrics.json` + 390/430/768/1280, comparer au TARGET, scorer A/B/C/D/E, corriger si nécessaire, puis closeout CI/PR/merge/post-merge.