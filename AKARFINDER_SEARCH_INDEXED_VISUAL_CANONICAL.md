# AKARFINDER_SEARCH_INDEXED_VISUAL_CANONICAL.md

## Chantier
**AkarFinder — Search / Annonces indexées sans photos / système visuel par transaction**

Dernière mise à jour : 2026-08-28

## Goal
Remplacer uniquement pour la couche **annonces indexées externes** les photos/fallbacks actuels par un système propriétaire AkarFinder sans photo tierce :

- **Achat** : orange chaleureux + line-art maison / clé.
- **Location** : bleu cobalt + line-art porte / clé.
- **Neuf** : vert émeraude + line-art structure / grue.
- transaction inconnue : fallback neutre AkarFinder.

Les couches prioritaires conservent leurs photos quand elles sont autorisées :
1. promoteurs partenaires ;
2. agences partenaires ;
3. annonces déposées directement sur AkarFinder ;
4. annonces indexées externes = visuel AkarFinder sans photo tierce.

## Succès observable
Sur `/search`, chaque annonce `public_indexed` est immédiatement identifiable par sa transaction et n'affiche ni photo source, ni thumbnail provider, ni photo d'ambiance, ni illustration contextuelle. Prix, localisation, caractéristiques, provenance et CTA source restent fonctionnels. Les trois couches supérieures ne régressent pas.

## Preuves requises avant clôture
- BEFORE réel `/search?city=Casablanca` : 390×844.
- TARGET approuvé : `maquette_akarfinder_système_immobilier_coloré.png`.
- tests mapping et frontière no-photo verts.
- TypeScript vert.
- build Next.js vert.
- AFTER 390×844 / 430×932 / 768×900 / 1280×900.
- comparaison BEFORE/AFTER + TARGET.
- preuve promoteur/agence/direct_user = pipeline images autorisées inchangé.
- preuve `public_indexed` = zéro photo tierce.
- score visuel documenté seulement après captures.

---

## État repo vérifié
- Repo : `hraaaaf/Akarfinder`
- Base auditée : `main`
- Base SHA : `bd0b04b35a5f7f9e1c06f8da5c0dfac9e168c509`
- Branche chantier : `feat/search-indexed-visual-l1`
- PR : **#943**, draft, ouverte, mergeable au dernier contrôle.
- HEAD chantier courant au dernier push fonctionnel/CI : `05dda911cb5f07d91f21d7ec04d8da0bd1de2b20` avant cette mise à jour documentaire.
- Projet Vercel : `akarfinder`.
- Aucun déploiement production Vercel manuel autorisé sans human gate explicite.
- DB : hors périmètre, aucune modification.

## Références visuelles
- BEFORE réel : `akarfinder-prod-casablanca-390.png`.
- TARGET approuvé : `maquette_akarfinder_système_immobilier_coloré.png`.
- Décision figée : couleur basée sur **transaction**, pas type de bien.

---

# AUDIT / CONTRATS EXISTANTS

## `/search`
`app/search/page.tsx` rend `LightZillowSearchShell`. La carte structurée réelle est `components/search/SearchListingCardDark.tsx`.

## Ordre commercial
`lib/search/search-commercial-priority.ts` impose :
1. `promoter_premium`
2. `agency_partner`
3. `direct_user`
4. `public_indexed`

**Ne pas toucher au ranking/tri commercial dans ce chantier.**

## Politique image
`lib/listings/image-policy.ts` reste fail-closed et n'est pas affaibli. Avant ce chantier, le fallback de la carte principale pouvait aller vers : photo d'ambiance → illustration contextuelle → illustration générique.

Décision implémentée : la couche `public_indexed` court-circuite ces médias dans la présentation et utilise le visuel AkarFinder propriétaire. Les autres tiers gardent leur pipeline existant.

## Deux chemins indexés
### A. Listings structurés
`SearchListingCardDark.tsx`.

### B. Gateway SERP
`ExternalIndexedResultsSection.tsx` → `ExternalIndexedResultCard.tsx`.

Les deux chemins doivent converger sur le même langage visuel.

---

# ARCHITECTURE IMPLÉMENTÉE

## `lib/ux/indexed-transaction-visual.ts`
Mapping stable :
- buy → Achat / orange
- rent → Location / cobalt
- new → Neuf / émeraude
- inconnu → neutre

## `components/search/IndexedTransactionArtwork.tsx`
SVG propriétaire local, aucune URL/image tierce. Props permettant d'éviter les doublons de badge transaction/disclosure selon le shell appelant.

