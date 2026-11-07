# Vivre Ici — L5-B : vérité du filtre géographique et état vide

**07/11/2026 — CANDIDAT.** Ce document décrit des tests à certifier sur le HEAD exact de la PR Draft ; aucune annonce ni donnée DB n'est créée.

## Goal / Success / Proof

- **Goal :** empêcher le glissement silencieux d'une recherche Maârif vers l'ensemble de Casablanca et rendre le zéro-résultat honnête et réversible.
- **Success :** la route Search conserve `city=Casablanca` et `district=Maârif` dans la requête DB ; les clés de cache sont différentes pour Maârif, Anfa et Casablanca seule. Le vrai endpoint `/api/search/gateway` ne remplace jamais un district par des résultats web à l'échelle ville : `reason=district_requires_structured_search`, `total_count=0`, `results=[]`, `sources_queried=[]`.
- **Preuve E2E :** `scripts/audits/vivre-ici-l5b-search-empty-state.mjs` avec 4 viewports 390/430/768/1280 et réponses **uniquement côté navigateur** simulées `listings=[]`, `results=[]`. Les filtres Casablanca et Maârif restent visibles, l'état « Aucun résultat pour ces critères » et `0 résultat` s'affichent, zéro carte de bien fictive. Clic réel « Élargir la recherche » : les paramètres ville/quartier et chips sont supprimés. 8 PNG et `report.json`.
- **Preuve CI** : workflow N3 exécute les tests de `search-page-query.test.ts`, puis l'audit Playwright L5-B après le scénario L5-A, téléverse un artefact séparé. Lire exactement `report.ok`, les captures et les logs avant de déclarer le sous-lot GREEN.

## Sécurité et périmètre

- Les mock API sont interceptés dans **un contexte Playwright local** ; ils ne sont pas des annonces réelles, ne modifient aucune DB/cloud, ne changent aucun contenu produit. Ils prouvent la gestion de l'état vide, pas le bon filtrage SQL d'annonces en production.
- `/api/search/gateway` possède un verrou explicite : comme le provider ne sait pas classer ses résultats de façon fiable par district, le Search structuré doit l'emporter sur l'élargissement incontrôlé.
- Le projet legacy Supabase est désactivé. Le test réel des résultats immobiliers, des données de localisation, de la fraîcheur et des prix demeure **NON CERTIFIÉ**.
- Dépendance L5-A PR #1184, L4 7/8, L6 licences fournisseur cartographique Esri/attribution OSM. Aucune fusion, activation DB ou Vercel.

## Next exact

Exécuter une seule CI complète N3 sur la branche L5-B en PR Draft ; vérifier unités + gateway live locale + 4 viewports, inspecter les huit images. Si rouge : corriger et retester. Si vert : closeout .md, PR base vers L5-A, Notion. Restent L4 source Mohammedia, L6 licences, test DB réel lorsque l'environnement est légitimement disponible.
