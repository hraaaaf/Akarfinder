# ANN-L2 — Galerie média — Closeout

**Programme :** `ANNOUNCEMENT-PAGE-ULTRA-PREMIUM`  
**Date :** 2026-08-16  
**État :** ✅ CLOSED  
**Crédit :** +7 %  
**Progression programme après closeout :** 18 / 100 %

## Preuves exactes

- PR runtime : **#725 ✅ MERGED**.
- Head exact certifié : `8cad00a6f2ef08f8944b7e1c3cdef93a9f0123fd`.
- Merge `main` : `5664f699b7f51d06f368331d6e0e5a1c51cce83c`.
- Gate dédié `Announcement Page L2 Media Gallery`, run `31938661694` : **SUCCESS**.
- Artefact visuel : `9261410081`.
- Digest : `sha256:7cf154d5bf8c09f1f15f304d681ba265b2477c3e9b5d27e9ef55e1d36cf31d16`.
- Rapport : `ANNOUNCEMENT_PAGE_L2_MEDIA_VISUAL_V1` ; **10/10 screenshots ; 0 finding**.

## Certification machine

Scénarios certifiés :

- galerie réelle : 390×844 / 430×932 / 768×900 / 1280×900 ;
- galerie 2 photos : 1280×900 ;
- preview single-image : 390×844 / 1280×900 ;
- permission `forbidden` : 390×844 → fallback ;
- permission `unknown` : 390×844 → fallback ;
- URL volontairement cassée : 390×844 → fallback après exactement **1** réponse HTTP 404 attendue.

Sur les 10 scénarios :

- HTTP page 200 ;
- `h1Count = 1` ;
- `mainCount = 1` ;
- `scrollWidth = clientWidth` ;
- aucun finding ;
- aucune erreur HTTP inattendue.

Le scénario broken conserve la console navigateur 404 attendue pour l'asset explicitement absent ; cette erreur est volontairement admise par le gate uniquement pour ce scénario et conduit au fallback.

## Résultat livré

- `PropertyMediaGallery` actif dans `/listings/[id]` ;
- swipe mobile, navigation, compteur réel, fullscreen, clavier, focus trap et retour du focus ;
- favori, partage et attribution ;
- galerie réelle uniquement lorsque `image_permission_status = allowed`, `source_access_level = partner_full` et `can_show_gallery = true` ;
- preview autorisée limitée à une seule image réelle ;
- forbidden/unknown et absence de média → `ListingVisual` honnête ;
- état 2 photos desktop sans case vide ;
- aucune pseudo-mosaïque illustrative quand une seule photo est autorisée ;
- photos propriétaires chargées depuis `seller_property_draft_photos` via URLs Storage signées serveur 15 minutes ;
- bucket `seller-property-drafts` conservé privé ;
- `/listings/[id]` request-dynamic afin de ne pas figer les URLs signées ;
- aucune migration DB dans ce lot.

## Vérification live Supabase en lecture seule

Pendant le lot :

- projet AqarFinder : `ACTIVE_HEALTHY` ;
- bucket `seller-property-drafts` : privé ;
- `owner_listing_representations.draft_id` : présent ;
- RPC owner projection/search : présents ;
- upload photo : `upload_status = uploaded`, cohérent avec le filtre du loader public ;
- stock observé : **0 représentation propriétaire / 0 photo**, donc aucune migration de données n'était nécessaire.

Cette observation est datée du lot et n'est pas présentée comme un état permanent de production.

## Anomalies détectées et corrigées

1. Le premier état desktop single/preview pouvait suggérer plusieurs médias via des visuels illustratifs. Corrigé : **1 média autorisé = 1 média réel**.
2. Une duplication DOM responsive pouvait provoquer deux requêtes sur un asset cassé. Corrigé : une seule requête attendue dans le scénario broken.
3. Après suppression de cette duplication, un 404 très rapide pouvait terminer avant l'hydratation React et avant l'attachement de `onError`. `MediaImage` vérifie désormais aussi `complete && naturalWidth === 0` après hydratation et déduplique le signal d'erreur.
4. Le fullscreen a été durci lorsque le média actif disparaît : fermeture, restauration du scroll body et retour du focus.
5. Le cas exactement 2 photos est désormais certifié explicitement sur desktop.

## Non-régression exact-head

SUCCESS observé sur le même head pour :

- ANN-L1 Premium Shell ;
- Mobile Decision Ergonomics ;
- Decision Continuity ;
- Design System Convergence ;
- Seller Structured Draft ;
- Seller Secure Publish Flow ;
- Final Design Accessibility ;
- Canonical Baseline Validation ;
- Canonical Baseline Compile Validation ;
- Search Truth ;
- P0 Closure ;
- P1 Final Sweep.

## Limites volontaires

- le flux CSV partenaire actuel ne comporte aucun champ média ; le contrat `partner_full` est prêt, mais ce closeout ne prétend pas qu'un feed partenaire multi-image réel existe déjà ;
- prix/titre/localisation/facts restent encore trop liés au hero et à une hiérarchie card-heavy : **ANN-L3** ;
- Akar Intelligence reste **ANN-L4** ;
- aucune permission tierce n'a été élargie et aucun bucket privé n'a été rendu public.

## Inspection humaine

PASS pour le scope ANN-L2 : mosaïque 4 photos desktop, galerie 2 photos, swipe mobile, preview single-image et fallbacks forbidden/unknown/broken cohérents. Les écarts visibles restants par rapport à la cible Zillow-like concernent principalement le Property Core et la densité sous le média, donc ANN-L3.

## Prochain chemin critique

**ANN-L3 — Property Core — 6 %.**

Objectif immédiat : sortir transaction/prix/titre/localisation du hero média, condenser les facts essentiels en une ligne lisible, réduire la pile de cartes sans perdre de donnée ni provenance, puis certifier prix absent, titre long et densités de facts variables.