## `lib/ux/indexed-listing-visual-policy.ts`
`shouldUseIndexedTransactionArtwork(listing)` délègue à `getSearchCommercialTier()` et retourne vrai uniquement pour `public_indexed`.

## `SearchListingCardDark.tsx`
Pour `public_indexed` :
- force `IndexedTransactionArtwork` ;
- ne résout pas photo d'ambiance ;
- ne résout pas illustration contextuelle ;
- n'affiche pas provider thumbnail / image listing ;
- garde le shell, prix, titre, localisation, facts, provenance et CTA ;
- badge explicite `Annonce indexée`.

Pour les autres tiers : pipeline image existant conservé.

## `ExternalIndexedResultCard.tsx`
Le chemin gateway affiche maintenant le même `IndexedTransactionArtwork` en tête de carte. Grouping, domaine(s), prix à vérifier et CTA source sont conservés.

---

# LOTS

## L0 — Audit + canonique
**État : CLOSED.**

## L1 — Fondation visuelle transactionnelle
**État : CLOSED.**

Preuve : GitHub Actions **run #33181997686**, job `verify` :
- install ✅
- test mapping ✅
- TypeScript ✅

## L2 — Intégration `public_indexed` structurée
**État : IMPLEMENTED, certification CI en cours.**

Fichiers :
- `lib/ux/indexed-listing-visual-policy.ts`
- `scripts/scrapers/__tests__/indexed-listing-visual-policy.test.ts`
- `components/search/SearchListingCardDark.tsx`

## L3 — Convergence gateway indexée
**État : IMPLEMENTED, certification CI en cours.**

Fichier : `components/search/ExternalIndexedResultCard.tsx`.

## L4 — Certification UI + closeout
**État : ACTIVE.**

Infrastructure réutilisée : `.github/workflows/ui-all-pages-baseline.yml` + `scripts/audits/ui-all-pages-baseline.mjs`.

Viewports vérifiés dans le script :
- 390×844
- 430×932
- 768×900
- 1280×900

Le workflow exécute npm ci, inventaire, test de naming, TypeScript, installation Chromium, build production, serveur local, captures exhaustives, puis upload artifact.

---

# CI / RUNS

## L1
- Run : `33181997686`
- État : completed / success.

## L1-L3 ciblé
- Run : `33184540457`
- HEAD : `05dda911cb5f07d91f21d7ec04d8da0bd1de2b20`
- Dernier état vérifié : queued.
- Ne pas poller passivement ; revérifier après travail indépendant.

## UI baseline PR
- workflow : `UI All Pages Baseline`
- déclenché par PR #943.
- dernier état observé : queued.

---

# GARDE-FOUS

- aucun photoréalisme pour les indexées ;
- aucun asset photo/URL tierce dans le nouveau composant ;
- aucune modification du ranking commercial ;
- condition stricte `public_indexed` pour neutraliser les médias tierces ;
- partner/direct-user restent sur politique image existante ;
- pas de nouveau patch CSS global `!important` ;
- pas de DB ;
- pas de déploiement production Vercel sans autorisation explicite.

---

# NEXT EXACT

1. Vérifier le run ciblé `33184540457` après le travail indépendant déjà réalisé.
2. Si rouge : lire logs → corriger → relancer par push sûr.
3. Si vert : vérifier la dernière `UI All Pages Baseline` de PR #943.
4. Si baseline rouge : diagnostiquer build/TypeScript/UI → corriger.
5. Si baseline verte : télécharger artifact et inspecter `/search` aux 4 viewports.
6. Comparer AFTER au BEFORE 390×844 et au TARGET approuvé.
7. Corriger écarts critiques si nécessaire et refaire certification.
8. Documenter score visuel et preuves.
9. Supprimer le workflow temporaire ciblé `search-indexed-visual-l1.yml` avant merge si aucune valeur durable n'est justifiée.
10. Mettre PR ready uniquement quand toutes les preuves sont vertes.
11. Merge après certification.
12. Human gate explicite avant tout déploiement production Vercel.
13. Post-merge verification + mise à jour canonique finale.

# ÉTAT AU HANDOVER
- L0 : CLOSED
- L1 : CLOSED
- L2 : IMPLEMENTED / CI pending
- L3 : IMPLEMENTED / CI pending
- L4 : ACTIVE
- PR : #943 draft
- blocage réel actuel : capacité GitHub Actions / runs queued
- prochaine preuve attendue : run ciblé L1-L3 puis baseline UI
