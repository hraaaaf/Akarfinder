# AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md

## Chantier
AkarFinder — Search Property Type Visual System

Statut : VALIDATED — PENDING MERGE
Date TARGET : 2026-08-30
Branche : `feat/search-property-type-visuals`
Base de départ : `main@66715e555ccf1ee6f5edf82f1b69fc57a0587cb8`
PR : `#951`

## TARGET VISUEL — APPROVED / LOCKED

Référence utilisateur : mockup « Concept premium — Système visuel par type de bien ».

Identité canonique :
- dimensions : `1448 × 1086`
- format source : JPEG / RGB
- taille source : `492052` octets
- SHA-256 : `004b46faab6a642674b9dac1eb623599418c3e22564884e38f2304725ce0909a`

Règle : aucune régénération ou variation ne remplace cette identité sans nouvelle validation explicite utilisateur.

## Goal

Reproduire dans le vrai `/search` le langage visuel du TARGET pour les annonces indexées sans photo, en faisant dépendre l’illustration principale du **type de bien** plutôt que du seul type de transaction, sans modifier ranking, données métier ou DB.

## Succès observable

1. Six familles immédiatement distinctes : Appartement / Villa / Terrain / Bureau / Local commercial / Riad.
2. Illustration et couleur conformes au TARGET pour chaque famille.
3. Vrai composant Search utilisé pour `public_indexed` sans photo.
4. Aucun asset tiers réseau utilisé pour simuler une photo.
5. Badge → illustration → prix → titre → localisation/facts → provenance/source préservés.
6. Aucun clipping, collision ou overflow aux viewports 390 / 430 / 768 / 1280.
7. Ranking/data/DB/ingestion inchangés.

## BEFORE — VÉRIFIÉ

Surface précédente : `17c81df1b1f2f1a2c10abe0b3a26f165973bc67e`.

- UI All Pages Certification : `33306177902` ✅
- artifact : `9730741634`
- digest : `sha256:504f4fa43cef1a79b75189bf7136b0324017b1b476ec032334e96d016206b743`
- viewports : 390×844 / 430×932 / 768×900 / 1280×900
- état BEFORE : système transactionnel `Achat / Location / Neuf`.

## Spécification visuelle verrouillée

| Famille | Couleur | Illustration TARGET |
|---|---|---|
| Appartement | Bleu azur | Immeuble résidentiel urbain |
| Villa | Vert émeraude | Villa + jardin / portail |
| Terrain | Orange terre | Parcelle balisée + repère |
| Bureau | Violet dynamique | Tour / immeuble de bureaux |
| Local commercial | Bleu turquoise | Façade commerciale / vitrine |
| Riad | Or chaleureux | Patio / arches / fontaine |

## Implémentation finale

- `SearchListingCardDark.tsx` branche la voie `public_indexed` sur `IndexedPropertyTypeArtwork`.
- resolver dédié : `lib/ux/indexed-property-type-visual.ts`.
- type métier explicite prioritaire sur les mots incidents du titre.
- aliases commerciaux sûrs sans mutation de taxonomie métier.
- six artworks locaux dérivés directement du TARGET sous `public/visuals/property-types/target/`.
- Riad utilise un PNG local après détection visuelle d'un wrapper WebP cassé.
- SVG interne historique reste fallback invisible/sûr pour les autres familles.
- footer `Voir sur la source` reste un vrai lien externe.
- aucune modification ranking/data/DB/ingestion.

## Convergence vérifiée

1. `ce56d1b…` : machine 10/10 mais illustrations trop petites/aérées.
2. pass densité : +12% desktop/tablette, +16% mobile.
3. `9e2125b…` : rouge uniquement collision `Local commercial` ↔ cœur à 390 px.
4. correctif mobile ciblé, cœur 44 px préservé.
5. `d754525…` : CI dédiée verte mais dessins encore trop simples humainement.
6. passage aux assets dérivés directement du TARGET.
7. `66a0b087…` : machine 10/10 ; inspection humaine détecte Riad cassé.
8. `95981fd…` : Riad remplacé par PNG TARGET local + stray supprimé + contrat durci.
9. `9e1f990…` : faux rouge du test `xmlns=http://...` corrigé sans changement produit.

## AFTER FINAL — VÉRIFIÉ

HEAD produit certifié : `9e1f990f42c66106e55da3c5d96315a1272b10a5`.

