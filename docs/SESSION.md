# AkarFinder — Session courante

**Mise à jour : 2026-08-08**  
**Lane DATA : décision persistante préexistante conservée ; commit parallèle DATA-4.3H.1 `e0d4720` préservé pendant le merge UX**  
**Lot UX acquis : P1B.1 — AkarFinder Map Visual Layer ✅ PR #371 — 9,1/10**  
**Prochain UX : P1B.2 — Couches d’intelligence territoriale sourcées**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Acquis récents :

- DATA-4.3G ✅ PR #362, merge `0286178` ;
- DATA-4.3H ✅ PR #364, merge `88a3592` ;
- DATA-4.3I ✅ PR #367, merge `ad4875e` ;
- DATA-4.3J ✅ PR #368, merge `bb3a5db` ;
- P1A.5 ✅ PR #365, merge `c489f000`, **9,3/10** ;
- P1A.6 ✅ PR #369, merge `dc75016d`, **9,2/10**, audit natif final **12 captures / 0 finding** ;
- DATA-4.3H.1 commit parallèle `e0d4720` — scope du start count certifié par provenance ;
- P1B.1 ✅ PR #371, merge **`c5e0373b`**, **9,1/10**, audit final intégré **3 captures / 0 finding**.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search canonique, Map complément spatial, Geo Registry unique source de vérité.

# UX — P1B.1 AkarFinder Map Visual Layer ✅

Objectif acquis : la carte ne repose plus visuellement sur une basemap générique comme élément dominant lorsque la couche Casablanca canary est disponible.

Acquis :

- basemap OpenFreeMap/CARTO conservée comme infrastructure mais fortement atténuée ;
- namespace cartographique propriétaire : `akarfinder-neighborhood-geometry`, `akarfinder-neighborhood-fill`, `akarfinder-neighborhood-outline`, `akarfinder-neighborhood-label` ;
- **16 arrondissements Casablanca** issus uniquement du dataset OSM shadow existant ;
- aucune géométrie inventée et aucune promotion automatique shadow → production ;
- activation via `/api/geo/casablanca-arrondissements` et le canary preview existant ;
- production reste bloquée par le contrat géométrique existant ;
- palette territoriale pastel différenciée ;
- couleurs explicitement **non sémantiques** : elles distinguent les territoires et ne représentent ni prix, ni qualité, ni demande, ni confiance ;
- contours AkarFinder et labels territoriaux renforcés ;
- attribution OSM maintenue ;
- cycle `style.load` MapLibre durci : le montage de la couche ne dépend plus à tort du chargement complet des tuiles via `map.isStyleLoaded()` ;
- audit navigateur vérifie la requête composant vers l’API canary, l’activation réelle de la layer, le canvas et l’absence d’overflow horizontal ;
- viewports certifiés **430×932 / 768×1024 / 1280×900** ;
- **21/21 tests P1A.5/P1A.6/P1B.1 verts** ;
- TypeScript et production build verts ;
- tous les gates du head intégré verts, dont Geo Productization, Geometry Canary, Responsive, Final Design/A11y, Canonical Baseline et DATA P0 ;
- head final intégré : `1261db92e8a9996cdbf90c5847dd4c7ff09a7e45` ;
- run final P1B.1 : `31233550860` ; job `93041885845` ;
- artefact final : `9014665869` ; digest `sha256:6f187087190d8c0cb4d8497ee2a9b458b520888c7149de6ed90832f95a3daf0b` ;
- **3 captures / 0 finding** ;
- contrôle humain final : **9,1/10** ;
- merge code : `c5e0373b6a20161264ba3e1c995fa863eaacabb8`.

# Prochain UX — P1B.2 Couches d’intelligence territoriale sourcées

Ajouter une première couche décisionnelle réellement calculée depuis des données certifiées.

Contraintes :

- aucune géométrie/proximité/POI inventée ;
- aucune couleur de P1B.1 réinterprétée comme un score ;
- métrique choisie seulement si sa provenance, son calcul, sa fraîcheur et ses limites sont explicables ;
- Geo Registry reste source de vérité ;
- Search reste canonique ;
- Map ne devient jamais une couche décorative trompeuse ;
- géométries shadow restent shadow tant qu’elles ne sont pas certifiées pour publication ;
- **430×932 obligatoire** dans la certification visuelle ;
- score ≥9/10 avant merge.

# DATA — état conservé

## DATA-4.3H ✅ PR #364

Contrat d’expansion contrôlée : batch max **100/run**, cap 500 avant re-certification, TTL **14 jours**, drift cap **1 %**, Registry+sitemap revalidés avant chaque run, rollback obligatoire.

## DATA-4.3I ✅ PR #367

Protection de l’ownership fraîcheur multi-canal : OpenSERP/Yandex ne peut plus dégrader/supprimer une preuve tierce comme `public_sitemap_presence` ; merge additif des preuves fraîches ; pas de DB write ou policy change en CI.

## DATA-4.3J ✅ PR #368

Correction de l’ordre du trigger display : `zzz_thin_index_display_policy_write` s’exécute après quality/purity afin que l’éligibilité soit calculée depuis le tier final. Migration-only, aucune policy-function mutation ni backfill dans la PR.

## Commit parallèle DATA-4.3H.1 `e0d4720`

Le commit arrivé sur `main` pendant P1B.1 borne le comptage de départ certifié par provenance (`data-4-3g-daragadir-v1`). Il a été explicitement préservé dans le head final P1B.1 et tous les gates d’intégration ont été rejoués après synchronisation.

# Prochaine action DATA

Conserver la décision DATA courante portée par la roadmap : certification production requise avant toute nouvelle mutation persistante qui en dépend, puis exécution uniquement sous le contrat borné 4.3H avec Registry+sitemap, mesures Search/display et rollback.

Ne pas inventer un numéro de lot suivant avant définition explicite dans `docs/ROADMAP.md`.

# Business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.