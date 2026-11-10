# Vivre Ici — J11 index national de repères OSM (10/11/2026)

## Goal / Success / Proof
- **Goal** : extraire les POI nommés depuis le PBF Geofabrik Maroc entier dans un index privé, puis interroger uniquement la bbox visible sur la carte.
- **Success** : identité/MD5 source vérifiée ; SHA-256 interne ; nodes et areas ; six catégories ; requête RTree bornée ; mesures Casablanca, Rabat et troisième ville ; zéro contrôle manuel établissement par établissement.
- **Proof préparatoire** : 7/7 tests Python sur PC ; smoke OSM XML (node + way/area) : 3 objets extraits, zéro erreur géométrique, index 32 768 octets, requête ~3 ms sur fixture minuscule. L'essai complet national est séparé.

## Architecture
- Moteur : scripts/neighborhood-context/national-osm-landmark-index.py ; Python pyosmium + Shapely ; SQLite RTree **local de QA**. Aucune connexion PROD DB, aucun Vercel.
- build : exige PBF + MD5 Geofabrik, vérifie avant lecture, calcule SHA-256 local ; crée un nouvel index .part puis renomme atomiquement ; refuse d'écraser un index antérieur.
- query : une bbox [west,south,east,north], cap 1..1000 (180 défaut), round-robin sur 6 catégories ; chaque point garde son identité OSM et la mention « Repères à proximité ».
- Pas d'affirmation de commerce ouvert, de position exacte d'entrée ou d'appartenance certifiée au quartier. Way/relation = point représentatif indicatif.
- Dédoublonnage uniquement par identifiant OSM strict ; des arrêts opposés ayant même nom restent distincts.

## Commandes de contrôle
python scripts/neighborhood-context/national-osm-landmark-index.py build --pbf PBF_MAROC --md5-file CHECKSUM_MAROC --index INDEX_NOUVEAU.sqlite --report RAPPORT.json
python scripts/neighborhood-context/national-osm-landmark-index.py query --index INDEX_NOUVEAU.sqlite --bbox=-7.70,33.55,-7.57,33.64 --limit 180 --output CASABLANCA.json
python -m unittest discover -s scripts/neighborhood-context/fixtures -p test_national_osm_landmark_index.py -v

## Jalons / limites
- J11-A : construire et mesurer une fois l'index national épinglé sur PC privé ; relever les 3 villes, latences, volumes et absence d'erreurs.
- J11-B : concevoir le read-model spatial utilisable depuis l'app (index PC ne suffit pas au runtime Vercel), avec chargement par bbox/tuile et provenance visible.
- J11-C : preview MapLibre privée, BEFORE/AFTER 390/430/768/1280 ; puis J12 QA, J13 closeout et J14 gate release.
- La certification des limites du secteur central Maârif est distincte, et ne bloque pas les repères de viewport.
- Pas d'UI, d'API publique, de DB produit, de merge ni de Vercel dans cette tranche.

Source : https://download.geofabrik.de/africa/morocco.html ; attribution : https://www.openstreetmap.org/copyright.
