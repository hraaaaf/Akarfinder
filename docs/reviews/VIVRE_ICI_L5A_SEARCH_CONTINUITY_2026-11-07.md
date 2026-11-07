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
