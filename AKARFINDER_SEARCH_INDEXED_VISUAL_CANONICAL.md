# AKARFINDER_SEARCH_INDEXED_VISUAL_CANONICAL.md

## Chantier
**AkarFinder — Search / Annonces indexées sans photos / système visuel par transaction**

Dernière mise à jour : 2026-08-28

## Goal
Remplacer, uniquement pour la couche **annonces indexées externes**, les visuels génériques / contextuels actuels par un système propriétaire AkarFinder sans photo de bien :

- **Achat** : orange chaleureux + dessin linéaire propriétaire maison / repère / clé.
- **Location** : bleu cobalt + dessin linéaire propriétaire porte ouverte / clé / accès.
- **Neuf** : vert émeraude + dessin linéaire propriétaire grue / structure / plan.

Les trois couches prioritaires conservent leurs photos lorsqu'elles sont autorisées :
1. promoteurs partenaires ;
2. agences partenaires ;
3. annonces déposées directement sur AkarFinder ;
4. annonces indexées externes = **sans photo tierce**.

## Succès observable
Sur `/search`, une annonce indexée est identifiable en un coup d'œil par sa transaction, sans pouvoir confondre le dessin avec une photo du bien. La hiérarchie commerciale, le prix, la localisation, les caractéristiques, la provenance et le CTA source restent lisibles et fonctionnels. Les trois couches supérieures ne régressent pas.

## Preuves requises avant clôture
- BEFORE réel de `/search?city=Casablanca` au viewport 390×844.
- Mockup approuvé : `maquette_akarfinder_système_immobilier_coloré.png`.
- Tests unitaires/politiques ciblés verts.
- TypeScript (`npx tsc --noEmit`) vert.
- Build Next.js vert si l'environnement de CI le permet.
- AFTER aux mêmes viewports que la certification UI : 390 / 430 / 768 / 1280, avec comparaison BEFORE/AFTER.
- Vérification explicite que promoteur/agence/utilisateur gardent les images autorisées.
- Vérification explicite que les indexées n'affichent aucune photo tierce.
- Score visuel documenté après comparaison, jamais déclaré avant preuves.

---

## État repo vérifié
- Repository : `hraaaaf/Akarfinder`
- Branche de référence : `main`
- HEAD audité : `bd0b04b35a5f7f9e1c06f8da5c0dfac9e168c509`
- Commit : `fix(ux): converge navigation on Mon Projet (#941)`
- Projet Vercel : `akarfinder`
- Project ID : `prj_RCs2Ku5vex9cpABWnwaCjbuKrhhc`
- Team ID : `team_NNhXPDOIfjGNBcn253btpyk0`
- Aucun déploiement Vercel manuel n'est autorisé sans human gate explicite.

## Référence visuelle BEFORE
Capture navigateur réelle existante : `akarfinder-prod-casablanca-390.png`, 390×844, `/search?city=Casablanca`.

## Référence TARGET approuvée
Mockup approuvé : `maquette_akarfinder_système_immobilier_coloré.png`.

Décision figée : le code couleur est basé sur la **transaction** (Achat / Location / Neuf), pas sur le type de bien.

---

# AUDIT DU SITE ET DU CODE

## 1. Page `/search`
`app/search/page.tsx` rend `LightZillowSearchShell` et charge plusieurs feuilles CSS historiques. Pour ce chantier, ne pas ajouter une nouvelle feuille de patch globale si une classe/composant local suffit.

## 2. Ordre commercial déjà codé
`lib/search/search-commercial-priority.ts` impose déjà l'ordre :
1. `promoter_premium`
2. `agency_partner`
3. `direct_user`
4. `public_indexed`

**Décision : ne pas toucher au ranking / tri commercial dans ce chantier.**

## 3. Deux chemins d'annonces indexées existent réellement
### Chemin A — listings structurés `/api/search`
Les listings passent par `partitionCommercialSearchListings()` puis sont rendus avec `components/search/SearchListingCardDark.tsx`.

Aujourd'hui, cette carte :
- affiche une image autorisée si la politique l'autorise ;
- sinon passe en `fallback_visual` ;
- tente une photo d'ambiance quartier ;
- sinon une illustration contextuelle ;
- sinon `PropertyTypeArtwork` générique.

### Chemin B — résultats gateway `/api/search/gateway`
Les résultats gateway sont rendus via :
- `components/search/ExternalIndexedResultsSection.tsx`
- `components/search/ExternalIndexedResultCard.tsx`

Cette carte est déjà data-first et sans image, mais son design reste distinct du shell principal.

**Conséquence : la refonte doit couvrir A + B.**

## 4. Politique image actuelle
`lib/listings/image-policy.ts` est fail-closed :
- `partner_full + allowed` => image réelle ;
- `preview_allowed + allowed` => preview ;
- indexed/unknown/forbidden => fallback ;
- une lane `db_provider_thumbnail` existe derrière un kill switch explicite.

### Décision de ce chantier
Ne pas affaiblir `image-policy.ts`. Le nouveau système visuel doit être en aval de cette politique.

