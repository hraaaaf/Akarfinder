# AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md

## Chantier
AkarFinder — Search Property Type Visual System

Statut : CLOSED
Date TARGET : 2026-08-30
Branche de travail : `feat/search-property-type-visuals`
Base de départ : `main@66715e555ccf1ee6f5edf82f1b69fc57a0587cb8`
PR : `#951` — MERGED
Merge commit : `76553c7eb114e473c193d83540386f1d6268c3e2` — GitHub signature verified

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

## Succès observable — PROUVÉ

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

Aucun rouge observé sur la vague produit exacte.

## Merge / post-merge — VÉRIFIÉ

- merge-ref GitHub vérifié : `76553c7eb114e473c193d83540386f1d6268c3e2` ;
- signature GitHub : `verified=true`, reason `valid` ;
- GitHub reconnaît PR #951 : `closed`, `merged=true`, `merged_at=2026-08-30T17:59:00Z`.

## Production activation / live proof — VÉRIFIÉ

Production certifiée le `2026-09-01` :
- deployment Vercel : `dpl_3psDqDjPZ31X7kkCwZdmM6Pd2Qw6` ✅ READY ;
- URL production : `https://akarfinder.vercel.app/search` ;
- HEAD production : `3e87ce700afb9a2ae4c720fb558593e973d6598b` ;
- le merge produit `76553c7e…` est présent dans la lignée de ce HEAD production.

Certification LIVE dédiée :
- run : `33520207739` ✅ SUCCESS ;
- artifact : `9805384854` ;
- digest : `sha256:acfb0b0df0ef2d51e4a0cb50ff747f71202568338813febdfce70a3909cecfaf` ;
- captures LIVE : 390×844 / 430×932 / 768×900 / 1280×900 ;
- screenshotCount : `4/4` ;
- findingCount : `0`.

Inspection visuelle LIVE :
- système visuel par type bien visible sur la vraie surface `/search` production ;
- exemples observés : Villa vert, Appartement bleu, Bureau violet, Terrain orange ;
- grille propre aux quatre viewports ;
- badges et favoris sans collision visible ;
- illustrations nettes et intégrées à la hiérarchie des cartes.

Score LIVE : **9.8/10**.

## Roadmap finale

- [x] L0 — TARGET / canonique
- [x] L1 — Taxonomie visuelle
- [x] L2 — Illustrations premium
- [x] L3 — Intégration Search
- [x] L4 — Tests / CI
- [x] L5 — AFTER / score 10/10
- [x] L6 — Merge / post-merge
- [x] L7 — Production activation / live proof

## CLOSEOUT

Search Property Type Visual System : **CLOSED — 7/7 lots prouvés**.

---

## Follow-up 2026-09-02 — Terrain / Riad semantic correction

Statut : **CLOSED — semantic + production + visual proof complete**

### Goal
Corriger durablement les annonces Terrain et Riad classées à tort, sans dégrader les vraies Villas ni le système visuel déjà certifié.

### Succès observable — PROUVÉ
- Riad est exposé comme `Riad` en production ;
- Terrain est exposé comme `Terrain` ;
- une vraie Villa reste `Villa`, y compris avec `Hay Riad` dans le texte ;
- le système visuel affiche Riad or, Terrain orange, Villa vert ;
- aucune écriture DB n'a été requise.

### Preuves sémantiques / CI
- correction initiale PR `#969` mergée ;
- follow-up ODM PR `#981` mergée ;
- merge commit PR #981 : `ede9cee2188cbb2e7cd40dc5facdb1a026c17398` ;
- run ciblé `33611065574` ✅ SUCCESS ;
- régression sémantique : `4/4 PASS`, `0 fail` ;
- tous les gates du HEAD final PR #981 observés en SUCCESS.

### Production — VÉRIFIÉE
- deployment Vercel : `dpl_B1irYg5RxA6FWeRWp48Xu2twsXJY` ✅ READY ;
- HEAD production : `4caee59bfcae130bf7479207421086a140b06883` ;
- API LIVE Riad : HTTP 200, `51` résultats observés, `property_type = Riad` ;
- API LIVE Villa : `273` résultats observés, `property_type = Villa` ;
- API LIVE Terrain : `237` résultats observés, `property_type = Terrain`.

### Preuve visuelle LIVE — VÉRIFIÉE
Certification temporaire PR `#983`, fermée sans merge après collecte des preuves.

Run final :
- `33614462680` ✅ SUCCESS ;
- artifact : `9840360650` ;
- digest : `sha256:06b33123689a83087e360414a3457e1961eb261091f059d68c1f02382ba79863` ;
- screenshotCount : `6/6` ;
- findings : `[]`.

Captures certifiées :
- Riad : `390×844`, `430×932`, `768×900`, `1280×900` ;
- Villa : `1280×900` ;
- Terrain : `1280×900`.

Inspection visuelle :
- Riad : artwork or / patio, badge Riad ✅ ;
- Villa : artwork vert, badge Villa, grille Villa cohérente ✅ ;
- Terrain : artwork orange, badge Terrain, grille Terrain cohérente ✅ ;
- aucun scénario final à `0 résultat` ;
- aucun finding remonté par la certification finale.

### Verdict
**GOAL PROUVÉ — follow-up CLOSED.**

Aucune action restante connue sur ce follow-up.