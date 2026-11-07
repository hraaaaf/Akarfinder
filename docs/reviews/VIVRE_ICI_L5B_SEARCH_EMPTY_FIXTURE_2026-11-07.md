# Vivre Ici — L5-B : vérité géographique Search et état vide

**07/11/2026 — CERTIFICATION TECHNIQUE L5-B VERTE, périmètre explicite.**

**Code réellement testé :** `5863999876ca6496a86ea77662181b5e5e79b6bb` (ne pas confondre avec un éventuel HEAD docs-only ultérieur). **CI N3 :** [#42397029558](https://github.com/hraaaaf/Akarfinder/actions/runs/42397029558) **SUCCESS** ; artefact [#13583289063](https://github.com/hraaaaf/Akarfinder/actions/runs/42397029558/artifacts/13583289063). **PR Draft :** [#1185](https://github.com/hraaaaf/Akarfinder/pull/1185), sans merge ni déploiement.

## GOAL / SUCCESS / PROOF

- **Goal :** préserver exactement Casablanca / Maârif de Carte nationale à Search, empêcher tout élargissement implicite au niveau ville, et afficher un état réellement vide, compréhensible et réversible, sans erreur d'hydratation.
- **Success vérifié :** les tests de source `Vivre Ici L5-B` (2/2) gardent `city=Casablanca` + `district=Maârif` dans la query DB et séparent les clés de cache Maârif / Anfa / Casablanca sans district ; l'endpoint réel local `/api/search/gateway` répond `reason=district_requires_structured_search`, `results_count=0`, `total_count=0`, `sources_queried=[]`, `results=[]`. Aucun fournisseur large ville ne remplace une recherche quartier.
- **Preuve E2E N3 :** `report.json` racine **`ok=true`**, 4/4 viewports 390 / 430 / 768 / 1280, `browserBackToMap=true`, `maplibreReady=true`, `overflow=0`. Le rapport `l5b/report.json` est aussi **`ok=true`**, `failure=null`, `scopedRequests=2`, `propertyCards=0`, `emptyState=true`, `resetClearsGeo=true`, `overflow=0` et `knownSourceWarnings=[]` pour chacun des quatre formats. Huit PNG : `l5b/empty-maarif-{390,430,768,1280}.png` et `l5b/reset-maarif-{390,430,768,1280}.png`.
- **Gates du même SHA :** N3, Required PR Gate, CI Workflow Efficiency Policy, Canonical Baseline Compile Validation et P1A.6 Responsive Hardening **SUCCESS**.

## BEFORE → correction → AFTER, visuel

- **BEFORE** : [N3 #42395467166](https://github.com/hraaaaf/Akarfinder/actions/runs/42395467166) **FAIL** avec React hydration **#418** sur Search 390 px ; le formulaire fonctionnait, mais le rendu serveur et le premier rendu navigateur divergeaient.
- **Cause technique identifiée dans le code :** `SearchMapNeighborhoodDock` utilisait `useState(readCanonicalSearch)`. Sur le serveur, `window` absent donnait une recherche vide ; côté client, l'URL `Casablanca/Maârif` activait un sous-arbre géographique avant hydratation. Même anti-pattern dans `SearchPriceExplorerDock`.
- **Correctif :** initialiser `search=""` de manière déterministe côté serveur et lors du premier rendu client, puis synchroniser les paramètres réels via l'`useEffect` existant. L'audit capture les erreurs JS/hydratation, sans laisser passer de régression. Un canary de source géométrique 404 connu est seulement séparé en `knownSourceWarnings`, et n'autorise aucune géométrie inventée.
- **AFTER vérifié :** 8 captures comparées sur les **mêmes viewports**. Les deux chips Casablanca/Maârif et l'état vide restent lisibles ; clic `Élargir la recherche` enlève URL/chips ; zéro annonce simulée affichée ; aucune erreur React ; aucun débordement horizontal. **Score visuel manuel : ~8,5/10** pour cet état précis (fonctionnel et lisible, mais encore loin du seuil global L6 ≥9,5/10 ; en 390px, le ruban de filtres rapides exige un défilement horizontal).

## Limites / non-certifications

- Les réponses API `[]` sont **des fixtures interceptées uniquement dans Chromium**. Elles ne représentent **aucune annonce réelle** et ne prouvent ni la pertinence ni le filtrage SQL des annonces en production.
- Le legacy Supabase est indisponible ; ne pas activer/modifier une DB pour débloquer artificiellement cette preuve.
- Quatre anciens tests de `search-page-query.test.ts`, hors suite `Vivre Ici L5-B`, avaient des assertions obsolètes et échouaient quand tout le fichier était exécuté ; l'audit N3 exécute uniquement les **deux contrats géographiques ajoutés** via `--test-name-pattern`. Cette dette n'est **pas** déclarée corrigée.
- L4 reste **7 villes / 8** (Mohammedia 404), limites de quartier/POI non certifiées ; L6 licences fournisseurs de tuiles (notamment Esri) et qualité visuelle finale sont des gates distinctes.

## Closeout et séquence restante

1. **L5-B code + tests + 8 captures : GREEN vérifié au SHA indiqué.** Maintenir PR #1185 en Draft et la rebaser sur L5-A `test/vivre-ici-l5a-search-continuity-20261107`. Aucun merge / déploiement.
2. Synchroniser roadmap canonique et Notion avec **ce résultat borné**. Ne pas qualifier L5 complet tant que les annonces SQL réelles ne sont pas certifiées.
3. Traiter séparément la dette des anciens tests Search, le trou de source L4 Mohammedia, les licences/attributions cartographiques et l'audit UI L6 ; ne fusionner/déployer que sous autorisation explicite.
