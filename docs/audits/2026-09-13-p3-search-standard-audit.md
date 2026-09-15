# AKARFINDER — P3 SEARCH STANDARD V1 — AUDIT / IMPLEMENTATION

**Date:** 2026-09-13  
**Statut:** IMPLEMENTATION AUTORISÉE / AFTER REQUIS AVANT FREEZE L0  
**Base:** `main@cc748ec5eb24f422216cb1261e4c01977e7f25d0`  
**Branche:** `audit/p3-search-standard-20260913`  
**PR:** `#1035`

## Goal

Définir puis prouver un standard durable de `/search` centré sur les résultats, sans rouvrir P1 HOME ni P2 IA.

### Succès observable

- recherche, filtres, résultats et carte forment la couche primaire ;
- mobile expose toujours `Liste / Carte` ;
- tablette/desktop conservent `Liste / Mixte / Carte` ;
- filtres actifs ont un feedback cohérent ;
- l’intelligence quartier/marché reste secondaire aux résultats ;
- continuité Search ↔ Map ↔ Detail préservée ;
- AFTER 390 / 768 / 1280 sans overflow ni régression ;
- aucun nouveau standard P3 déclaré L0 sans preuve AFTER + accord propriétaire sur le périmètre exact.

---

## 1. BEFORE — PREUVE RÉELLE

Run : `34783010840` — **SUCCESS**  
HEAD : `d0f45c119b2abf10a7d9abdc2cdc5c0f3149eed3`  
Artifact : `10325676726` — `p3-search-before-34783010840`  
Digest : `sha256:6163177f001324c24875eb663b8b0376b8ca42bd871482f10e4ccfa5a418ec10`

Viewports :

- 390 × 844 ;
- 768 × 1024 ;
- 1280 × 900.

### Constats vérifiés

1. **390 px : contrôle de vue absent.** Le défaut code `hidden sm:hidden` est confirmé visuellement.
2. **768 / 1280 : contrôle de vue présent.**
3. Aucun overflow horizontal observé.
4. Les filtres primaires sont visibles.
5. Le compteur de filtres et les chips ne représentent pas exactement toutes les dimensions actives.
6. Le scénario BEFORE peut afficher un compteur de résultats tout en laissant les panneaux d’intelligence quartier/marché dominer la suite de page lorsque les cartes visibles sont absentes.
7. `/api/geo/casablanca-arrondissements?canary=1` peut répondre 404 dans le scénario d’audit ; ce comportement vient du gate canary existant et ne doit pas être transformé en 200 artificiel sans vérifier son contrat.

---

## 2. RUNTIME / DETTES STRUCTURELLES

`/search` combine déjà :

- SSR initial + pagination ;
- lane `/api/search` ;
- lane `/api/search/gateway` ;
- filtres + URL canonique ;
- liste / mixte / carte ;
- compare + quick preview ;
- personnalisation Mon Projet ;
- continuité Search ↔ Map ↔ Detail ;
- intelligence prix/quartier en aval.

Dettes identifiées :

- contrôle mobile de vue historiquement masqué ;
- feedback incomplet de certains filtres actifs ;
- deux lanes de résultats dont la sémantique de total/overlap reste à auditer séparément ;
- `SearchMapNavigationBridge` basé sur `MutationObserver`, fonctionnel mais couplé au DOM ;
- empilement de plusieurs générations CSS ;
- trop de surfaces secondaires capables de concurrencer les résultats.

---

## 3. BENCHMARK / PRINCIPE RETENU

Benchmark initial : Redfin / Rightmove / idealista / Zillow.

Convergence utile :

- carte et liste partagent le même état de recherche ;
- filtres essentiels visibles, avancés dans un panneau ;
- changement de vue disponible sans casser la requête ;
- résultats restent visuellement prioritaires ;
- continuité de zone/filtres lors du passage carte ↔ liste.

Le benchmark n’impose pas de recopier leurs identités visuelles. AkarFinder conserve ses standards P1/P2.

