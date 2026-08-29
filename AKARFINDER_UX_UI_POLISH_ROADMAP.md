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

Preuves :
- stratégie pointer-events certifiée ;
- Product Experience P4 Search Map ✅ ;
- Carte National Zillow UI Certification ✅ ;
- UI All Pages Baseline/Certification ✅ ;
- AFTER 390/430/768/1280 inspectés ;
- canvas desktop ~71.9 %, rail ~360 px ;
- aucune régression fonctionnelle observée.

Score visuel : 9.4/10.

## P0.2 — `/search` — WAIT dépendance PR #947
Goal : état vide plus compact + densité cohérente avec les cartes indexées premium.

Dépendance vérifiée le 2026-08-29 : PR #947 toujours OPEN, DRAFT, non mergée, mergeable=true.

Règle : ne pas créer de conflit avec les 3 fichiers du lot Search Indexed Visual tant que #947 n’est pas résolue.

## P0.3 — `/mon-projet` — CLOSED
Goal : parcours plus compact, progression rattachée au contenu, bottom-nav conservée sans recouvrement.

Preuves exact-head `a8e1fe817fd648bcc2045bdb7824f6951da35a7f` :
- Product Experience P7 Mon Projet `33249056376` ✅ ;
- artifact `9713838935` ;
- digest `sha256:ddf0f20ec50460d2584fb5898694cc9474fb8d489fdfb8a81db4671b0284fcee` ;
- 4 captures ;
- 0 finding ;
- 390 px : bottom-nav présente et zéro chevauchement ;
- 430/768/1280 inspectés.

Score visuel : 9.2/10.

`/profil-recherche` reste une route de compatibilité vers le parcours canonique et n’est pas un écran UI autonome à polir séparément.

## P0.4 — `/vendre/dossier` — CLOSED
Goal : formulaire prioritaire, rails secondaires, workflow vendeur inchangé.

Implémentation finale :
- mobile/tablette resserrés ;
- desktop intermédiaire : rail gauche réduit ;
- aperçu vendeur conservé à 1280 après correction du premier choix trop agressif ;
- ≥1440 : rails compacts ;
- logique vendeur/API/validation inchangée.

Preuves :
- Product Experience P8 Publication `33249056509` ✅ ;
- UX P2 Seller Secure Publish Flow ✅ ;
- Seller Entry Quality ✅ ;
- Seller Structured Draft ✅ ;
- AFTER all-pages 390/430/768/1280 inspectés.

Score visuel : 9.1/10.

## P0.5 — `/pro` + `/pro/leads` — CLOSED
Goal : acquisition Pro plus nette et plus dense sans altérer la logique B2B.

Implémentation : hero/preview/sections compactés principalement mobile/tablette ; `/pro/leads` reste volontairement une redirection vers le parcours Pro canonique.

Preuves :
- UI Polish P5 Global Certification `33249056417` ✅ ;
- B2B Productization Gate ✅ ;
- AFTER 390/430/768/1280 inspectés.

Score visuel : 9.2/10.

## P0.6 — SEO local district/quartier — CLOSED
Pages : `/immobilier/[city]/[district]`, `/quartiers/[city]/[neighborhood]`.

Goal : rendu local plus éditorial et premium sans modifier les données/SEO métier.

Implémentation : hero, shell, rythme et densité allégés ; distinction contenu éditorial / données renforcée.

Preuves :
- UI All Pages Baseline `33249056480` ✅ ;
- artifact `9713854039` ;
- digest `sha256:456ebb249ae36177d2df388e108336792e4dd7d170c7c84dcfb6eeea3c7504a1` ;
- UI All Pages Certification `33249056454` ✅ ;
- 4 viewports inspectés pour district/quartier ;
- Accessibility Gate ✅.

Score visuel : 9.0/10.

# P1 — Harmonisation familles de pages

Familles :
- `/acheter`, `/louer`, `/neuf` ;
- `/immobilier`, `/quartiers` ;
- `/favorites`, `/compare`, `/alerts` ;
- `/investir`, `/mre`, `/credit` ;
- `/accompagnement`, `/faq`, `/contact`, `/a-propos`.

## P1.1 — `/neuf` — ACTIVE
BEFORE inspecté : 390×844 et 1280×900 directement, plus baseline complète disponible pour 430/768.

Constat : page fonctionnelle mais premier écran trop long sur mobile, hero/formulaire/quick-links trop empilés ; desktop déjà solide mais légèrement trop volumineux.

Goal : rendre le premier écran plus léger et plus premium tout en conservant l’intégralité des filtres, liens rapides, vérité d’inventaire et séparation promoteur/données réelles.

Référence : rythme et densité des meilleurs écrans AkarFinder actuels, sans nouvelle direction artistique.

Implémentation en cours :
- hero mobile plus court ;
- H1 et texte resserrés ;
- formulaire plus compact ;
- quick-links plus compacts ;
- sections secondaires moins hautes ;
- desktop : hero légèrement resserré et preview moins dominante ;
- aucune logique Search/Neuf modifiée.

HEAD fonctionnel P1.1 : `a16cb48f79571150865f5af3901d94a2d39d0a5f`.

État : IMPLEMENTED — AFTER exact-head 390/430/768/1280 + tests requis avant clôture.

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
- P0.1 : CLOSED ;
- P0.2 : WAIT PR #947 ;
- P0.3 : CLOSED ;
- P0.4 : CLOSED ;
- P0.5 : CLOSED ;
- P0.6 : CLOSED ;
- P1.1 `/neuf` : ACTIVE ;
- aucun déploiement Vercel.

## NEXT EXACT
Certifier P1.1 `/neuf` sur 390/430/768/1280, corriger si nécessaire, puis poursuivre P1 avec `/investir` + `/mre` pendant que P0.2 reste bloqué par la PR #947.
