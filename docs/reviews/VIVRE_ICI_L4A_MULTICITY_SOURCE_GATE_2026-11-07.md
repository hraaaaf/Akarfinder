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


## L4-A gap découvert par la première CI (source réelle)

Sur [Carte N2 run #42384591804](https://github.com/hraaaaf/Akarfinder/actions/runs/42384591804) du HEAD `4bd8e446`, l'API nationale a répondu **HTTP 404 pour `mohammedia`** après l'interrogation des sept autres villes. Les tests Required, TypeScript, P1A.6, N3, Zillow étaient verts : le défaut est un trou de catalogue territorial, pas un bug MapLibre Maârif.

**Décision stricte :** ne pas créer de point/contour Mohammedia en recopiant une coordonnée non sourcée ; ne pas transformer silencieusement un 404 en PASS. Le script de certification est désormais instrumenté pour enregistrer `multicityApi` avec `status:"unavailable", httpStatus:404`, poursuivre les 4 captures Casablanca et produire `report.json` même si le gate L4 global reste **FAIL** tant que Mohammedia n'est pas couverte. Un nouveau run doit démontrer les sept inventaires et le gap exact, et fournir les images.

**Gate humain/source :** un futur lot de couverture Mohammedia doit justifier le centre par source externe vérifiable ou afficher explicitement l'indisponibilité ; l'exigence initiale 8 villes n'est pas déclarée atteinte. La réussite d'un test de non-falsification peut coexister avec un statut couverture L4 incomplet. Aucun Vercel/DB/merge.
