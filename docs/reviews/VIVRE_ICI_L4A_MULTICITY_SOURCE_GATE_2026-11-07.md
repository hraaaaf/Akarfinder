# Vivre Ici — L4-A : catalogue source national sur 8 villes

**07/11/2026 — candidat de validation API en lecture seule ; L4 complet NON certifié.**

## Goal / Success / Proof
- Goal : vérifier que l'extension nationale réutilise le moteur géographique sans inventer de coordonnées ni frontières.
- Success : API `/api/geo/national-territories?city=...` disponible pour **Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès, Kénitra, Mohammedia** ; inventaires cohérents, identifiants uniques, provenance explicite, centres uniquement valides ou `null`, aucune limite de quartier non publiée.
- Proof : le script existant `scripts/audits/carte-national-neighborhoods-n2.mjs` conserve son scénario Playwright Casablanca × 4 viewports (points sourcés, retour Maârif et absence de centre postal) et ajoute un audit API des 8 villes. Résultat `multicityApi` dans `report.json` avec nombre réel de centres, de quartiers sans coordonnées, de limites publiées.

## Limites / indépendance des statuts
- Une ville avec zéro repère sourcé reste honnêtement à zéro ; ne pas synthétiser de coordonnées pour « réussir ».
- Les centres enregistrés ne sont pas automatiquement des **positions certifiées de propriété** ; aucune annonce exacte inventée.
- Ce lot **ne certifie pas** 4 viewports × 8 villes × 17 quartiers. Il démontre l'intégrité source du registre et maintient l'E2E visuel Casablanca. Les autres parcours, titres/fallbacks, clavier et navigation restent L4-B.
- Les POI récents, prix réels et contour administratif Maârif demeurent indisponibles sans leurs preuves séparées.

## Next exact
Sur le HEAD exact candidat : N2/Required/TypeScript/CI, lire `report.json` et les captures (391/430/768/1280 dans le script), corriger tout échec. Ensuite L4-B : interactions ville/quartier multiville avec captures ; L5 : Search filtré/état vide/retour ; L6 release. No merge, DB, Vercel.
