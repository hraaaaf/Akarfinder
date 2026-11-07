# Vivre Ici — L5-A Search : localisation conservée et retour réel

**07/11/2026 — DRAFT.** Parent L3-A, tests candidats non encore certifiés.

## GOAL / SUCCESS / PROOF
- **Goal :** rendre le passage Maârif → `/search` utile et réversible sur mobile/tablette/desktop.
- **Success :** Maroc → Casablanca → Maârif → `/search?city=Casablanca&district=Ma%C3%A2rif`, deux filtres actifs visibles `Casablanca` et `Maârif`, puis navigateur Back vers `/map?city=casablanca&district=maarif` avec carte chargée. Aucun overflow ni page error à 390×844, 430×932, 768×900, 1280×900.
- **Proof :** `scripts/audits/carte-national-journey-n3.mjs` étendu aux 4 viewports, screenshots `search-maarif-<vp>-after.png` et `return-map-maarif-<vp>-after.png` ; marqueur DOM `data-search-active-filter` pour lire les filtres effectivement actifs sans modifier visuellement la Search UI. CI N3/Required/TS sur SHA exact et revue des images.

## LIMITES / GATES
- Les filtres visibles et l'URL ne prouvent pas, seuls, que les résultats immobiliers sont géographiquement filtrés en base. L5-B devra couvrir les annonces sur fixtures synthétiques, l'état « aucun résultat » et la non-invention de positions exactes.
- Le prix réel, les POI, les contours administratifs et les licences fournisseurs restent hors champ / non certifiés. Aucun merge, DB ni Vercel.

**NEXT exact :** une CI N3 complète et comparaison des huit captures AFTER sur les quatre viewports ; corriger si échec, puis empiler la PR sur L3-A. Ensuite L5-B / L6.


## Closeout exact HEAD — 07/11/2026

**Code testé :** [`8a71b4b7ee6ce106cde2ec2d545dd1edb140a54f`](https://github.com/hraaaaf/Akarfinder/commit/8a71b4b7ee6ce106cde2ec2d545dd1edb140a54f) (branche PR #1184 non mergée, sans déploiement).

**SUCCESS / preuves certifiées à ce périmètre :**
- [N3 #42389185818](https://github.com/hraaaaf/Akarfinder/actions/runs/42389185818) **SUCCESS**, artefact #13580434829 : `report.json ok=true`, `failure=null`, 390/430/768/1280, `searchLocationChips=["Casablanca","Maârif"]`, `browserBackToMap=true`, `overflow=0` sur les 4.
- [P1A.6 #42389185785](https://github.com/hraaaaf/Akarfinder/actions/runs/42389185785), [Required #42389185850](https://github.com/hraaaaf/Akarfinder/actions/runs/42389185850), [Canonical baseline #42389186003](https://github.com/hraaaaf/Akarfinder/actions/runs/42389186003), [CI Efficiency #42389185847](https://github.com/hraaaaf/Akarfinder/actions/runs/42389185847) : **SUCCESS**.
- Ensemble des 32 workflows sur le HEAD : **31 SUCCESS, 1 SKIPPED, aucun FAILURE**.
- Revue manuelle des **8 images réelles** de l'artefact. BEFORE `f30948c8` contenait Search en cours de chargement (384 résultats SSR transitoires, skeletons) et carte retour non chargée sur 390/1280 ; AFTER `8a71b4b7` montre les **quatre fonds réels complets**, le repère Maârif et l'attribution affichés ; Search stabilisé sur **0 résultat** dans ce banc de test (état vide visible, deux filtres actifs, CTA « Élargir la recherche »). Aucun débordement visible.
- Le navigateur attend une source vectorielle `available` avec au moins un bâtiment rendu avant capture retour et la fin des états de chargement Search avant capture Search. La preuve ne dépend pas d'un screenshot pendant l'animation.

**Limitations :** 0 résultat est une observation d'environnement CI, **pas la preuve qu'aucune annonce géographiquement correcte n'existe**. L5-B doit éprouver la politique de filtrage et le zéro-result fixture déterministe sans DB live. Licences Esri / attribution OpenMapTiles non qualifiées pour production ; L4 source nationale 7/8 seulement. **L5-A DONE ; L5 complet NON certifié.**

**Next exact :** restauration base Draft PR #1184 sur L3-A, conservation du closeout, puis L5-B tests fixture et L6 audits, sans merge/DB/Vercel.
