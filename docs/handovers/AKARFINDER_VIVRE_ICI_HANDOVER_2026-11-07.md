# AkarFinder — Vivre Ici — HANDOVER 07/11/2026
**État vérifié avant ce commit :** produit V1 NON certifié ; PR #1174 documentaire READY et #1175 corrective DRAFT, **non fusionnées** ; aucune modification de production ni déploiement Vercel. Ce fichier est une photographie : **revérifier HEAD/CI à la reprise**.

## 1. GOAL / SUCCESS / PROOF
**Goal** : Maroc exploratoire → ville → quartier → **carte dominante + fiche intelligente** quotidienne → biens sur Search, pour **acheteurs/locataires** ; Maârif premier pilote riche. L'onboarding 6/6 est validé : mission A+B+C avec B choisir où habiter au centre ; informations **quotidien > cadre de vie > immobilier** ; UX carte + rail desktop/sheet mobile ; national exploratoire, pilotes approfondis ; refonte **sélective** (ne pas repartir de zéro).

**Success V1** : 0 prix/repères fictifs présentés comme certifiés ; sources/droits/POI frais ; trois modes Maârif **quartier 2D / limites de l'arrondissement sourcées et revues / zoom rue** ; sheet mobile rétractable, CTA Search et retour, 4 viewports 390×844 / 430×932 / 768×900 / 1280×900, test clavier/touch, BEFORE/AFTER, CI required `gate` PASS et revue visuelle cible ≥9,5/10 **non atteinte**.

