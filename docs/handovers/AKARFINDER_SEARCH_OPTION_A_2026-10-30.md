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


---

## Actualisation vérifiée — 2026-11-05 — Réconciliation des six visuels Search

- **PR de composition :** #1147, `feat/search-onboarding-option-a-compose-20261030`, **DRAFT, non fusionnée**.
- **HEAD de code certifié :** `8a989d97b57005303bacf18184769fc0953b4d95`. **36/36 workflows GitHub SUCCESS**, aucun échec, aucun pending sur ce SHA (consultation du 2026-11-05).
- **Illustrations TARGET localement présentes et effectivement chargées en navigateur** : `apartment.svg`, `villa.svg`, `land.svg`, `office.svg`, `commercial.svg`, `riad.png`, sous `public/visuals/property-types/target/`. Sélecteur Property Type, illustration indexée et fallback typé utilisent la famille `getIndexedPropertyTypeVisual`. Les six anciens fichiers `public/images/property-types-premium/*` ont été supprimés.
- **Priorité visuelle respectée :** images d'annonces autorisées préservées ; visuels contextuels certifiés des villes/quartiers et fallback neutre restaurés, après régression causée par la première simplification de `ContextualListingArtwork`. Les biens de type inconnu ne sont plus représentés comme des appartements.
- **Carte indexée :** badges, accent couleur par famille et styles de prix/cartes restaurés. L'illustration est un `<img>` local à `src={visual.targetAsset}` ; les doublons `background-image` CSS ont été éliminés.
- **Preuve visuelle AFTER** : workflow `SEARCH-PROPERTY-TYPE-VISUALS-1 Gate` run **#42017164681 — SUCCESS**, artefact `search-property-type-visuals-1-proof` ID **13409643001**. Captures `mobile-390x844.png`, `mobile-430x932.png`, `tablet-768x900.png`, `desktop-1280x900.png`. **Six annonces fixtures déterministes** par viewport ; les six sources d'illustrations exactes chargées ; **zéro débordement horizontal** ; couleurs, géométrie, hiérarchie et source vérifiées. `metrics.json` : **10/10 score contractuel machine**, zéro failure. Ce score n'est pas une évaluation esthétique, ni une preuve de production.
- **Revue visuelle critique :** certaines typographies et titres sont encore trop petits ou tronqués sur mobile ; la navigation flottante peut recouvrir une partie des cartes dans la capture full-page. La comparaison BEFORE main / AFTER mêmes viewports et l'approbation visuelle humaine ne sont **pas encore démontrées**.
- **Gates restants :** comparer les captures avec une baseline `main` réelle aux mêmes dimensions, traiter si requis la lisibilité mobile, obtenir la validation visuelle produit, puis demander **autorisation explicite de merge**. Ne pas fermer #1035/#1102 avant vérification de leurs apports remplacés. **Aucun déploiement Vercel autorisé ou effectué.**

Cette actualisation documentaire ne constitue pas elle-même une nouvelle certification du commit de documentation : le HEAD de code certifié reste `8a989d97b57005303bacf18184769fc0953b4d95`.


---

## Closeout technique — 2026-11-05 — Lisibilité mobile et preuve actualisée

**Résultat observé (HEAD de code `0cc3a617e60aea49a7b39787d4c5fc19b8b0ebf3`)**
- Le correctif mobile conserve **deux colonnes** à 390/430 px et la famille unique des **six assets TARGET**. Les titres indexés ont une police calculée de **13 px**, les caractéristiques de **10,5 px** et les mentions de provenance de **10 px**. La source ne subit plus de troncature par ellipsis dans les six fixtures du test.
- Le test Playwright `scripts/audits/search-property-type-visuals-1.mjs` contrôle désormais explicitement la lisibilité et les liens sources (sixième axe), sans diminuer les exigences d'origine, de géométrie ni de couleur.
- **Run `SEARCH-PROPERTY-TYPE-VISUALS-1 Gate` #42022136776 = SUCCESS**, artefact `search-property-type-visuals-1-proof` **#13412920670**. Captures AFTER réelles dans l'artefact aux dimensions **390×844, 430×932, 768×900, 1280×900**. `metrics.json` : 6/6 axes, zéro failure, zéro overflow, six cartes par viewport, deux colonnes mobile et quatre desktop, six sources locales chargées. **10/10 = score de contrat machine seulement**, aucune certification esthétique ou production par ce nombre.
- **36/36 workflows GitHub SUCCESS sur le HEAD de code** après relances ciblées, sans échec ni job actif au dernier contrôle. Les échecs transitoires précédents provenaient du **loader `next/font/google` pendant `npm run build`**, `TypeError: Cannot read properties of null (reading '1')` dans `app/layout.tsx`. Rejouer les seuls jobs échoués a réussi ; cette réussite ne supprime **pas** le risque d'instabilité CI dû au téléchargement Google Fonts. Une mitigation ciblée du fetch font / self-hosting constitue un **lot CI distinct**, à vérifier avant adoption.
- Une **comparaison visuelle historique** a été produite entre une capture de la PR du 31 octobre et l'AFTER du 5 novembre, à **390 et 1280 px**. Les données d'annonces diffèrent, et le snapshot historique n'est **pas un BEFORE certifié de `main`**. Ne pas s'en servir pour déclarer une convergence visuelle exacte.
- **Réserve UX** : les cartes restent denses en affichage mobile deux colonnes ; l'audit de lisibilité prouve seulement les seuils définis, pas une note esthétique maximale ni les scénarios réels en production.
- **Gates restants** : (1) baseline `main` à fixtures et viewports identiques si disponible sans déploiement ; (2) revue UX finale de la Search et autorisation explicite de **merge** de #1147 ; (3) une fois fusion autorisée, vérifier les apports de #1035 et #1102 avant de les liquider, puis tester le HEAD `main` et actualiser le closeout post-merge. **Pas de déploiement Vercel sans autorisation explicite**.

