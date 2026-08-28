# AKARFINDER_SEARCH_INDEXED_VISUAL_CANONICAL.md

## Chantier
**AkarFinder — Search / annonces indexées sans photos / système visuel par transaction**

Dernière mise à jour : 2026-08-28

## Goal
Remplacer uniquement pour la couche `public_indexed` les photos/fallbacks par un système propriétaire AkarFinder sans photo tierce :

- **Achat** → orange chaleureux + line-art maison / clé ;
- **Location** → bleu cobalt + line-art porte / clé ;
- **Neuf** → vert émeraude + line-art structure / grue ;
- transaction inconnue → fallback neutre AkarFinder.

Les couches `promoter_premium`, `agency_partner` et `direct_user` conservent leur pipeline image autorisé.

## Succès observable
Sur `/search`, une annonce `public_indexed` est identifiable immédiatement par sa transaction, ne peut pas afficher une photo/thumbnail tiers, garde prix/localisation/caractéristiques/provenance/CTA source, et ne modifie pas l'ordre commercial.

---

# ÉTAT FINAL VÉRIFIÉ

## Repository
- Repo : `hraaaaf/Akarfinder`
- Branche chantier : `feat/search-indexed-visual-l1`
- PR : **#943**
- Base : `main`
- Base SHA avant closeout : `9aa30aad4a7113a429216fbc8072b2916158675a`
- HEAD certifié fonctionnel : `b182a8b89982897e8114c28b785069a6a7912b70`
- HEAD documentaire final : `15b31374285bc6996faf9c3375624da6651978dc`
- DB : aucune modification
- Vercel : aucun déploiement production demandé ou exécuté

## Architecture livrée
### `lib/ux/indexed-transaction-visual.ts`
Mapping stable Achat / Location / Neuf / neutre.

### `components/search/IndexedTransactionArtwork.tsx`
SVG propriétaire local, sans URL ni asset photo tiers.

### `lib/ux/indexed-listing-visual-policy.ts`
Le visuel propriétaire est activé strictement pour le tier `public_indexed`.

### `components/search/SearchListingCardDark.tsx`
Pour `public_indexed` :
- force `IndexedTransactionArtwork` ;
- ne résout pas photo d'ambiance ;
- ne résout pas illustration contextuelle ;
- n'affiche pas thumbnail provider / image listing ;
- conserve prix, titre, localisation, facts, provenance et CTA ;
- garde le badge `Annonce indexée`.

Pour les autres tiers : pipeline image existant conservé.

### `components/search/ExternalIndexedResultCard.tsx`
Le chemin Gateway utilise le même langage visuel transactionnel tout en conservant grouping, domaine(s), prix à vérifier et CTA source.

### Fixture visuelle
`/visual-qa/search-indexed-cards` utilise le vrai `SearchListingCardDark` avec trois listings déterministes Achat / Location / Neuf.

La fixture **Location** injecte volontairement un `thumbnail_url` tiers avec `can_show_thumbnail=true` afin de prouver que la politique `public_indexed` le neutralise visuellement.

---

# LOTS

## L0 — Audit + canonique
**CLOSED.**

## L1 — Fondation visuelle transactionnelle
**CLOSED.**

Preuve : run `33181997686` ✅

## L2 — Intégration structurée `public_indexed`
**CLOSED.**

## L3 — Convergence Gateway indexée
**CLOSED.**

Preuve ciblée L1-L3 : run `33184540457` ✅
- mapping transaction ✅
- frontière `public_indexed` / partenaires / utilisateurs ✅
- TypeScript ✅

Le workflow temporaire `.github/workflows/search-indexed-visual-l1.yml` a été supprimé avant merge.

## L4 — Certification UI + closeout
**CLOSED — preuves exact-head acquises sur le HEAD fonctionnel.**

### CI exacte sur `b182a8b89982897e8114c28b785069a6a7912b70`
- UI All Pages Certification **#628** / run `33186984945` ✅
- UI All Pages Baseline **#638** / run `33186984893` ✅
- Canonical Baseline Compile **#3208** / run `33186984904` ✅
- Phase 1 Final Design Accessibility **#3091** / run `33186984949` ✅
- UI All Pages Inventory **#442** / run `33186984903` ✅
- UX Gate 0 **#2984** / run `33186984857` ✅
- Phase 1 P2 **#3092** / run `33186984883` ✅

Les commits suivants sont uniquement documentaires et ne modifient aucun comportement runtime.

### Artefact Chromium
Certification artifact : `9692354610`
Digest : `sha256:39423c85adc7c85661e8a01160f966fe973d172f7724bc878563a4cac8e1b7ee`

Captures fixture :
- `visual-qa__search-indexed-cards-390x844.png` ✅
- `visual-qa__search-indexed-cards-430x932.png` ✅
- `visual-qa__search-indexed-cards-768x900.png` ✅
- `visual-qa__search-indexed-cards-1280x900.png` ✅

Pour les 4 viewports :
- HTTP 200 ✅
- overflow horizontal : 0 ✅
- erreurs console : 0 ✅
- erreurs ressources inattendues : 0 ✅
- findings : 0 ✅

### Validation visuelle
Comparaison avec le Goal/TARGET documenté :
- Achat orange : conforme ✅
- Location cobalt : conforme ✅
- Neuf émeraude : conforme ✅
- dessins propriétaires non photoréalistes : conforme ✅
- aucune photo tierce visible : conforme ✅
- hiérarchie prix / titre / localisation / facts / source conservée : conforme ✅

Score visuel après inspection réelle des captures : **9.2/10**.
- desktop : ~9.4/10 ;
- mobile : ~9.0/10 ;
- compromis restant : densité de la grille mobile 2 colonnes, doctrine antérieure conservée volontairement.

---

# GATES ROUGES GLOBAUX DIAGNOSTIQUÉS

Ils ne remettent pas en cause le Goal de ce lot :

- plusieurs anciens contrats Search/BottomNav attendent encore `Compte` ou `/profil-recherche`, alors que #941 a convergé ces flows vers `Mon Projet` ;
- certains predecessor contracts interdisent `normalized_price_mad` dans `ExternalIndexedResultCard`, alors que ce champ était déjà consommé sur `main` avant #943 ;
- UX-CARDS-10OF10 échoue sur l'ancien contrat de navigation `Mon projet`, pas sur les cartes de #943.

Ces rouges sont documentés comme dette de contrats historiques et ne sont pas masqués.

---

# GARDE-FOUS CONFIRMÉS

- aucun photoréalisme pour `public_indexed` ;
- aucun asset photo/URL tiers dans le nouveau composant ;
- aucun changement du ranking commercial ;
- neutralisation média strictement limitée à `public_indexed` ;
- partenaires / direct user gardent leur pipeline image ;
- aucune DB ;
- aucun déploiement production Vercel sans human gate explicite.

---

# NEXT EXACT

1. Passer PR #943 ready.
2. Squash merge si le HEAD n'a pas bougé et reste mergeable.
3. Vérifier `main` post-merge.
4. Aucun déploiement Vercel sans autorisation explicite.

# ÉTAT DE REPRISE
- L0 : CLOSED
- L1 : CLOSED
- L2 : CLOSED
- L3 : CLOSED
- L4 : CLOSED
- preuve visuelle : ACQUISE
- blocage réel : aucun pour le merge Git
- deployment production : NON AUTORISÉ
