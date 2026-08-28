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

## Repository — livraison initiale
- Repo : `hraaaaf/Akarfinder`
- PR : **#943** — merged par squash ✅
- Commit merge initial sur `main` : `320f9823f77e7c7285ee6a6481e00d9b0e943ef4` ✅
- Base avant merge : `9aa30aad4a7113a429216fbc8072b2916158675a`
- HEAD fonctionnel certifié initial : `b182a8b89982897e8114c28b785069a6a7912b70`
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
- L4 — Certification UI + closeout initial : **CLOSED** ✅
- L5 — Polish visuel transactionnel : **CLOSED / MERGED** ✅

---

# PREUVES INITIALES

## Fonctionnel / contrats
- L1 run `33181997686` ✅
- L1-L3 run `33184540457` ✅
  - mapping transaction ✅
  - frontière `public_indexed` / partenaires / utilisateurs ✅
  - TypeScript ✅
- workflow temporaire `.github/workflows/search-indexed-visual-l1.yml` supprimé avant merge ✅

## Chromium initial
Run `33186984893` — **UI All Pages Baseline** ✅

Artifact inspecté : `9692437320`
Digest : `sha256:d558d399acdbe0176823a0fc7c8b62a40bb759d0337900688b2020736eaed503`

Captures inspectées :
- `visual-qa__search-indexed-cards-390x844.png` ✅
- `visual-qa__search-indexed-cards-430x932.png` ✅
- `visual-qa__search-indexed-cards-768x900.png` ✅
- `visual-qa__search-indexed-cards-1280x900.png` ✅

Pour les 4 viewports : HTTP 200, overflow 0, erreurs console 0, erreurs ressources inattendues 0, findings 0.

Score visuel initial documenté après inspection réelle : **9.2/10**.

---

# L5 — POLISH VISUEL TRANSACTIONNEL

## Goal
Renforcer la signature visuelle des cartes indexées sans modifier leur logique, leur palette, leur hiérarchie, leur politique média ni leur ranking.

## Implémentation
PR **#944** — `style(search): polish indexed transaction visuals`.

Diff applicatif strict :
- `components/search/IndexedTransactionArtwork.tsx` uniquement ;
- +48 / -37 ;
- Achat : silhouette maison + clé plus architecturale ;
- Location : porte ouverte + mouvement + clé, nettement plus distinctive ;
- Neuf : structure + grue plus lisibles ;
- cercles/vagues décoratifs génériques supprimés au profit d'un langage architectural.

Aucun changement de mapping, CTA, données, ranking, pipeline image partenaire/direct user ou DB.

## Repository — polish
- PR : **#944** ✅
- HEAD exact certifié avant merge : `afa19107b4f8b4c57e2ea29bac5d9f2483500d9e`
- Base `main` avant merge : `b571a6b6c0f4ebeb59df279c0942d0b334e3b15d`
- Merge : squash ✅
- Commit merge sur `main` : `002e0c7bdbafd8ba9123cb32fd1d2f5074eafa6f` ✅
- Vérification post-merge : `main` pointe exactement sur `002e0c7bdbafd8ba9123cb32fd1d2f5074eafa6f` et le commit GitHub est vérifié/signé ✅
- DB : aucune modification
- Vercel : aucun déploiement production exécuté

## Preuves exact-head — polish
- Canonical Baseline Compile #3213 / run `33193892625` ✅
- Phase 1 Final Design Accessibility #3096 / run `33193892531` ✅
- UI All Pages Certification #633 / run `33193892562` ✅
- UI All Pages Baseline #643 / run `33193892593` ✅

Artifact Chromium #633 :
- id `9695102336`
- digest `sha256:b1e567f05636df440ae91be9f5fface63710b2d1d59ad0b13c6080545f2efade`

AFTER inspecté réellement :
- 390×844 ✅
- 430×932 ✅
- 768×900 ✅
- 1280×900 ✅

Pour les 4 viewports :
- HTTP 200 ✅
- overflow horizontal : 0 ✅
- erreurs console : 0 ✅
- erreurs ressources inattendues : 0 ✅
- findings : 0 ✅

## Comparaison BEFORE / AFTER
- Achat : signature plus architecturale, lecture conservée ✅
- Location : distinction fortement améliorée ✅
- Neuf : structure/grue plus lisibles et propriétaires ✅
- hiérarchie prix / titre / localisation / facts / source inchangée ✅
- aucune photo tierce visible ✅
- densité mobile 2 colonnes conservée volontairement ✅

Score visuel après inspection réelle : **9.5/10**.

## Gates rouges inspectés
Le gate `UX-SEARCH-7` reste rouge sur deux assertions hors diff :
1. `ExternalIndexedResultCard` contient `normalized_price_mad` ;
2. le header ne contient plus l'item legacy `Mon projet` attendu par le test.

Ces zones ne sont pas modifiées par #944. Les gates ciblés du polish, TypeScript/build, accessibilité et Chromium sont verts.

---

# GARDE-FOUS CONFIRMÉS

- aucun photoréalisme pour `public_indexed` ;
- aucun asset photo/URL tiers dans le composant ;
- aucun changement du ranking commercial ;
- neutralisation média strictement limitée à `public_indexed` ;
- partenaires / direct user gardent leur pipeline image ;
- aucune DB ;
- aucun déploiement production Vercel sans human gate explicite.

---

# CLOSEOUT

**CHANTIER INDEXED VISUAL + POLISH CLOSED / MERGED.**

Dernière preuve : PR #944 squash-merged, `main` vérifié sur `002e0c7bdbafd8ba9123cb32fd1d2f5074eafa6f`, Chromium #633 et Baseline #643 verts, score visuel réel **9.5/10**.

Blocage réel restant : **human gate Vercel uniquement** si un déploiement production de ce commit est souhaité.

Next exact : ne rien déployer tant qu'une autorisation explicite Vercel n'est pas donnée.
