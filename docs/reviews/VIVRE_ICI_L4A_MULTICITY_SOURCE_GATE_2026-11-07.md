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


## Closeout vérité source 07/11/2026 — pas de green artificiel

**Code exact testé :** [`a16f058b`](https://github.com/hraaaaf/Akarfinder/commit/a16f058b087343242b6c6acd0cb2a1c438d049b7). [N2 #42385007912](https://github.com/hraaaaf/Akarfinder/actions/runs/42385007912) **FAIL intentionnel et légitime**, artefact **#13579257349**, `report.json: ok=false`, `failure.unavailableCities=["mohammedia"]`. Les 12 captures Casablanca (390/430/768/1280 × état ville, Maârif, postal sans centre) sont bien produites.

| Ville | Quartiers catalogue | Centres renseignés | Sans centre | Contours publiés |
| --- | ---: | ---: | ---: | ---: |
| Casablanca | 1 617 | 134 | 1 483 | 0 |
| Rabat | 318 | 27 | 291 | 0 |
| Marrakech | 1 193 | 44 | 1 149 | 0 |
| Tanger | 322 | 22 | 300 | 0 |
| Agadir | 254 | 35 | 219 | 0 |
| Fès | 791 | 42 | 749 | 0 |
| Kénitra | 205 | 38 | 167 | 0 |
| Mohammedia | **HTTP 404** | Non disponible | Non disponible | Non vérifiable |

**Total des 7 villes reconnues** : 4 700 quartiers catalogués, 342 centres géographiques renseignés et 4 358 entrées sans centre. **Toutes les coordonnées renseignées passent le contrôle de latitude/longitude et de provenance déclarée**, ce qui n'est pas une revue géographique externe de chaque point. Les quatre scénarios UI Casablanca montrent `overflow=0`, `fakeFill=false`, `mappedSelection=maplibre`, `noCenterFallback=true` et `searchHandoff=true`.

**Statut de L4-A** : test/observabilité réussis, **couverture 8/8 NON ATTEINTE** ; CI N2 ROUGE par choix de vérité. Ne pas le renommer green ni inventer un 8e centre. Les [Required #42385007958](https://github.com/hraaaaf/Akarfinder/actions/runs/42385007958), [TypeScript #42385007914](https://github.com/hraaaaf/Akarfinder/actions/runs/42385007914), [P1A.6 #42385007890](https://github.com/hraaaaf/Akarfinder/actions/runs/42385007890), [N3 #42385008004](https://github.com/hraaaaf/Akarfinder/actions/runs/42385008004) et [Zillow #42385008002](https://github.com/hraaaaf/Akarfinder/actions/runs/42385008002) sont SUCCESS.

**Next exact** : source de catalogue Mohammedia à qualifier, conserver l'API 404 sinon ; poursuivre L4-B UI 8 villes/17 quartiers seulement si les sources le permettent. L5-A peut continuer indépendamment. Aucune fusion, DB ou Vercel.


## Reprise source externe après L5-B — 07/11/2026 (recherche, NON validation)

La [Direction régionale HCP Casablanca-Settat — RGPH 2024](https://www.hcp.ma/reg-casablanca/RGPH-2024_r14.html) publie des statistiques et une entrée dédiée à la préfecture de **Mohammedia** ; le [portail national HCP RGPH 2024](https://www.hcp.ma/downloads/RGPH-2024_t22752.html) propose des tableaux territoriaux au niveau préfecture/commune. **Cela confirme qu'une source statistique institutionnelle pertinente existe, mais ne prouve pas la disponibilité de quartiers géoréférencés ni de contours de quartiers.** Les documents statistiques ne sont pas promus en source de géométrie.

Le code de `app/api/geo/national-territories/route.ts` interroge `getNationalTerritoryPlace(city)` et renvoie intentionnellement `404 not_found` lorsque le `slug` n'est pas dans les `places` décodées de l'artefact national V5 (`lib/map/national-territory-runtime.server.ts`). **Hypothèse à tester** : absence/variante de slug dans le registre V5 ; elle ne justifie aucune création d'entrée manuelle ni un fallback vers un centre arbitraire.

**Next exact :** vérifier la ligne/identifiant Mohammedia dans l'artefact V5 *décompressé et auditable* ; rattacher la commune HCP et sa clé source si les données le permettent ; chercher des libellés de quartiers Mohammedia avec provenance, puis tester alias, inventaire et absence de faux contour. Sans ligne source valide, maintenir 404 et N2 rouge. Ne pas modifier le code géographique sur la seule base d'un titre de fiche communale.
