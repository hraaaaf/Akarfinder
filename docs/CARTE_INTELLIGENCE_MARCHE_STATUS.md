# Carte intelligence marché — statut canonique

Date : 2026-08-15

Référentiel cible : `docs/CARTE_INTELLIGENCE_MARCHE_TARGET.md`.

## Progression stricte

Lots CLOSED / 8 : **1 / 8 = 12,5 %**.

- C0 — Référentiel + audit de récupération : ✅ CLOSED
- C1 — Géométrie quartier certifiée : 🟠 CURRENT / HUMAN GATE SOURCE
- C2 — Dataset métriques quartier v2 : 🟡 PREPARED / NOT CLOSED
- C3 — API publique fail-closed + échelles : ⏭️
- C4 — Heat map interactive conforme au mockup : ⏭️
- C5 — Fiche quartier riche : ⏭️
- C6 — Fondation « nos annonces » : ⏭️
- C7 — Certification 10/10 + closeout : ⏭️

## C0 — preuve de clôture

- mockup source validé : 1448×1086 ; SHA-256 `4b6912480c5ce7dce6b04c5d0f8848b0be319955d220db84d8365a76ca66eac7` ;
- aperçu repo vérifié par gate dédié ;
- PR #673 mergée ; merge SHA `cdd2385a6df9ab0cf44904315ac07985112d3515` ;
- Carte Intelligence Marché Target Gate run `31903971043` : SUCCESS ;
- anciennes fondations #371, #376, #382/#381, #462, #463, #464/#465, #466+ récupérées et documentées ;
- contrat final : 10 critères prouvés requis pour 10/10.

## C1 — état vérifié

Baseline :

- 0 binding historique de polygone quartier certifié ;
- les 16 polygones Casablanca historiques sont des arrondissements OSM `admin_level=10`, pas des quartiers ;
- Rabat est aujourd’hui représenté côté Carte par des points/repères pour Agdal, Hay Riad, Hassan ;
- Registry : Agdal/Hay Riad/Hassan `map_eligible=true`, Souissi `map_eligible=false` ;
- aucune valeur `map_eligible` ne vaut preuve de polygone.

### Acquisition source tentée

1. **AURS ArcGIS** — PR #676, run `31904378237` : portail ArcGIS injoignable depuis le runner avant réponse HTTP ; 0 service découvert. Artefact `9251937525`, digest `sha256:66cf50b60f01dc4bd99ccc9277a3c62de920d1ee460ac91323f3cf51f4b5d56b`.
2. **ANCFCC/DGI Atlas de zoning** — PR #677, run `31905696888` : page institutionnelle accessible et Atlas confirmé, mais aucune géométrie chargée sur la page d’introduction. Artefact `9252272375`, digest `sha256:05db2dcf8dd77ca5ac9ded2bf26fb707444f039fa0e251dc4bb55335cb348c09`.
3. **ANCFCC service courant** — PR #678, run `31905968674` : portail en maintenance, HTTP 403 ; aucune route de consultation exploitable. Artefact `9252349427`, digest `sha256:9ac33c7e4065d91d07506532b322ac520409fcc292cab0b92d42620f313b7757`.
4. **OSM Overpass** — PR #679, run `31907730479` : endpoints 406/429, donc aucune conclusion data ; voie abandonnée.
5. **OSM snapshot Geofabrik hors ligne** — PR #680, run final `31908196937` : téléchargement PBF réussi, SHA source `de22655a20fede718edaf5d5180eeca3db0c3e44ef66ceddb6b0d11cb35c5167`; 3 540 zones nommées exportées, dont 1 653 Polygon/MultiPolygon ; **0 polygone cible** pour Agdal, Hay Riad/Ryad/Riyad, Souissi ou Rabat Centre. Artefact `9252933851`, digest `sha256:803ddf712b28ecdf88939576660472e767d60fa71029694fb051345643265234`.

Conclusion : aucune source automatiquement exploitable ne fournit aujourd’hui les quatre polygones neighborhood-grade nécessaires. Aucun polygone n’a été inventé.

### Brique C1 indépendante déjà livrée

- PR #682 mergée ; merge SHA `9983c367dd40ebeb40048b2cf8f1a5fc872d72fc` ;
- calcul source-agnostic Polygon/MultiPolygon → m²/km² ;
- trous soustraits, MultiPolygon additionné ;
- test analytique sphérique + TypeScript ;
- Carte C1 Geometry Area Gate run `31908337417` : SUCCESS.

## C2 — préparation acquise, sans clôture

- PR #681 mergée ; merge SHA `378397567ae946536b87f40a8f080b2281cf17b9` ;
- Carte C2 Metrics Contract Gate run `31908144637` : SUCCESS ;
- Prix = médiane DH/m² observée ;
- Annonces = volume observé ;
- Densité = volume observé / `area_km2` certifiée ;
- fiabilité statistique séparée de la représentativité marché ;
- C2 reste **NOT CLOSED** tant que C1 ne fournit pas les géométries et surfaces certifiées.

## Human gate C1 — sémantique de la zone

Aucune option ne doit être appliquée sans décision produit :

- **A — attendre/acquérir une source officielle de quartier** : meilleure autorité territoriale, mais délai externe non maîtrisé tant qu’AURS/ANCFCC ne livrent pas un export exploitable.
- **B — créer des `AkarFinder market zones` curatées** : limites stables définies et revues par AkarFinder à partir de repères/voiries documentés, explicitement typées `market_zone` et jamais présentées comme limites administratives officielles.
- **C — acquérir/licencier un dataset SIG professionnel** : autorité à qualifier contractuellement, coût/délai supplémentaires.

**Recommandation actuelle : B**, car le produit cible est une carte d’intelligence immobilière et les futures annonces propres ont besoin de zones analytiques stables. Cette option ne peut cependant être activée qu’après accord produit explicite sur la sémantique `market_zone`.

Gate C1 inchangé après décision : provenance → type territorial explicite → binding canonique → topologie → aire km² → GeoJSON fail-closed. Aucun polygone inventé ni arrondissement renommé en quartier.
