# Carte intelligence marché — statut canonique

Date : 2026-08-15

Référentiel cible : `docs/CARTE_INTELLIGENCE_MARCHE_TARGET.md`.

## Progression stricte

Lots CLOSED / 8 : **1 / 8 = 12,5 %**.

- C0 — Référentiel + audit de récupération : ✅ CLOSED
- C1 — Géométrie quartier certifiée : 🟠 CURRENT
- C2 — Dataset métriques quartier v2 : ⏭️ NEXT
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
- branche finale : 1 commit au-dessus du main précédent, 4 fichiers intentionnels ;
- anciennes fondations #371, #376, #382/#381, #462, #463, #464/#465, #466+ récupérées et documentées ;
- contrat final : 10 critères prouvés requis pour 10/10.

## C1 — chemin critique

Baseline vérifiée :

- 0 binding historique de polygone quartier certifié ;
- les 16 polygones Casablanca historiques sont des arrondissements OSM `admin_level=10`, pas des quartiers ;
- Rabat est aujourd’hui représenté côté Carte par des points/repères pour Agdal, Hay Riad, Hassan ;
- Registry : Agdal/Hay Riad/Hassan `map_eligible=true`, Souissi `map_eligible=false` ;
- aucune valeur `map_eligible` ne vaut preuve de polygone.

Source prioritaire à qualifier : zoning immobilier officiel ANCFCC/DGI, qui définit des territoires géographiques délimités et publie un atlas de zoning. OSM reste utile pour les limites administratives, mais Agdal-Ryad ne doit pas être transformé artificiellement en polygones Agdal/Hay Riad.

Gate C1 : provenance → type territorial → binding canonique → topologie → aire km² → GeoJSON fail-closed. Aucun polygone inventé.
