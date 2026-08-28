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
Une annonce `public_indexed` est identifiable immédiatement par sa transaction, ne peut pas afficher une photo/thumbnail tiers, garde prix/localisation/caractéristiques/provenance/CTA source, et ne modifie pas l'ordre commercial.

---

# ÉTAT FINAL VÉRIFIÉ

## Repository
- Repo : `hraaaaf/Akarfinder`
- PR : **#943** — merged par squash ✅
- Commit merge sur `main` : `320f9823f77e7c7285ee6a6481e00d9b0e943ef4` ✅
- Base avant merge : `9aa30aad4a7113a429216fbc8072b2916158675a`
- HEAD fonctionnel certifié avant closeout documentaire : `b182a8b89982897e8114c28b785069a6a7912b70`
- Vérification post-merge : `main` pointe bien sur le commit merge et le diff contient uniquement les 9 fichiers attendus du chantier ✅
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

- L0 — Audit + canonique : **CLOSED** ✅
- L1 — Fondation visuelle transactionnelle : **CLOSED** ✅
- L2 — Intégration structurée `public_indexed` : **CLOSED** ✅
- L3 — Convergence Gateway indexée : **CLOSED** ✅
- L4 — Certification UI + closeout : **CLOSED** ✅

---

# PREUVES

## Fonctionnel / contrats
- L1 run `33181997686` ✅
- L1-L3 run `33184540457` ✅
  - mapping transaction ✅
  - frontière `public_indexed` / partenaires / utilisateurs ✅
  - TypeScript ✅
- workflow temporaire `.github/workflows/search-indexed-visual-l1.yml` supprimé avant merge ✅

## Chromium exact-head
Run `33186984893` — **UI All Pages Baseline** ✅
- npm ci ✅
- inventaire ✅
- naming regression ✅
- TypeScript ✅
- Chromium ✅
- build production ✅
- serveur production local ✅
- captures ✅
- upload artifact ✅

Artifact inspecté : `9692437320`
Digest : `sha256:d558d399acdbe0176823a0fc7c8b62a40bb759d0337900688b2020736eaed503`

Captures inspectées :
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

## Validation visuelle
Comparaison BEFORE / TARGET / AFTER :
- Achat orange : conforme ✅
- Location cobalt : conforme ✅
- Neuf émeraude : conforme ✅
- dessins propriétaires non photoréalistes : conforme ✅
- aucune photo tierce visible : conforme ✅
- hiérarchie prix / titre / localisation / facts / source conservée : conforme ✅

Score visuel documenté après inspection réelle : **9.2/10**.
Compromis restant : densité mobile 2 colonnes conservée volontairement par la doctrine Search existante.

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

# CLOSEOUT

**CHANTIER CLOSED / MERGED.**

Blocage réel restant : **human gate Vercel uniquement** si un déploiement production de ce commit est souhaité.

Next exact : ne rien déployer tant qu'une autorisation explicite Vercel n'est pas donnée.