## 5. Provenance / transparence
Le dessin n'est jamais présenté comme une photo du bien. La carte doit garder un libellé explicite `Annonce indexée` et un CTA vers la source originale.

## 6. Grille mobile actuelle
`app/search/search-premium-grid.css` force actuellement 2 colonnes sous 640 px. Le mockup approuvé conserve la logique de grille existante. Cette décision ne sera rouverte qu'en cas de collision visuelle prouvée au AFTER.

---

# ARCHITECTURE DE MODIFICATION

## Principe
Créer **un seul système visuel partagé** puis l'utiliser dans les deux chemins d'indexation.

### Nouveau composant
`components/search/IndexedTransactionArtwork.tsx`

Responsabilités :
- accepter `transaction: buy | rent | new | autre` ;
- retourner palette + SVG propriétaire déterministe ;
- `Achat` = orange ;
- `Location` = cobalt ;
- `Neuf` = émeraude ;
- fallback neutre AkarFinder si transaction inconnue ;
- SVG décoratif `aria-hidden` ;
- aucun asset photo ;
- aucune URL tierce ;
- aucun texte laissant croire qu'il s'agit du bien réel.

### Mapping partagé
`lib/ux/indexed-transaction-visual.ts`

Il centralise label, tokens/couleurs et variante d'illustration.

### Intégration chemin A
Dans `SearchListingCardDark.tsx`, si `public_indexed`, rendre `IndexedTransactionArtwork` dans la zone media existante et conserver les données/CTA existants.

### Intégration chemin B
Dans `ExternalIndexedResultCard.tsx`, faire converger visuellement le shell avec les cartes indexées du chemin A et utiliser le même artwork.

---

# PLAN EN 5 LOTS

## L0 — Audit + contrat + handover canonique
**Goal** : verrouiller le comportement réel et le périmètre avant code.

**État** : CLOSED. Canonique maintenant versionné sur la branche de chantier.

## L1 — Fondation visuelle transactionnelle
**Goal** : créer le composant SVG propriétaire et le mapping transaction/couleur.

**Succès** : Achat/Location/Neuf ont chacun une représentation stable et accessible, sans dépendance externe.

**Preuve** : tests unitaires du mapping + TypeScript vert.

## L2 — Intégration `public_indexed` structurée
**Goal** : remplacer uniquement les fallbacks visuels des annonces indexées dans `SearchListingCardDark`.

## L3 — Convergence gateway indexée
**Goal** : appliquer le même langage visuel à `ExternalIndexedResultCard` sans casser grouping, prix à vérifier et CTA source.

## L4 — Certification UI + closeout
**Goal** : certifier le chantier de bout en bout.

**Preuve** : tests, TypeScript, build, BEFORE/AFTER 390/430/768/1280, comparaison visuelle, score, CI, closeout.

---

# TESTS À AJOUTER / RÉUTILISER

1. Image policy existante.
2. Commercial priority.
3. Mapping artwork : buy→orange/Achat, rent→cobalt/Location, new→emerald/Neuf, unknown→fallback neutre.
4. No-photo indexed contract.
5. Authorized image regression.
6. External gateway grouping/CTA/prix.
7. Responsive 390 / 430 / 768 / 1280.

---

# RISQUES / GARDE-FOUS

- Ne modifier qu'un seul pipeline : interdit, L2 + L3 séparés.
- Illustration ambiguë : line-art abstrait + `Annonce indexée`, aucun photoréalisme.
- Ordre commercial : tests dédiés.
- Photos partenaires : condition stricte `public_indexed`.
- CSS : pas d'empilement de nouveaux `!important` globaux.
- Deployment : aucun déploiement production Vercel sans autorisation explicite.

---

# SÉQUENCE DE REPRISE EXACTE

1. Lire ce fichier.
2. Vérifier HEAD `main`, branche/PR/CI.
3. Continuer L1 → tester → L2 → tester → L3 → tester.
4. L4 : captures AFTER 390/430/768/1280 et comparaison au BEFORE/mockup.
5. Corriger les écarts critiques.
6. Mettre à jour ce fichier avec commits, PR, runs, captures et score réellement obtenus.
7. Merge si preuves vertes.
8. Déploiement production Vercel uniquement après autorisation explicite.
9. Post-merge verification puis clôture.

---

# ARTEFACTS DE RÉFÉRENCE
- BEFORE réel : `akarfinder-prod-casablanca-390.png`
- TARGET approuvé : `maquette_akarfinder_système_immobilier_coloré.png`
- Canonique : `AKARFINDER_SEARCH_INDEXED_VISUAL_CANONICAL.md`

# ÉTAT AU HANDOVER
- L0 : CLOSED.
- L1 : STARTED.
- L2 : NOT STARTED.
- L3 : NOT STARTED.
- L4 : NOT STARTED.
- Branche chantier : `feat/search-indexed-visual-l1`.
- Base : `bd0b04b35a5f7f9e1c06f8da5c0dfac9e168c509`.
- DB : hors périmètre, aucune modification.
- Next exact : implémenter le mapping + composant L1, tester, puis continuer vers L2 si vert.
