# AKARFINDER_UX_UI_POLISH_ROADMAP.md

## Chantier
AkarFinder — UX/UI Global Polish

Dernière mise à jour : 2026-08-30

## Goal
Polir le site page par page sans refonte gratuite, avec priorité à la hiérarchie, la densité, la cohérence inter-pages, les états vides et la qualité perçue mobile/desktop.

## Méthode
BEFORE 390×844 / 430×932 / 768×900 / 1280×900 → Goal → référence → implémentation → AFTER mêmes viewports → comparaison + tests → score visuel.

Contraintes : aucun changement ranking/data/DB dans ce chantier ; aucun déploiement Vercel sans autorisation explicite.

# P0 — Impact utilisateur direct — CLOSED

- P0.1 `/map` — CLOSED — score 9.4/10.
- P0.2 `/search` — CLOSED.
  - code visuel premium de PR #947 absorbé dans PR #949 sans dérive des composants produit ;
  - BEFORE canonique : run `33196086594`, artifact `9695997166`, 390×844 / 430×932 / 768×900 / 1280×900 ;
  - AFTER de référence #947 : 4 viewports inspectés, 0 finding ;
  - exact-head fonctionnel `a323b9f8ffffd4bae700b53dd809623a0597de4f` : Search-7 `33305319046` ✅, artifact release `9730427654` ; Search Final `33305319133` ✅, artifact release `9730434749` ; Search-1/2/3/4/5/6 ✅ ; Search mobile grid ✅ ; wording/action hierarchy ✅ ; UI All Pages Certification `33305319034` ✅ ;
  - le viewport 430×932 est inclus dans le certifieur final ;
  - aucun changement ranking/data/DB.
- P0.3 `/mon-projet` — CLOSED — P7 `33249056376` ✅ ; artifact `9713838935` ; 4 captures ; 0 finding ; score 9.2/10.
- P0.4 `/vendre/dossier` — CLOSED — P8 + seller gates ✅ ; AFTER 4 viewports ; score 9.1/10.
- P0.5 `/pro` + `/pro/leads` — CLOSED — P5 + B2B ✅ ; AFTER 4 viewports ; score 9.2/10.
- P0.6 SEO local district/quartier — CLOSED — UI Certification `33249056454` ✅ ; artifact `9713854039` ; AFTER 4 viewports ; score 9.0/10.

# P1 — Harmonisation familles de pages — CLOSED

## P1.1 — `/neuf` — CLOSED
Exact-head `b3be1576a1bdbc681a1d74850e431360c566a7bc` : UI Baseline `33250905857` ✅ ; Certification `33250905839` ✅ ; Intent Hubs + Accessibility ✅ ; AFTER 4 viewports.

Score : 9.1/10.

## P1.2 — `/investir` + `/mre` — CLOSED
Exact-head `3320c3926c8247e798307b790e59862bee03be75` : UI Certification `33256337536` ✅ ; artifact `9716004787` ; 280 captures ; 0 finding ; AFTER 4 viewports.

Gain : CTA hero lisibles, hero/cards/callout resserrés, garde-fous métier intacts.

Score : 9.2/10.

### `/credit` — CLOSED / NO-CHANGE
Audit 390/430/768/1280 : simulateur, hiérarchie et prudence réglementaire déjà au niveau P1.

## P1.3 — `/favorites` + `/compare` + `/alerts` — CLOSED
Exact-head `ab7335f4fcb61dd114ad2bb86c2c15ebcba75d88` : UI Baseline `33256866676` ✅ ; artifact `9716144323` ; UI Certification `33256866538` ✅ ; User Journey `33256866646` ✅ ; Accessibility ✅ ; AFTER 4 viewports.

Gain : états vides plus compacts, CTA rapprochés, `/alerts` ne simule aucune fonction active.

Score : 9.1/10.

## P1.4 — `/accompagnement` + `/faq` + `/contact` + `/a-propos` — CLOSED
BEFORE : artifact `9716144323`, 390/430/768/1280 inspectés.

