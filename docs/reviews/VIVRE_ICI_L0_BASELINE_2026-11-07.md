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

## 07/11/2026 — AFTER CERTIFICATION #98 : LE WORKFLOW MANUEL CORRECT A RÉUSSI — L0 CAPTURES BEFORE DISPONIBLES

**Rectification indispensable** : la capture initiale de l'utilisateur affichait la chaîne `on:pull_request`, mais la donnée d'exécution GitHub pour le run exact [#42320980541](https://github.com/hraaaaf/Akarfinder/actions/runs/42320980541) **prouve `event:"workflow_dispatch"`**, `head_branch:"main"`, `head_sha:"c0f172bc6755d769a3103051d90c2953f3215de2"`, `status:"completed"`, `conclusion:"success"`, `run_number:98`, créé le `2026-11-07T00:53:49Z` et terminé avant `2026-11-07T01:17:41Z`. **L'utilisateur avait bien déclenché le bon run** ; l'ancien blocage « lancer manuellement le workflow » est **levé**.

- **Artefact GitHub exact** : `vivre-ici-after` **ID #13553704238**, taille **4 383 698 octets**, `expired:false`. ZIP **téléchargé, ouvert et inspecté**, contenant **12 PNG** (4 `premium-national`, 4 `premium-national-zoomed`, 4 `n3-casablanca-maarif`) et `summary.json`.
- **Résumé daté** `generatedAt:"2026-11-07T01:17:36.956Z"`, `mode:"branch-local-after-v2"`; ce nom est celui du harness historique, **les PNG sont ici la baseline BEFORE de `main`**, sans aucun changement produit entre capture et base Git.
- **8 résultats scénario × viewport** : tous **HTTP 200**, `horizontalOverflow:0`, `pageErrors:[]`, `supabaseRequestCount:0`; quatre `premium-national` avec `topologyState:"ready"`, **12 régions listées**, **6 villes initiales** et **8 après zoom**, `zoomedCityLabelOverlapCount:0`; quatre `n3` avec `maplibreReady:"true"`, `sourceState:"available"`, rail de décision visible et CTA `/search?city=Casablanca&district=Ma%C3%A2rif` ; bâtiments visibles 52/55/71/77 (390/430/768/1280), mais **`anchorCount:0` pour les quatre viewports**.
- **Qualité des preuves** : captures réelles Playwright sur `main` (pas des maquettes, pas des images de production Vercel). **12/12 PNG effectivement présents** ; 8 originaux national+Maârif et 4 zoom national ; montages présentés au propriétaire dans la conversation, **non hébergés dans GitHub**. Pas de pseudo-score de style ou de pixel accuracy.

### Lecture visuelle de l'artefact — ce que l'on peut réellement voir

**Carte nationale (4 viewports + 4 zoom)** : le moteur rend une vraie représentation de régions et villes. La carte occupe peu de surface utile relative à l'espace blanc selon les formats et sa **partie méridionale est hors de l'image initiale sur les formats observés** ; une capacité de défilement/zoom ne prouve pas, à elle seule, le cadrage initial satisfaisant. Les labels de localité et les métadonnées sont de petite taille sur smartphone. La page affiche un bandeau d'explication **« données mock isolées »** ; il faut le remplacer par une présentation métier honnête sans republier les valeurs mock. Aucun débordement horizontal selon report, mais **ce test ne mesure pas les éléments hors champ verticalement**.

**Maârif (4 viewports)** : raster satellite 3D et halo/pin central visibles, panneau desktop et fiche mobile compacte avec **CTA « Voir les biens disponibles à Maârif »**. Mais la fiche mobile ne renseigne pas vraiment sur transports, écoles, commerces, santé, parcs : **la promesse de l'onboarding (vivre au quotidien) n'est pas encore satisfaite**. **Zéro ancre POI visible dans le read-model des quatre runs (`anchorCount:0`)** ; cela atteste une absence de données dans la réponse testée, **sans en identifier la cause**. Les contrôles Maârif 2D/limites administratives/zoom rue ne sont **pas certifiés** par ces captures; la branche candidate [#1108](https://github.com/hraaaaf/Akarfinder/pull/1108) demeure un réservoir de réemploi, pas une preuve du `main`.

**Données** : `dbMode:"mock-only"` sur national, `useMapData()` toujours présente ; prix et compteurs de repères démonstratifs **ne sont pas des données métier certifiées**, même quand une section affiche « repère vérifié ». **L1/P0 fiabilité reste prioritaire**.

### Verdict L0

**Acquis — preuves réelles :** 12 captures BEFORE sur les quatre viewports, rapport JSON, 8 HTTP 200, zéro overflow horizontal et zéro exception navigateur dans les scénarios testés, affichage national et Maârif, lien Search correct, analyse visuelle des screenshots effectuée.

**À terminer avant L0 complet :** tests interactifs directs national→région→ville→quartier avec clavier/tactile, ouverture/fermeture de fiche mobile, état des modes Maârif (dont leur **absence** sur `main`), attribution visible/licences des tuiles, vérification des chiffres fictifs rendus après sélection d'un quartier, et comparaison de la cible 3 écrans aux images fournies; aucun score visuel ≥9,5/10 revendiqué. Les screenshots AFTER ne seront produits **qu'après une implémentation dans une PR distincte**, mêmes fixtures et viewports.

**Next exact mis à jour :** terminer l'inventaire interactif/source de L0 (les captures ne bloquent plus), puis commencer **L1 suppression à l'affichage des valeurs mock** et états de couverture fiables ; conserver `vercel.mjs` et le strict gate de fusion. Aucune fusion ni déploiement Vercel par cette mise à jour.
