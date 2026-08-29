# AKARFINDER_UX_UI_POLISH_ROADMAP.md

## Chantier
AkarFinder — UX/UI Global Polish

Dernière mise à jour : 2026-08-29

## Goal
Polir le site page par page sans refonte gratuite, avec priorité à la hiérarchie, la densité, la cohérence inter-pages, les états vides et la qualité perçue mobile/desktop.

## Méthode
BEFORE 390×844 / 430×932 / 768×900 / 1280×900 → Goal → référence → implémentation → AFTER mêmes viewports → comparaison + tests → score visuel.

Contraintes : aucun changement ranking/data/DB dans ce chantier ; aucun déploiement Vercel sans autorisation explicite.

# P0 — Impact utilisateur direct

- P0.1 `/map` — CLOSED — score 9.4/10.
- P0.2 `/search` — WAIT dépendance PR #947, encore OPEN/DRAFT/non mergée au 2026-08-29.
- P0.3 `/mon-projet` — CLOSED — P7 `33249056376` ✅ ; artifact `9713838935` ; 4 captures ; 0 finding ; score 9.2/10.
- P0.4 `/vendre/dossier` — CLOSED — P8 + seller gates ✅ ; AFTER 4 viewports ; score 9.1/10.
- P0.5 `/pro` + `/pro/leads` — CLOSED — P5 + B2B ✅ ; AFTER 4 viewports ; score 9.2/10.
- P0.6 SEO local district/quartier — CLOSED — UI Certification `33249056454` ✅ ; artifact `9713854039` ; AFTER 4 viewports ; score 9.0/10.

# P1 — Harmonisation familles de pages

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

P1 : CLOSED.

# P2 — Système global / détails fins — ACTIVE

Scope : rayons, ombres, largeurs max, rythme vertical, headers secondaires, CTA secondaires, états vides, cohérence typographique, petits écarts responsive et pages légales sobres.

Audit déjà effectué :
- `components/ui/design-system.ts` : tokens principaux cohérents ; pas de refonte globale risquée justifiée ;
- pages légales `/conditions-utilisation` et `/politique-confidentialite` : lisibles et sobres sur 390/430/768/1280, NO-CHANGE recommandé ;
- bottom-nav : le produit canonique affiche `Mon Projet`. Les tests source sont alignés ; les deux audits runtime legacy attendaient encore `Compte` et sont corrigés dans le lot suivant, sans modification du rendu.

## Succès P2
- aucune régression all-pages ;
- bottom-nav runtime exact vert avec `Mon Projet` ;
- aucune modification cosmétique globale sans gain observable ;
- cohérence finale documentée avant closeout.

# État actuel
- branche : `feat/ux-ui-polish-p0` ;
- PR #949 : OPEN, DRAFT, mergeable=true ;
- P0 utile : CLOSED hors P0.2 `/search` en WAIT PR #947 ;
- P1 : CLOSED ;
- P2 : ACTIVE ;
- aucun déploiement Vercel.

## NEXT EXACT
Certifier exact-head les audits Bottom Nav corrigés (`Mon Projet`), poursuivre l’audit P2 des pages légales/secondaires et ne modifier que les écarts prouvés. Ensuite closeout P2, réévaluer PR #947, puis closeout PR #949.
