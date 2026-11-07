# Vivre Ici — L0 : baseline partielle sur le code exact du main
**Date : 07/11/2026 · Etat : EN COURS / preuves fonctionnelles héritées valides par identité de blobs / aucune capture BEFORE courante.**

## Goal
Auditer avant modification du code produit l'expérience `/map` sur le HEAD `main@c0f172bc6755d769a3103051d90c2953f3215de2`, sur `390×844 / 430×932 / 768×900 / 1280×900`, de la navigation Maroc → région → ville → Maârif → Search, ainsi que les modes Maârif ciblés et l'accessibilité.

## Méthode et preuve exacte

1. **Head réel :** GitHub `compare_commits(c0f172bc6755d769a3103051d90c2953f3215de2,main) = identical, ahead 0, behind 0`, constat le 07/11/2026.
2. **Comparaison blob par blob** de `main@c0f172bc6755d769a3103051d90c2953f3215de2` et du candidat PR #1147 `9e1bb3906cc4b60c4c67c6a42ad6256776fe8402` :
   
   | Fichier vérifié | Blob SHA identique |
   | --- | --- |
   | `app/map/page.tsx` | `123965b7bd8482a38cad698c6b63e4c63b88e748` |
   | `components/map/PremiumInteractiveMap.tsx` | `b04aaa4b766f9d6fabafcaee4cb44c1b5eea59d6` |
   | `components/map/NationalMapRouter.tsx` | `1a33eceaceffefe09babe7e8123f7360802e54c4` |
   | `components/map/MapLibreNeighborhood3D.tsx` | `98e6f75e87f911c36bb6d66550e948ff10487b2e` |
   | `components/map/PremiumInteractiveMapBridge.tsx` | `ccfbe4fa469dc521c909df2da9b9297a48bfd20f` |
   | `components/map/P4MapDecisionRail.tsx` | `52a45eb9cc5ead3f745d51d237302c2fb5bcb8b8` |
   | `scripts/audits/carte-national-journey-n3.mjs` | `b31156e954a878f5b1e1f2c8cbbf008cc220722f` |
   | `scripts/vivre-ici-after-capture.mjs` | `4e70e8bcc756b4e44f34017e0ba7d459381dd8be` |

   **Conclusion limitée :** les **8 fichiers visés** sont identiques. Cela suffit à transférer la pertinence du test de parcours sur ces composants, **pas** à garantir que toutes les dépendances, les ressources externes ou les environnements sont identiques.
3. **CI browser N3 sur le candidat** : [Carte National Journey N3 #42305126064](https://github.com/hraaaaf/Akarfinder/actions/runs/42305126064) **SUCCESS**, artefact `carte-national-journey-n3-42305126064` **#13546331975** téléchargé et extrait. `report.json` effectivement inspecté : `ok:true`, `failure:null`, deux entrées :
   - `viewport:"390"`, `entryMode:"premium"`, `citySelection:"casablanca"`, `districtSelection:"maarif"`, `maplibreReady:true`, `searchHandoff:"/search?city=Casablanca&district=Ma%C3%A2rif"`, `searchRendered:true`, `overflow:0`.
   - `viewport:"1280"` : **les mêmes valeurs fonctionnelles**, `overflow:0`.
4. **Artefact N3 limité à UN SEUL `report.json`**, **aucune image PNG/JPEG**. Ne pas présenter `SUCCESS` ou les historiques #1108 comme un audit visuel du `main` actuel.

## Matrice d'audit L0 — preuves / manques

| Zone / scénario | État actuellement démontré | Next proof |
| --- | --- | --- |
| Route `/map`, entrée navigation « Vivre ici » | **Code vérifié** ; lien `/map` dans navigation | Screen national 4 viewports et menu mobile |
| Maroc → Casablanca → Maârif | **CI N3 browser succès** 390/1280, identité source 8 fichiers | Images/états région + ville + sélection, **430/768 manquants** |
| Maârif MapLibre | **CI N3 `maplibreReady:true`** 390/1280 | Inspecter réel du rendu, CTA, POI et bottom sheet |
| Maârif → Search | **CI N3 URL + résultats affichés** 390/1280 | Captures, retour, aucune fausse position exacte |
| Maârif : quartier 2D / limites administratives / rue | **Non implémenté entièrement dans main**, ancienne #1108 candidate uniquement | BEFORE interactif et comparatif au canonique Notion |
| Informations chiffrées / provenance | **P0 identifié** : `useMapData` MOCK avec `priceRepere`, `landmarksVerified` affichés dans UI | Captures actuelles puis L1 fail-closed |
| 390/430/768/1280 + clavier/touch/contrastes | **Non certifié visuellement** | Screens AFTER sur exact HEAD, tests visuels et accessibilité |
| Source et licence imagerie administrative | **Shadow non publié** dans #1108 ; validation source requise | Revue géométrie + attribution explicite |

## Chemin court vers les captures BEFORE du HEAD courant

**Workflow déjà existant sur `main` :** [Vivre Ici AFTER Certification](https://github.com/hraaaaf/Akarfinder/actions/workflows/vivre-ici-after.yml), fichier `.github/workflows/vivre-ici-after.yml`, `workflow_dispatch` disponible. Bien que son nom dise AFTER, son script existant `scripts/vivre-ici-after-capture.mjs` crée en réalité sur la référence exécutée les **8 captures de baseline** : 4 national `/map` et 4 N3 `/map?city=casablanca&district=maarif&layer=explore` à `390/430/768/1280`. Produit rapport et PNG dans l'artefact `vivre-ici-after` ; serveur de build local en GitHub Actions, **sans déploiement Vercel**. Le harness ancien peut échouer sur des assertions visuelles devenues obsolètes ; inspecter rapport/PNG indépendamment du verdict.

**Blocage d'exécution réel :** l'API de l'app GitHub disponible en session ne fournit **pas l'action `workflow_dispatch`**. L'accès navigateur Opera a aussi retourné `UNAVAILABLE` en 30 sec, et `git ls-remote` direct en container a échoué sur résolution DNS. Les règles `scripts/ci/validate-workflow-efficiency.mjs` proscrivent aussi une solution de contournement à base de workflow lourd sur branche `push` hors `main`, ou de test lourd sur PR. **Ne pas contourner la gouvernance CI par un nouveau workflow permissif**, ni modifier le produit ou déployer Vercel pour obtenir une image.

**Human gate minimal :** dans Actions → Vivre Ici AFTER Certification → Run workflow → **Branch: main** → Run workflow ; transmettre l'URL du run. Après résultat : récupérer artefact `vivre-ici-after`, **afficher les captures au propriétaire**, établir la carte des problèmes par viewport et joindre la comparaison à la [cible Maârif 3 vues](https://app.notion.com/p/3f577c66336281d79f5dc46467df5f65). Si échec du workflow, analyser les images et logs plutôt que généraliser l'échec produit.

## Success / preuve

**Succès partiel vérifié :** identité des 8 blobs avec candidature CI ; parcours N3 complet à 390/1280 avec `report.ok=true` et `overflow=0`. **NON certifié :** screenshots, 430/768, rendu 3 vues, score UX, données et sources, accessibilité. Ce lot **reste ouvert**.

**Next exact :** obtenir le run `workflow_dispatch` manuel sur `main`, inspecter/afficher le paquet de captures 4 formats ; rédiger verdicts avant corrections L1. Aucune autorisation de merge/deploy inférée.