Gate dédié :
- run : `33323814173` ✅
- artifact : `9735706097`
- digest : `sha256:3a2739e407cb5c361baec7c7f85c697344030333e88dbe2a7125937d1a9b6a03`
- machineScore : `10.0/10`
- failures : `[]`
- axes : sixFamilies / colors / proprietaryArtwork / targetGeometry / targetCardHierarchy = `true`

Viewports exacts :
- 390×844 : 6 cartes / 2 colonnes / 0 overflow / 6 clés uniques ✅
- 430×932 : 6 cartes / 2 colonnes / 0 overflow / 6 clés uniques ✅
- 768×900 : 6 cartes / 2 colonnes / 0 overflow / 6 clés uniques ✅
- 1280×900 : 6 cartes / 4 colonnes / 0 overflow / 6 clés uniques ✅

Inspection humaine finale :
- 6/6 familles visibles et correctement illustrées ;
- Riad correctement rendu ;
- aucune image cassée observée ;
- couleurs et scènes directement dérivées du TARGET ;
- badges/favorite sans collision ;
- hiérarchie carte cohérente ;
- responsive propre sur les quatre viewports.

## Score visuel final — 10/10

Scope du score : **système visuel des cartes par type de bien dans le vrai Search**, pas reproduction de la planche explicative latérale du mockup.

- A. Fidélité illustration : **3.0 / 3.0** — scènes directement dérivées du TARGET, six familles distinctes.
- B. Fidélité couleur : **2.0 / 2.0** — six accents canoniques exacts et certifiés.
- C. Fidélité carte : **2.0 / 2.0** — badge, artwork, prix, titre, facts, footer conformes au langage cible et sans collision.
- D. Fidélité système global : **2.0 / 2.0** — cohérence premium six familles, non générique, ADN AkarFinder conservé.
- E. Responsive / intégration réelle : **1.0 / 1.0** — 390/430/768/1280, 0 overflow, vraie surface Search.

**TOTAL : 10.0 / 10.0 — GOAL PROUVÉ sur le scope convenu.**

## CI exact-head produit — VÉRIFIÉE

Tous les workflows observés associés à `9e1f990…` sont `completed/success`, notamment :
- `SEARCH-PROPERTY-TYPE-VISUALS-1` `33323814173` ✅
- `UX-SEARCH-FINAL-10OF10-1` `33323814341` ✅
- `UX-SEARCH-7` `33323814330` ✅
- `UI All Pages Certification` `33323814289` ✅
- `UI All Pages Baseline` `33323814322` ✅
- `UX-PREMIUM-CARDS-MEDIA-1` `33323814193` ✅
- `UX-PREMIUM-CARDS-CONTENT-1` `33323814361` ✅
- `UX-PREMIUM-GRID-1` `33323814371` ✅
- `SEARCH-MOBILE-CARD-GRID-1` `33323814320` ✅
- `Phase 1 Final Design Accessibility Gate` `33323814376` ✅
- `Phase 1 P1 Search Truth Gate` `33323814324` ✅
- `Canonical Baseline Compile Validation` `33323814293` ✅
- `Canonical Baseline Validation` `33323814342` ✅

Aucun rouge observé sur cette vague exacte.

## Roadmap

### L0 — TARGET / canonique — CLOSED
- [x] TARGET verrouillé par SHA-256
- [x] Goal / succès / preuve / score définis

### L1 — Taxonomie visuelle — CLOSED
- [x] six familles
- [x] aliases sûrs
- [x] anti-faux-positifs

### L2 — Illustrations premium — CLOSED
- [x] assets TARGET locaux
- [x] six couleurs canoniques
- [x] Riad corrigé après inspection réelle

### L3 — Intégration Search — CLOSED
- [x] vrai composant produit
- [x] source/favorite/facts préservés
- [x] ranking/data/DB inchangés

### L4 — Tests / CI — CLOSED
- [x] contrats statiques
- [x] TypeScript
- [x] build production
- [x] runtime Playwright
- [x] gates Search/UI croisés

### L5 — AFTER / score — CLOSED
- [x] 4 viewports
- [x] comparaison TARGET
- [x] score final 10/10

### L6 — Closeout — ACTIVE
- [x] validation fonctionnelle et visuelle
- [x] canonique final préparé
- [ ] PR ready
- [ ] merge
- [ ] post-merge vérifié

## NEXT EXACT
Marquer la PR #951 ready, merger après vérification des exigences GitHub, vérifier `main`/merge commit, puis mettre ce canonique à `CLOSED` en post-merge.

Aucun déploiement Vercel n'a été réalisé dans ce chantier.
