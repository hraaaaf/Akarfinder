# AKARFINDER_UX_UI_POLISH_ROADMAP.md

## Chantier
AkarFinder — UX/UI Global Polish

Dernière mise à jour : 2026-08-29

## Goal
Polir le site page par page sans refonte gratuite, avec priorité à la hiérarchie, la densité, la cohérence inter-pages, les états vides et la qualité perçue mobile/desktop.

## Méthode obligatoire
Pour chaque lot UI significatif :
1. BEFORE 390×844 / 430×932 / 768×900 / 1280×900 ;
2. Goal visuel écrit ;
3. référence/mockup ;
4. implémentation ;
5. AFTER mêmes viewports ;
6. comparaison + tests ;
7. score visuel justifié.

Contraintes : pas de changement ranking/data/DB dans ce chantier ; pas de déploiement Vercel sans autorisation explicite.

# P0 — Impact utilisateur direct

## P0.1 — `/map` — CLOSED
Goal : carte dominante, rail compact, mobile lisible, aucune régression d’interaction.

Preuves : Product Experience P4 Search Map ✅ ; Zillow UI ✅ ; UI All Pages Baseline/Certification ✅ ; AFTER 390/430/768/1280 inspectés ; canvas desktop ~71.9 %, rail ~360 px.

Score visuel : 9.4/10.

## P0.2 — `/search` — WAIT dépendance PR #947
Goal : état vide plus compact + densité cohérente avec les cartes indexées premium.

Dépendance vérifiée le 2026-08-29 : PR #947 toujours OPEN, DRAFT, non mergée, mergeable=true.

## P0.3 — `/mon-projet` — CLOSED
Goal : parcours plus compact, progression rattachée au contenu, bottom-nav conservée sans recouvrement.

Preuves exact-head `a8e1fe817fd648bcc2045bdb7824f6951da35a7f` : Product Experience P7 `33249056376` ✅ ; artifact `9713838935` ; digest `sha256:ddf0f20ec50460d2584fb5898694cc9474fb8d489fdfb8a81db4671b0284fcee` ; 4 captures ; 0 finding.

Score visuel : 9.2/10.

`/profil-recherche` reste une route de compatibilité vers le parcours canonique.

## P0.4 — `/vendre/dossier` — CLOSED
Goal : formulaire prioritaire, rails secondaires, workflow vendeur inchangé.

Preuves : Product Experience P8 `33249056509` ✅ ; Seller Secure Publish ✅ ; Seller Entry Quality ✅ ; Seller Structured Draft ✅ ; AFTER 390/430/768/1280 inspectés.

Score visuel : 9.1/10.

## P0.5 — `/pro` + `/pro/leads` — CLOSED
Goal : acquisition Pro plus nette et plus dense sans altérer la logique B2B.

Preuves : UI Polish P5 `33249056417` ✅ ; B2B Productization ✅ ; AFTER 390/430/768/1280 inspectés.

Score visuel : 9.2/10.

## P0.6 — SEO local district/quartier — CLOSED
Pages : `/immobilier/[city]/[district]`, `/quartiers/[city]/[neighborhood]`.

Preuves : UI All Pages Baseline `33249056480` ✅ ; artifact `9713854039` ; digest `sha256:456ebb249ae36177d2df388e108336792e4dd7d170c7c84dcfb6eeea3c7504a1` ; UI All Pages Certification `33249056454` ✅ ; 4 viewports inspectés ; Accessibility ✅.

Score visuel : 9.0/10.

# P1 — Harmonisation familles de pages

Familles :
- `/acheter`, `/louer`, `/neuf` ;
- `/immobilier`, `/quartiers` ;
- `/favorites`, `/compare`, `/alerts` ;
- `/investir`, `/mre`, `/credit` ;
- `/accompagnement`, `/faq`, `/contact`, `/a-propos`.

## P1.1 — `/neuf` — CLOSED
BEFORE exact : artifact UI All Pages du HEAD `a8e1fe817fd648bcc2045bdb7824f6951da35a7f`, 390/430/768/1280 inspectés.

Goal : premier écran plus léger et premium, filtres et vérité d’inventaire conservés.

Référence : rythme et densité des meilleurs écrans AkarFinder actuels, sans nouvelle direction artistique.

