# AKARFINDER — ONBOARDING SEARCH / OPTION A — 2026-10-30

## Décision produit

**Utilisateur : « Okay Option A ».** Composer une seule version depuis `main`, sans fusionner les PR historiques #1035 (P3 Search) et #1102 (Search Target type visuals) en bloc.

### Goal

Une Search cohérente aux 390/430/768/1280 : filtres rapides accessibles au toucher, vues Liste/Carte sur mobile et Liste/Mixte/Carte ailleurs, indicateur exact des filtres actifs, suppression facile du budget minimum, visuels TARGET pour les types de biens indexés **sans modifier** le rendu Option A du parcours vendeur.

### Implémentation

- Portage **ciblé depuis #1035** : `QuickFilters`, `SearchViewSwitcher`, CSS du switcher, `SearchPriceExplorerDock`, ajustement exact 42 → 44 px sur deux règles CSS existantes. Les états invisibles/vides ne doivent pas promouvoir de l'intelligence quartier dépourvue de résultats.
- Portage **ciblé depuis #1102** : `PropertyTypeVisualSelector` avec `visualVariant` et `lib/ux/indexed-property-type-visual.ts`, cibles graphiques **préexistantes dans main** sous `public/visuals/property-types/target/`; variant `search-target` seulement dans `QuickFilters`, vendeur en `option-a`.
- Le conflit de `components/search/QuickFilters.tsx` est **résolu par composition** : P3 + variant graphique, et non choix d'une branche qui écraserait l'autre.
- **Aucun** changement DB, API, classement, droits Source Policy, photographies annonces ou réutilisation d'annonces tierces. #622 et #936 restent des dépendances de sûreté non fermées.
- Reprises de tests ciblés P3 et famille visuelle + contrat nouveau `search-onboarding-option-a.test.mjs`. Nouveau workflow **léger PR** sans secrets, sans Chromium ni build ; audits lourds existants du repo restent indépendants.
- Nouveau script `search-onboarding-option-a-visual.mjs` : audit Playwright **4 viewports** sur `/search` filtres ouverts, exige `[role="group"][aria-label="Type de bien"]:visible`, six visuels TARGET, drawer mobile, boutons, non-overflow, screenshots. Corrige le défaut du scénario historique #1102 qui sélectionnait l'élément **caché** `.last()` sans preuve de visibilité.

### Succès + preuves à recueillir avant intégration

1. `node --test scripts/scrapers/__tests__/search-onboarding-option-a.test.mjs`.
2. `npx tsx --test scripts/scrapers/__tests__/p3-search-standard-v1.test.ts scripts/scrapers/__tests__/property-type-visual-option-a.test.ts`.
3. `npx tsc --noEmit`, build `npm run build`, vérifications Search API/source trust existantes ; CI **exact HEAD** réussie.
4. **BEFORE** réel depuis la version `main`, puis **AFTER** avec la branche, mêmes 390×844, 430×932, 768×900 et 1280×900 ; ouverture du drawer, états Liste/Carte, preuve d'absence d'overflow, screenshots montrés à l'utilisateur. Les anciens assets de septembre ne sont pas une certification d'AFTER actuel.
5. Score UX sur captures + revue indépendante + décision produit finale. **Pas de certification avant preuves.**

### Gates humains et liquidation PR

Ce choix autorise la **préparation en DRAFT**, **PAS** le merge ni un déploiement Vercel. Après validation technique et visuelle, demander accord explicite avant merge sur `main`; alors et seulement alors fermer #1035/#1102 comme `SUPERSEDED` avec commentaire comparant les apports et les tests. Garder les deux PR ouvertes tant que la composition n'est pas réellement intégrée ou que leurs apports ne sont pas prouvés redondants. Le chantier global vise **0 PR ouvertes**, pas une fermeture administrative prématurée.

**NEXT EXACT :** ouvrir la PR DRAFT de composition, vérifier les CI dès disponibilité, capturer/montrer réellement BEFORE/AFTER, corriger jusqu'à atteindre les critères, puis gate humain de merge.
