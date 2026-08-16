# ANN-L1 — Shell premium — Closeout

**Programme :** `ANNOUNCEMENT-PAGE-ULTRA-PREMIUM`  
**Date :** 2026-08-16  
**État :** ✅ CLOSED  
**Crédit :** +7 %  
**Progression programme après closeout :** 11 / 100 %

## Preuves exactes

- PR runtime : **#719 ✅ MERGED**.
- Head exact certifié : `a99e8987df287d2ed36a0eea4966aad1080edb87`.
- Merge `main` : `f2e2c3db29b63d87eedff4c4e00e5e85f374c7f9`.
- Gate dédié `Announcement Page L1 Premium Shell`, run PR `31926548546` : **SUCCESS**.
- Artefact visuel : `9258022426`.
- Digest : `sha256:565c3b1d91eb0f2023eb4b9dff399604c4e3a006d4b3d05c7fee14af5c22e1ff`.
- Rapport : `ANNOUNCEMENT_PAGE_L1_VISUAL_V1` ; **4/4 screenshots ; 0 finding**.
- Viewports : **390×844 / 430×932 / 768×900 / 1280×900**.

## Certification machine

Pour chaque viewport de la fixture `/visual-qa/announcement-page` :

- HTTP 200 ;
- `h1Count = 1` ;
- `mainCount = 1` ;
- `scrollWidth = clientWidth` ;
- header Search réel présent ;
- shell ANN-L1 présent ;
- 0 erreur console ;
- 0 réponse ressource HTTP >= 400.

Mobile/tablette :

- dock décision présent ;
- Favori : **44 px** ;
- Comparer : **48 px** ;
- Mon Projet : **48 px**.

Desktop 1280 :

- Mon Projet présent dans le rail d'actions ;
- cible mesurée : **46 px**.

## Résultat livré

- `/listings/[id]` passe par `AnnouncementPageShell` partagé ;
- `SiteHeader searchMode fluid` aligne la fiche sur le vrai Search ;
- fond `pageLight`, largeur premium max 1500 px ;
- un seul landmark `<main>` ;
- une seule source H1 publique ;
- suppression de `PropertyDecisionHeader` de la composition active afin de ne plus demander une décision avant d'exposer le bien et d'éviter le double H1 ;
- Favorite / Compare / Mon Projet conservés sur mobile et desktop ;
- clearance du dock mobile jusqu'au footer ;
- skeleton `loading.tsx` avec `motion-reduce` ;
- `not-found.tsx` local fail-honest, sans inventer vendu/réservé/supprimé ;
- fixture QA déterministe et `noindex`, sans média/contact/galerie artificiellement autorisés ;
- anciens gates Decision Continuity, Mobile Ergonomics et Design System migrés vers la frontière de rendu réelle, jamais désactivés ;
- gate Chromium ciblé pérenne ajouté.

## Anomalie détectée et corrigée pendant le lot

La première composition L1 supprimait involontairement l'accès `Mon Projet` sur desktop lorsque l'ancien `PropertyDecisionHeader` a été retiré. Le dock mobile le conservait, donc un contrôle superficiel aurait pu laisser passer la régression. Le CTA desktop a été restauré dans le rail d'actions et le test de continuité exige désormais explicitement les deux surfaces.

## Limites volontaires

- la galerie mosaïque/swipe/fullscreen appartient à **ANN-L2** ;
- la densité actuelle encore card-heavy et le Property Core appartiennent à **ANN-L3** ;
- aucune nouvelle intelligence marché n'a été ajoutée : **ANN-L4** ;
- aucune mutation DATA, ranking, Source Registry, entitlement ou permissions.

## Inspection humaine

PASS pour le scope ANN-L1 : identité Search cohérente, shell stable, mobile/tablette/desktop sans overflow, rail desktop lisible et dock mobile exploitable. Les écarts visibles restants par rapport au mockup cible correspondent aux lots explicitement futurs L2/L3 et ne sont pas reclassés artificiellement en dette L1.

## Prochain chemin critique

**ANN-L2 — Galerie média — 7 %.**

Contrat déjà disponible : `canDisplayRealImage` / `canDisplayGallery`. La galerie ne pourra afficher plusieurs médias que si `image_permission_status === "allowed"`, `source_access_level === "partner_full"` et `gallery_image_urls` est réellement disponible. Les niveaux preview/unknown/forbidden restent fail-closed avec fallback approprié.
