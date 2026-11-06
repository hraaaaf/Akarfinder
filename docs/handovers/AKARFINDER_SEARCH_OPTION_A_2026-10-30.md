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


---

## 5 novembre 2026 — Diagnostic corrigé après CI rouge sur `984939a`

**Preuve de CI du HEAD précédent `984939a092fac22c36b388247201256eb2141bcf`:** 52 workflows conclus, **50 SUCCESS / 1 SKIPPED / 1 FAILURE**. Seul run en échec : [RABAT-REAL-PHOTO-LIBRARY-1 #42051710907](https://github.com/hraaaaf/Akarfinder/actions/runs/42051710907). Son job source valide seulement **7/40** fichiers Commons (artifact `13427916568`), même après découpage en 5. La raison précise est désormais vérifiée sur **plusieurs réponses MediaWiki API réelles** : `thumburl` des images redimensionnées pointe vers `thumb.wikimedia.org`, tandis que `url` originale pointe vers `upload.wikimedia.org`. L'ancien validateur utilisait `thumburl ?? url` tout en exigeant `upload.wikimedia.org` : faux rejet de 33 miniatures par confusion thumbnail/original. La nouvelle correction choisit **uniquement `imageInfo.url`**, garde la validation stricte domaine original + MIME + licence CC BY/SA/CC0 + présence 40/40, sans publier les images.

Le job visuel de ce même workflow a réussi `npm run build` cette fois, puis échoué sur `mobile-360x800: ... 2 columns, got 1`. **Cause vérifiée dans le script** : la mesure `cards[0]?.parentElement` pointait sur le wrapper `className="contents"` au lieu du parent grid réel `[data-search-continuous-flow] > div.grid`. Changement uniquement dans l'**audit** : mesurer les colonnes sur la véritable grille et exiger que toutes les dix cartes fixtures lui appartiennent. Les seuils **2 colonnes à 360/390**, zéro overflow, 10 illustrations, absence de photos non autorisées, persistance au rechargement **restent stricts**.

Deux corrections de scripts, une suite de tests de non-régression et ce handover sont dans le présent commit. **Nouvelle CI exacte indispensable** avant toute conclusion de vert. Pas de changement de UI/UX, DB, médias de production, Source Policy ou déploiement Vercel. **PR #1147 reste DRAFT et non fusionnée** ; #1035/#1102 restent ouvertes. Une vraie baseline visuelle `main`/AFTER et l'accord de merge explicite restent des gates humains.


---

## 5 novembre 2026 — CI exacte verte et correction collision Akar Sense (non certifiée avant prochain run)

**BEFORE prouvé :** HEAD `6550e405f8850216eec7f09f4c5cdee98d0b7aeb`, PR #1147 DRAFT. GitHub Actions : **53 workflows conclus / 52 SUCCESS / 1 SKIPPED / 0 FAILURE** après relances de deux builds Google Fonts ; [gate photo Rabat #42065739004](https://github.com/hraaaaf/Akarfinder/actions/runs/42065739004) SUCCESS, sources **40/40** et cinq captures. [UX-CARDS #42065738893](https://github.com/hraaaaf/Akarfinder/actions/runs/42065738893) et [Premium Cards #42065739201](https://github.com/hraaaaf/Akarfinder/actions/runs/42065739201) SUCCESS sur l'attempt 2. **Issue #1160 toujours ouverte** : instabilité `next/font/google` non résolue par relance. Capture mobile BEFORE Rabat au viewport **390×844** : le bouton `FinderLauncher` `fixed bottom-[88px] right-4` recouvre une partie des cartes. Score machine 10/10 ne garantit pas la revue visuelle humaine.

**GOAL visuel :** zéro recouvrement des annonces par le bouton Akar Sense, tout en conservant le CTA accessible et le dialogue clavier/focus à 360/390/430/768/1280. **Référence / mockup textuel :** première rangée Search : `[10 résultats]                     [✨ Akar Sense]` ; seconde rangée mobile inchangée `[Liste | Carte]           [Trier]` ; grille cartes sous ces commandes.

**Changement isolé dans le présent commit (AFTER à prouver) :** déplacer `FinderLauncher` de la position fixed en bas-droite dans la ligne de titre du `LightZillowSearchShell` ; supprimer le montage externe dans `app/search/page.tsx`, bouton normal dans le flux (cible tactile ≥44 px), dialogue et Escape inchangés. Audit navigateur `search-property-type-visuals-1.mjs` étendu : position CSS `static`, descendance du toolbar, **aucune collision géométrique avec les cartes**, ouverture modale, focus puis fermeture Escape, sur 390/430/768/1280, sans diminuer les tests existants sur les six illustrations et la grille. Test statique ajouté au contrat Option A.

**Succès vérifiable non encore revendiqué :** nouveau HEAD CI exact GREEN, captures AFTER téléchargées/inspectées aux **mêmes viewports et mêmes fixtures** que BEFORE, pas de troncature du compteur, pas d'overflow, revue esthétique. La baseline `main` strictement identique reste à rechercher ; l'ancienne capture PR n'est pas une preuve `main`. **Sans accord de merge explicite, ne pas fusionner #1147 ni liquider #1035/#1102. Aucun déploiement Vercel.**


### 05/11/2026 — Correctif de densité (suite audit CI en échec)

**Preuve d'échec HEAD `e3fcef4` :** [UX-SEARCH-3 #42088691142](https://github.com/hraaaaf/Akarfinder/actions/runs/42088691142) mesure le haut de première annonce à **331,5 px** contre seuil **310 px** en 360/390 ; [UX-SEARCH-4 #42088691089](https://github.com/hraaaaf/Akarfinder/actions/runs/42088691089) mesure **293 px** contre **270 px** en 360/390. Les deux builds, types et tests élémentaires PASS, mais le bouton 44 px installé sur la première rangée faisait passer sa hauteur de ~22 à 44 px et décalait toute la grille. **Ce sont des régressions réelles : ne pas relever les seuils.**

**Révision dans le présent commit :** bouton compagnon transféré vers la **seconde rangée de commandes**, sans ajouter de rangée : séquence mobile `[Liste | Carte] [Trier] [✨]`. L'icône de **44×44 px** expose `aria-label="Ouvrir Akar Sense"` et `title="Akar Sense"`; texte intégral conservé à **≥1024 px**. Les contrôles existants conservent **156 px switcher** et **124 px tri** ; une règle dédiée met le gap mobile à **2 px**, permettant **156+124+44+4 = 328 px** à 360 px avec marges 16 px. Le compteur revient sur sa ligne initiale, sans dérive attendue de la première carte. Le launcher demeure **non flottant** ; dialogue, focus et Escape inchangés. Contrat statique adapté ; audit Playwright géométrie/non-overlap inchangé.

**AFTER non prouvé avant nouveau run.** Répéter les contrats stricts UX-SEARCH-3/4, Search Option A, Akar Sense P4, Search Property Type et capturer les screenshots. Baseline `main` même fixture toujours absente : aucun run Search visuel `workflow_dispatch` de `main` retrouvé (45 runs dispatch historiques). PR DRAFT / pas de merge / pas de Vercel ; ne pas fermer #1035/#1102.

### 06/11/2026 — Seller mobile CTA vs navigation basse / captures initiales — correctif à prouver

**BEFORE attesté** : screenshot officiel `history-seller-mobile-390x844.png` sur PR #1147 HEAD `9b7e9b7`, run [#42140087056](https://github.com/hraaaaf/Akarfinder/actions/runs/42140087056), artefact #13493366207 : navigation mobile globale fixe superposée au bas du CTA `Continuer` du formulaire `/vendre/dossier`. Screenshots vendeur 390/1280 montrent les dernières catégories, car la capture automatisée a scrollé horizontalement tous les visuels.

**GOAL :** aucun chevauchement du CTA `Continuer` dans le parcours vendeur sur mobile, et capture du carrousel dans son état de départ, tout en préservant les 6 images réellement chargées, le menu supérieur et le menu bas ailleurs. **Mockup/référence :** formulaire mobile clair : `[Type de bien : Appartement | Villa | Terrain ...]` → `[Titre]` → `[Retour] [Continuer]`; aucune barre de navigation superposée au dernier bloc. Desktop inchangé.

**Implémentation du commit courant (EN ATTENTE DE PREUVE CI)** : `MobileBottomNav` ne se monte pas sur `/vendre/dossier` et routes enfants, mais reste visible sur `/vendre` et les autres surfaces. L'audit Playwright existant vérifie sur **390/430/768/1280 px** : `Continuer` dans viewport à 390/430, pas de nav bas sur le vendeur mobile, images locales chargées, carrousel réinitialisé à gauche avant capture, sans supprimer les contrôles P3. Contrat statique UX-BOTTOM-NAV maintenu + exception vendeur. Aucune mutation métier, aucune DB, aucun Vercel.

**Preuve requise avant validation :** nouvelle CI HEAD, JSON sans échec, captures AFTER vendeur 390/430/768/1280 montrées au propriétaire, comparaison avec BEFORE 390/1280, inspection visuelle indépendante et test de tap sur CTA si possible. Ne pas déclarer corrigé ou mergeable visuellement sur la seule base d'un changement source. Pas de fusion ni de Vercel sans accord distinct.


### 06/11/2026 — CI font flakiness #1160: local OFL variable font, evidence pending

**BEFORE proof:** #1147 HEAD `688f89fed2783fed59ac03eff77bb262d42ae3b0` passed Home/Search/Seller gates, but 3 independent PR workflows failed at `next/font/google` / `Plus_Jakarta_Sans` loader, `TypeError: Cannot read properties of null (reading '1')`. Existing issue #1160 documents this recurring failure. Successful targeted rerun does not repair the underlying dependency.

**Goal:** make all CI production builds independent from Google Fonts CSS at build time, without changing the brand typeface, weights, CSS variable, or approved Home composition.

**Change:** replace Google loader with `next/font/local` using original Google Fonts variable upright `PlusJakartaSans-Variable.ttf` (wght 200–800) and include the full OFL 1.1 license. Source binary pinned to Google Fonts blob SHA `0cb13a998ed525ba226d911b10d6c4c4f923a961` (original authors Tokotype); see `app/fonts/README.md`. Same `--font-jakarta` and `display:swap`. Add regression test and path trigger for design system CI. This is not a licence for third-party real estate content.

**Proof still required before claiming done:** exact-head 2 successful full builds, tests Typescript/security, compare actual BEFORE `688f89f` and AFTER images on identical fixtures/viewports 390/430/768/1280 (Home, Search and Seller), inspect layout metrics/overflow and score independently, then human gate for merge. No Vercel deployment authorized; no merge performed.



### 06/11/2026 — Release separation: owner chose option B (Git merge WITHOUT auto Vercel deployment)
**Owner gates received:** visual approval delegated and accepted for Search mobile; explicit merge authorization #1147 YES; **Vercel deployment NOT authorized**, option **B** approved to disable Git automatic deployment before merge.
**Implementation:** root `vercel.json`, `git.deploymentEnabled: false` for ALL branches per [Vercel's documented Git configuration](https://vercel.com/docs/project-configuration/git-configuration#gitdeploymentenabled). Vercel still can be manually deployed later only after explicit owner permission. Production deployment / aliases are not changed by editing this file.
**Enforced test:** `PRODUCTION_DEPLOYMENT_GATE` in the Search Option A node test. It fails if the flag is absent/true, preventing silent re-enablement by normal PR changes.
**Required BEFORE merge:** new exact-HEAD 61 workflows green (except documented skipped), verify config HEAD true false via GitHub, verify no Vercel production deployment created for config commit. No Vercel tool deployment or promote actions.
**Required AFTER merge:** verify main contains `vercel.json` with disabled Git deploys, verify no deployment for merged SHA, compare current production deployment ID/aliases to before baseline, complete main CI/closeout. If Vercel creates a deployment despite flag, stop immediately and do not claim success; do not cancel/rollback without investigation.