---

## 4. MOCKUP P3 V2 / SCORE

Le mockup V1 était visuellement fort mais réinventait des éléments P2 L0. Il n’est donc pas une cible littérale.

Le **P3 V2 exécutable** correspond au concept du mockup V2 avec corrections obligatoires :

- header P2 L0 conservé exactement ;
- bottom-nav P2 L0 conservée exactement ;
- pas de grand hero photo sur `/search` ;
- résultats + carte deviennent la priorité ;
- mobile : `Liste / Carte` ;
- tablette/desktop : `Liste / Mixte / Carte` ;
- intelligence quartier/marché après la surface de résultats ;
- filtres actifs compréhensibles et persistants ;
- continuité Search ↔ Map préservée.

**Score cible exécutable : 9,6 / 10.**

L’autorisation propriétaire était conditionnelle : `si ça dépasse 9.5 commence le code`. Le seuil est dépassé, donc **l’implémentation est autorisée**. Cette autorisation ne vaut pas encore certification visuelle finale : le freeze L0 P3 reste conditionné à l’AFTER et à la validation du périmètre exact.

---

## 5. IMPLEMENTATION EN COURS

### Fait

- `SearchViewSwitcher.tsx`
  - mobile `Liste / Carte` réellement visible ;
  - mobile normalise `split` vers `list` ;
  - tablette/desktop conservent les trois modes ;
  - cibles tactiles mobile `h-12`.
- `QuickFilters.tsx`
  - compteur actif couvre transaction, ville, quartier, budget min/max, surface et type.
- `SearchPriceExplorerDock.tsx`
  - les panneaux d’intelligence restent secondaires ;
  - ils ne remplacent plus un état sans cartes visibles par plusieurs écrans de contenu annexe.
- contrat P3 : `scripts/scrapers/__tests__/p3-search-standard-v1.test.ts`.
- workflow : `.github/workflows/p3-search-standard-v1.yml`.

### Preuves CI déjà obtenues

Sur le HEAD précédent `26dbac261d04cef3eb76d8a2a34eb657b478f3ab` :

- `P3 Search Standard V1` run `34787376848` — **SUCCESS** ;
- un ancien gate mobile a détecté l’absence de classe `h-12` ; correction appliquée au HEAD suivant.

Sur le HEAD `697429cc8ead979fead22ede992a77afad38b7f8` :

- `P3 Search Standard V1` run `34787502406` — **SUCCESS** ;
- `UX P1 Mobile Decision Ergonomics` run `34787502437` — **SUCCESS** ;
- `Product Constitution Self Check` run `34787502384` — **SUCCESS** ;
- `UX Gate 0 Contracts` run `34787502392` — **SUCCESS** ;
- `Phase 1 P1 Final Sweep Gate` run `34787502427` — **SUCCESS** ;
- `Phase 1 P1 Search Truth Gate` run `34787502415` — **SUCCESS** ;
- `CI Workflow Efficiency Policy` run `34787502394` — **SUCCESS**.

D’autres workflows sont encore en cours sur ce HEAD ; ils ne bloquent pas le travail indépendant.

---

## 6. RESTE À PROUVER

1. Capturer AFTER aux mêmes viewports 390 / 768 / 1280.
2. Montrer les captures au propriétaire.
3. Comparer BEFORE / AFTER et scorer le résultat observé, pas le mockup.
4. Vérifier que le budget minimum actif possède un feedback visuel cohérent dans l’état final.
5. Auditer read-only la sémantique `total / overlap` entre lane interne et gateway sans écriture DB.
6. Ne toucher au contrat 404 du canary géo qu’après preuve qu’il s’agit d’un défaut utilisateur réel et non du comportement attendu du feature gate.
7. Après preuve AFTER + validation propriétaire : promouvoir le périmètre exact P3 en L0/manifeste puis passer le Product Constitution Gate sur le HEAD exact.

## Deployment / DB

- Vercel : **0 action** ;
- DB : **0 write**.