**Proof actuelle** : [BEFORE main run #42320980541](https://github.com/hraaaaf/Akarfinder/actions/runs/42320980541) `workflow_dispatch`, `main@c0f172b`, **12 PNG**, 8 scénarios HTTP200, zéro overflow horizontal/erreur JS dans report. [AFTER candidate PR #1175 run #42358643944](https://github.com/hraaaaf/Akarfinder/actions/runs/42358643944) artifact **#13568826936** téléchargé : **20 PNG** exact HEAD `291d395`, 4 routes × 4 viewports + 4 sélections nationales Casablanca→Maârif ; `report.json`: `findings:[]`. Ce dernier est un **test responsive de la correction L1**, PAS une certification UX complète, et le BEFORE du drilldown national n'avait pas été capturé sur main initial.

## 2. ÉTAT GIT / VERCEL (tous les SHAs doivent être revérifiés avant action)
- Repo : `hraaaaf/Akarfinder`, `main=c0f172bc6755d769a3103051d90c2953f3215de2` lors du dernier contrôle (compare `identical`).
- [PR #1174](https://github.com/hraaaaf/Akarfinder/pull/1174), branche `audit/vivre-ici-current-main-20261106`, HEAD préalable `ee4dd2db58ad0eb2dd75d13f40e9c658343fcf98` ; OPEN, READY, NOT MERGED. Contient la roadmap canonique `docs/handovers/AKARFINDER_VIVRE_ICI_ROADMAP_ONBOARDING_2026-11-07.md`, audits L0, et **`docs/reviews/VIVRE_ICI_L2_UX_TARGET_2026-11-07.md`**, wireframe fonctionnel. Gate #42359540692 SUCCESS à ce HEAD préalable ; nouveau gate à vérifier après cette création.
- [PR #1175](https://github.com/hraaaaf/Akarfinder/pull/1175), branche `fix/vivre-ici-l1-fail-closed-20261107`, HEAD observé `291d3952e4213019622efa62702c62dea4be12a6` ; OPEN, DRAFT, NOT MERGED. Code P0 + tests+CSS+Playwright, required [gate #42358643896 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42358643896), P1A.6 #42358643944 SUCCESS ; deux CI FAILURE ci-dessous.
- [PR #1108](https://github.com/hraaaaf/Akarfinder/pull/1108) DRAFT ancienne contient un candidat trois vues Maârif ; réutiliser **sélectivement**, la frontière arrondissement `shadow/reviewed:false` n'est PAS publiable sans validation SIG. [PR #1090](https://github.com/hraaaaf/Akarfinder/pull/1090) ancienne volumineuse : aucune fusion brute.
- Production Vercel dernier contrôle : `dpl_DfKCASA5VYcbKErJNfsJDNJxxo2w` READY sur ancien SHA `32a0a076b0b48fa123ec0636bde427905589782c`. `vercel.mjs` : `git.deploymentEnabled:false`. **AUCUN déploiement Vercel sans accord explicite distinct**, même si merge autorisé. Pas de DB prod.

## 3. L0 — CONSTAT DES PREUVES
- National `/map` est un **moteur PremiumInteractiveMap SVG/TopoJSON**, différent de MapLibre sur ville/quartier. La carte nationale initiale fonctionne ; cadrage, hauteur hors champ et petits libellés à corriger. N3 Maroc→Casablanca→Maârif→Search 390/1280 déjà PASS.
- Seed de repères `lib/neighborhood-context/certified-seed.ts` observée **2026-08-16**, TTL **30j** dans `poi-registry.ts`, `read-model.ts` filtre strictement `fresh` : `anchorCount=0` sur 4 Maârif expliqué par l'expiration ; **ne pas relever le TTL** pour inventer des POI. Recollecter légalement et sourcer.
- Ancien national : `useMapData()` avait **45 statistiques mock**, Maârif 17 600 DH/m² et « 15 repères vérifiés ». `neighborhoodPolygon(index)` dessine des formes **fictives**, jamais des frontières. Les badges 2D/3D du MapLibre sont décoratifs, le CSS cache certains zooms, handle de fiche mobile sans vraie interaction ; attribution de tuiles `attributionControl:false` à examiner.
- L0 inventaire/captures acquis, mais tests complets du clavier/touch/modes Maârif/source/licence **non clôturés**.

## 4. L1 — CORRECTION ACTUELLE ET PREUVES
PR #1175 retire les **45 stats mock** et leurs rendus prix/repères inventés, met des messages « informations locales indisponibles », conserve CTA, affiche un état sans POI Maârif récents, garde le TTL. Une première phrase de fallback était cachée par `app/map/ux-convergence-l9.css`; la candidate l'a corrigée avec `.p4-premium-empty-evidence` visible. Le test source `scripts/audits/vivre-ici-l1-truth-contract.mjs` est importé par le réel `scripts/ci/required-pr-gate.test.mjs` (3 assertions négatives PASS en logs). Suite P1A.6 a corrigé d'anciens sélecteurs nationaux MapLibre obsolètes **sans supprimer les assertions métier** ; nouveau run #42358643944 SUCCESS : 20 PNG, `findings=[]`. **Ni la PR ni la V1 ne sont fusionnées ou certifiées**, polygones inventés encore présents (mais étiquetés « schéma »).

**CI actuelle PR #1175 :** success gate #42358643896, P1A.6 #42358643944, N3 #42358643929, P1B1 #42358644015, C7 #42358643910, tests de compile / UX et autres run success. **Deux échecs actifs à traiter** :
1. [P1B.2 Territorial Intelligence #42358643942](https://github.com/hraaaaf/Akarfinder/actions/runs/42358643942) **FAILURE** : job Native price intelligence, logs `getaddrinfo ENOTFOUND` DNS Supabase, API marché HTTP **503** et console errors. Panne/dépendance externe observée, ne pas attribuer à la suppression des mock sans preuve ; diagnostiquer la gestion d'erreur/fallback et la stratégie test.
2. [Carte National Zillow UI Certification #42358644034](https://github.com/hraaaaf/Akarfinder/actions/runs/42358644034) **FAILURE** : `Four viewport national city interaction certification` **`locator.waitFor: Timeout 30000ms exceeded`** ; inspecter sélecteur attendu et état exact, ne pas présumer faux rouge avant preuve. Aucune CI globale verte annoncée.

## 5. ROADMAP PRIORISÉE
- **L0** baseline visuelle et source acquise, contrôles interactifs/clavier/attribution restants.
- **L1** truth/fail closed : candidat testé et AFTER 20 images, CI rouge P1B2/Zillow et revue visuelle métier à finir ; PR #1175 DRAFT non fusionnée.
- **L2 cible seulement** dans `docs/reviews/VIVRE_ICI_L2_UX_TARGET_2026-11-07.md` (#1174) : **A** retirer schémas faux au profit liste quartier + point réellement sourcé, **B** fiche quotidienne/cadre/sources/biens, **C** vraie bottom sheet mobile repliable, **D** commandes, légende/crédits. Pas d'implémentation L2 certifiée.
- **L3** trois vues Maârif sourcées sans publier le périmètre `shadow` ; **L4** diffusion progressive nationale, **L5** Search, **L6** validation 4 viewports BEFORE/AFTER, clavier, cartes, sources, CI et note visuelle si démontrée.

## 6. NEXT EXACT + SÉQUENCE RESTANTE
1. À la reprise, **re-lire CE HANDOVER puis rafraîchir main/PR #1174/#1175, HEAD/CI/Vercel** (les deux branches ont bougé pendant la séance ; ne pas réutiliser un HEAD périmé).
2. Diagnostiquer Zillow #42358644034 : identifier **le sélecteur précis** à l'origine du timeout par revue script/screenshots ; corriger un contrat obsolète uniquement s'il est prouvé, sans affaiblir la couverture. Diagnostiquer Supabase P1B.2 #42358643942 : origine DNS/503, mode dégradé fail-closed, éviter manipulations de secrets et déploiement.
3. Exploiter les **20 images AFTER** du run #42358643944 et les **12 BEFORE** du run #98, relever clipping/lisibilité/touch/focus, ne pas attribuer ≥9,5/10 sans validation. Vérifier L1 et corriger si besoin sur la PR avec SHA courant.
4. Puis exécuter L2-A (faux polygones), L2-B fiche, L2-C sheet, L2-D modes/crédits, chaque fois BEFORE→GOAL→mockup→implémentation→AFTER mêmes formats→tests; puis L3→L6 ; documents canoniques/Notion à jour ; merge seulement après autorisation spécifique et Vercel seulement sur autorisation séparée.
5. Éviter tout nouveau run lourd avant inventaire des CI déjà actives/terminées. Ne pas fusionner les PR historiques, ne pas inventer de source, ne pas changer `git.deploymentEnabled:false`.

## 7. DOCUMENTS / LIENS
- Vision/roadmap : `docs/handovers/AKARFINDER_VIVRE_ICI_ROADMAP_ONBOARDING_2026-11-07.md` (#1174).
- Audits : `docs/reviews/VIVRE_ICI_L0_BASELINE_2026-11-07.md` ; `docs/reviews/VIVRE_ICI_L1_FAIL_CLOSED_2026-11-07.md` (#1175) ; `docs/reviews/VIVRE_ICI_L2_UX_TARGET_2026-11-07.md` (#1174).
- BEFORE : https://github.com/hraaaaf/Akarfinder/actions/runs/42320980541 (artifact #13553704238).
- AFTER : https://github.com/hraaaaf/Akarfinder/actions/runs/42358643944 (artifact #13568826936).
- Notion : https://app.notion.com/p/40977c66336281d5b3d5ca5ec7ed432d

**Prompt de reprise :** « Reprends Vivre Ici depuis `docs/handovers/AKARFINDER_VIVRE_ICI_HANDOVER_2026-11-07.md`. Vérifie main/PR/HEAD/CI/Vercel, résous les rouges P1B.2 et Zillow sur #1175, exploite les 20 captures AFTER, clôture L1 seulement avec preuves, puis L2-A et suite. Ne me redemande pas l'onboarding ; actualise Notion après exécution. Ni fusion ni Vercel sans accord explicite. »

📍 Jalons : 🟢 Onboarding → 🟢 Roadmap → 🟢 L0 BEFORE → 🟢 L1 candidate + AFTER → 🟠 CI/UX à certifier → ⚪ L2–L6 → ⚪ Release autorisée.

## 8. ADDENDUM DE REPRISE — vérifications du 07/11/2026

**PR et CI HEAD revérifiés** : [PR #1174](https://github.com/hraaaaf/Akarfinder/pull/1174) OPEN / READY / NOT MERGED, HEAD `45b56f0dbe7d13ae7a49a2f8ab93775b5c7a3cd6` **avant le présent ajout**. Required [gate #42361536370](https://github.com/hraaaaf/Akarfinder/actions/runs/42361536370) **SUCCESS** sur cet ancien HEAD ; toute CI d'un nouveau commit doit être jugée séparément. [PR #1175](https://github.com/hraaaaf/Akarfinder/pull/1175) OPEN / DRAFT / NOT MERGED, HEAD `291d3952e4213019622efa62702c62dea4be12a6`, required gate #42358643896 **SUCCESS**, P1A.6 #42358643944 **SUCCESS**. L0 12 captures BEFORE, L1 20 AFTER et `findings:[]` établis dans le journal précédent : validation ciblée L1, **pas** certification V1.

**Diagnostic prouvé de Zillow #42358644034** : logs du job `certify-national-zillow-map` : `locator.waitFor: Timeout 30000ms exceeded`, attente `[data-akarfinder-national-map]` visible. Code exact `scripts/audits/carte-national-zillow-certification.mjs` sur #1175, lignes 65–75, demande cet ancien attribut, `.maplibregl-canvas` et `window.__AKARFINDER_NATIONAL_MAP__` dès `/map?layer=explore` ; le moteur national courant de cette page est Premium SVG/TopoJSON, distinct du MapLibre local. **Contrat de test d'entrée obsolète démontré** ; adapter le test aux vrais marqueurs, préserver les assertions de sélection, touch/pointer et 4 viewports, puis obtenir CI + captures. Ne pas déclarer tout le parcours certifié sur la base du seul premier sélecteur en échec.

**Diagnostic prouvé P1B.2 #42358643942** : logs `territorial-intelligence` montrent `getaddrinfo ENOTFOUND` sur l'hôte Supabase configuré ; smoke `scripts/audits/p1b2-territorial-intelligence-smoke.ts` relève HTTP **503** pour `/map?city=Casablanca&layer=price`, erreurs console et absence de prix disponibles. **La cause du défaut DNS n'est pas attribuée avec certitude** (configuration/endpoint/service externe) ; préserver fail-closed, investiguer sans exposer de secret ni écrire sur la base de production. Ne pas convertir le test en PASS fictif.

**Next exact actualisé** : réparer d'abord le contrat du harness Zillow sur branche isolée ou PR #1175 en gardant le métier intact ; établir un test approprié du mode dégradé prix et diagnostiquer l'endpoint Supabase sans activer DB prod ; inspecter preuves UX/clavier/touch et terminer closeout L1 seulement après preuves ; L2-A → L2-B → L2-C → L2-D, puis L3–L6. Garder les deux PR NON FUSIONNÉES et **aucun déploiement Vercel sans autorisation explicite**.