**Limite documentaire** : la publication de cette section crée un nouveau commit, distinct du HEAD de code `0cc3a617e60aea49a7b39787d4c5fc19b8b0ebf3` sur lequel les 36 workflows ont effectivement conclu ; la CI du commit documentaire doit être contrôlée séparément.


---

## 5 novembre 2026 — CI : 50/52, mitigation Commons (en cours, non certifiée)

**HEAD de référence avant mitigation :** `971781cdbee29d24657d63aefbcf87e9fb0385bb` ; PR #1147 DRAFT, non fusionnée, 47 ahead/0 behind. Sur 52 workflows exact-head : **50 SUCCESS, 1 SKIPPED, 1 FAILURE**. ANN-L11 run 42046843768, Option A Contract run 42046843143, UX-CARDS run 42046843644, SEARCH-PROPERTY-TYPE-VISUALS run 42046843638 : **SUCCESS**. Ce dernier produit 12 captures réelles Home/Search/Vendre 390/430/768/1280 (artifact 13425297255), score machine 10/10, zéro overflow ; réserve visuelle : navigation flottante/Akar Sense peuvent recouvrir des cartes dans la capture mobile full-page. Absence de baseline `main` identique ; pas de score UX esthétique certifié.

Le seul workflow en échec est [RABAT-REAL-PHOTO-LIBRARY-1 run 42046843329](https://github.com/hraaaaf/Akarfinder/actions/runs/42046843329) : job visuel échoue au build intermittent `next/font/google` `Plus_Jakarta_Sans` (suivi dans [issue #1160](https://github.com/hraaaaf/Akarfinder/issues/1160)), job source Commons a **7/40 preuves complètes** et 33 images dont l'API n'a pas rendu une URL canonique (artifact 13425568201). Ce n'est pas la preuve de 33 licences invalides : `File:Rabat Agdal.jpg` existe en CC BY-SA 4.0 sur Commons. Fichier source, bibliothèque de photos, workflow photo et layout sont **strictement identiques sur main et la PR** (SHA de blob vérifiés).

**Mitigation apportée dans le présent commit :** `scripts/audits/rabat-real-photo-library-1-sources.ts` découpe les 40 demandes de métadonnées Commons en **lots de 5**, avec seulement les champs LicenseShortName, LicenseUrl, Artist et Credit (documentation MediaWiki recommande peu de résultats pour `extmetadata`). Les contrôles de sûreté demeurent **stricts et identiques** : 40/40 requis, licence CC BY/CC BY-SA/CC0 compatible, URL canonique sous `upload.wikimedia.org`, MIME image, échec sur réponse API incomplète. Aucune photo n'est promue automatiquement. **Hypothèse de résolution non prouvée jusqu'à nouvelle CI exacte**.

**#1035 et #1102** : apports vérifiés par 11 contrôles ciblés ; PR historiques toujours ouvertes jusqu'au merge expressément autorisé de #1147 et à preuve de portage complet. Studio reste illustré Appartement, et non Commercial. Aucune DB, source permissions, médias tiers, ni Vercel changés.

**Séquence restante** : vérifier la nouvelle CI ; si Commons reste rouge, diagnostiquer les réponses API sans neutraliser les garde-fous ; capture BEFORE `main`/AFTER sur mêmes fixtures et viewports ; revue UX et autorisation explicite de merge ; uniquement alors merge, tests `main`, closeout, commentaire et fermeture des PR historiques après preuve.