Implémentation : hero/H1/texte/formulaire/quick-links resserrés sur mobile ; sections secondaires moins hautes ; desktop légèrement resserré ; logique Search/Neuf inchangée.

Preuves exact-head `b3be1576a1bdbc681a1d74850e431360c566a7bc` : UI All Pages Baseline `33250905857` ✅ ; artifact `9714430657` ; digest `sha256:e6cde359f9c8d4effae7245faa6c698c90770ad9958316b6b25999017ad77de2` ; UI All Pages Certification `33250905839` ✅ ; Intent Hubs `33250905871` ✅ ; Accessibility `33250905998` ✅ ; AFTER 390/430/768/1280 inspectés.

Score visuel : 9.1/10.

## P1.2 — `/investir` + `/mre` — CLOSED
BEFORE exact : artifact `9714430657`, HEAD `b3be1576a1bdbc681a1d74850e431360c566a7bc`, 390/430/768/1280 inspectés.

Goal : rendre les actions hero immédiatement visibles, supprimer la fausse impression de vide, resserrer les cartes/espacements et conserver intégralement les disclaimers et garde-fous métier.

Implémentation :
- CTA hero corrigés sur fond clair : primary bleu + secondaires lisibles ;
- hero mobile/desktop raccourci ;
- cards, gaps et callout resserrés ;
- callout final rendu explicitement actionnable ;
- disclaimers, textes de prudence, liens et logique inchangés.

Preuves exact-head `3320c3926c8247e798307b790e59862bee03be75` :
- UI All Pages Certification `33256337536` ✅ ;
- artifact `9716004787` ;
- digest `sha256:c266b4479e7d518aa27bc33bab6b3064481d86520b08d2c00a14f3cfac751c96` ;
- Intent Hubs `33256337523` ✅ ;
- UI Polish P5 `33256337471` ✅ ;
- P7 `33256337508` ✅ ;
- P8 `33256337482` ✅ ;
- artifact : 280 captures, 0 finding ;
- AFTER `/investir` + `/mre` 390/430/768/1280 inspectés et comparés au BEFORE.

Score visuel : 9.2/10. Gain principal : actions visibles immédiatement et densité cohérente ; aucune suppression de garde-fou métier.

## P1.3 — `/favorites` + `/compare` + `/alerts` — ACTIVE
BEFORE exact : artifact `9714430657`, 390/430/768/1280 inspectés.

Constat : pages propres mais les états vides prennent trop d’espace, surtout mobile ; le contenu utile est faible mais traité comme un hero plein écran. `/alerts` ajoute en plus un centrage vertical généreux qui allonge artificiellement le premier écran.

Goal : rendre les états personnels plus compacts, actionnables et cohérents sans toucher au stockage Favoris/Compare ni à la vérité produit sur les alertes non actives.

Succès :
- 390/430 : message + CTA principal accessibles plus tôt, sans impression de page vide ;
- 768/1280 : état vide contenu dans une largeur lisible, pas une dalle pleine largeur ;
- `/alerts` conserve explicitement le statut non activé ;
- aucune modification storage/API/comparaison/favoris.

Référence : grammaire des surfaces P0/P1 déjà validées, état vide = tâche courte, pas hero marketing.

État : READY FOR IMPLEMENTATION.

# P2 — Système global / détails fins
- rayons ;
- ombres ;
- largeurs max ;
- rythme vertical ;
- headers secondaires ;
- CTA secondaires ;
- états vides ;
- cohérence typographique ;
- petits écarts responsive ;
- pages légales sobres.

# État actuel
- branche : `feat/ux-ui-polish-p0` ;
- PR #949 : OPEN, DRAFT, mergeable=true ;
- P0.1/P0.3/P0.4/P0.5/P0.6 : CLOSED ;
- P0.2 : WAIT PR #947 ;
- P1.1 `/neuf` : CLOSED ;
- P1.2 `/investir` + `/mre` : CLOSED ;
- P1.3 `/favorites` + `/compare` + `/alerts` : ACTIVE ;
- aucun déploiement Vercel.

## NEXT EXACT
Implémenter P1.3 sur `/favorites` + `/compare` + `/alerts`, certifier 390/430/768/1280, puis corriger le contrat User Journey Mon Projet devenu obsolète face au parcours canonique actuel si les mêmes assertions restent rouges.