Implémentation :
- `/accompagnement` : contexte et formulaire mieux séparés ; desktop mieux exploité ; logique lead inchangée ;
- `/faq` : réponses plus scannables, grille desktop 2 colonnes ;
- `/contact` : contact général et retrait/correction séparés ;
- `/a-propos` : proposition de valeur, source visible et contact à l’origine structurés sans nouvelle promesse.

Preuves exact-head `3461ddd27a3254f4e78750dbcde9d9a84ca44a60` :
- UI All Pages Baseline `33260952333` ✅ ;
- UI All Pages Certification `33260952340` ✅ ;
- artifact `9717301238` ;
- digest `sha256:2c22f9c66b8f684aab7080bc9be4fd0d2d950120f8d852e5b43f61f73697f471` ;
- User Journey `33260952381` ✅ ;
- Accessibility `33260952425` ✅ ;
- P4 Secondary `33260952423` ✅ ;
- AFTER 390/430/768/1280 inspectés et comparés au BEFORE ; aucun défaut visuel bloquant observé.

Score : 9.2/10.

## P1.5 — `/acheter` + `/louer` + `/immobilier` + `/quartiers` — CLOSED / NO-CHANGE
Audit exact 390/430/768/1280 : `/acheter`, `/louer` et `/immobilier` sont déjà cohérents avec les meilleures surfaces P1. `/quartiers` est une route de redirection canonique vers `/immobilier` et n’a pas d’UI autonome à polir.

# P2 — Système global / détails fins — CLOSED

Scope vérifié : rayons, ombres, largeurs max, rythme vertical, headers secondaires, CTA secondaires, états vides, cohérence typographique, petits écarts responsive et pages légales sobres.

Closeout exact-head fonctionnel `a323b9f8ffffd4bae700b53dd809623a0597de4f` :
- Phase 1 P2 Residual Closure `33305319108` ✅ ;
- UI Polish P4 Secondary `33305318966` ✅ ;
- UI Polish P5 Global `33305318861` ✅ ;
- UI All Pages Baseline `33305319147` ✅ ;
- UI All Pages Certification `33305319034` ✅ ;
- Premium Header `33305318978` ✅ ;
- Bottom Nav 10/10 `33305319180` ✅ ; Premium BottomNav Glass `33305319142` ✅ ;
- Premium Cards Media `33305319184` ✅ ; Cards 10/10 `33305319057` ✅ ;
- Accessibility `33305318971` ✅ ;
- P0 Closure `33305319049` ✅ ;
- Lot 8 Casablanca AFTER `33305319144` ✅ ; C7 `33305319182` ✅ ; P1B.1/P1B.2 ✅ ;
- Contextual Foundation / Agadir / SCALE-1 / SCALE-2 / Rabat Real Photo Library ✅.

Corrections de closeout :
- audits historiques réalignés sur les sélecteurs et surfaces produit actuels sans affaiblir les garanties ;
- Contextual SCALE-2 respecte la hiérarchie réelle : photo d’ambiance Rabat prioritaire, illustrations contextuelles Tanger/Fès, resolver 36/36 conservé ;
- contrôles d’overflow, disclosure, assets, fallbacks, stabilité reload et build/TypeScript conservés ;
- aucun changement produit dans les derniers correctifs de certification.

Pages légales `/conditions-utilisation` et `/politique-confidentialite` : NO-CHANGE confirmé.

# Closeout

- P0 : CLOSED ;
- P1 : CLOSED ;
- P2 : CLOSED ;
- chantier UX/UI Global Polish : fonctionnellement CLOSED sur `a323b9f8ffffd4bae700b53dd809623a0597de4f` ;
- le HEAD documentation-only de closeout doit être certifié avant merge ;
- PR #949 : closeout canonique en cours avant merge ;
- PR #947 : code produit absorbé dans #949, à fermer comme supersédée après merge de #949 ;
- aucun déploiement Vercel.

## NEXT EXACT
Certifier le HEAD documentation-only courant, marquer PR #949 ready, merger sur `main`, vérifier le merge/post-merge, puis fermer PR #947 comme supersédée.
