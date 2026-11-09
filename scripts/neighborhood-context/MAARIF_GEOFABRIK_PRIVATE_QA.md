# Maârif — Geofabrik OSM QA privée (09/11/2026)

## Goal / Success / Proof

- **Goal** : inventaire reproductible des POI OSM par catégorie dans un rayon de 1,8 km autour du centre de référence Maârif, sans présenter des établissements comme ouverts ni leurs positions comme une frontière officielle.
- **Success QA** : source Geofabrik dont l'intégrité MD5 concorde, parseur node/way/relation testé, 6 catégories présentes, contrôle structurel fail-closed, doublons potentiels réservés à la revue humaine ; **publication toujours NON**.
- **Preuves 09/11** : PBF 244 434 479 octets ; MD5 `c2334c9499b4565a6a16cf2f45624912` (= fichier officiel) ; en-tête PBF `osmosis_replication_timestamp=2026-11-08T21:21:00Z`. 34 165 073 nodes et 1 726 423 areas parcourus ; **415 candidats** : education 70, groceries 101, health 81, transport 128, green_sport 30, shopping 5. **349 nodes, 64 ways, 2 relations**. Rejets : 172 objets sans nom, 2 erreurs de géométrie area (à qualifier). 93 paires intraclasse à moins de 50 m dont 56 paires avec même nom normalisé ; **aucune suppression automatique**, notamment arrêts de bus de sens opposé. Shortlist privée de **24 candidats (4 par catégorie)**, contrôles indépendants à compléter.
- **Audit technique** : `scripts/audits/vivre-ici-maarif-osm-pbf-gate.mjs` applique les gardes source/licence/identité/cohérence/position/absence de certification ; 6 tests Node synthétiques. **Sortie structure validée, publishable=false**.
- **Recoupements privés initiaux (3/24)** : Carrefour Gourmet Vélodrome ([site officiel Carrefour](https://carrefour.ma/magasins/)), Parc urbain du Vélodrome ([Casablanca Aménagement](https://www.casa-amenagement.ma/fr/nos-projets/parc-urbain-du-velodrome)), Pharmacie Val d'Anfa ([Telecontact](https://www.telecontact.ma/annonceur/pharmacie-val-d-anfa/3270816/casablanca.php), [Annuaire gratuit](https://www.annuaire-gratuit.ma/pharmacies/pharmacie-val-d-anfa-s98596.html)). Pour la pharmacie, coordonnées d'annuaire distantes de **7,5 m** des coordonnées OSM ; **indépendance de la filière de géocodage inconnue**. Existence/nom/position apparente partiellement corroborés ; activité courante et appartenance au quartier central **non certifiées**.

## Extraction hors ligne, jamais via requête de visite

1. Installer Python avec `osmium`, `shapely` et `numpy` dans un environnement virtuel QA distinct. Les scripts ne sont **pas** appelés par Next.js ni la CI lourde.
2. Télécharger une **copie épinglée**, jamais réutiliser le suffixe `latest` pour un audit historique : `https://download.geofabrik.de/africa/morocco-latest.osm.pbf` et `.md5`. Conserver la date, les octets, l'URL et l'empreinte en manifeste privé. [Geofabrik documentation](https://www.geofabrik.de/data/download.html).
3. Syntaxe QA Python :
   `python scripts/neighborhood-context/maarif-geofabrik-private-qa.py --pbf <local.osm.pbf> --md5-file <local.osm.pbf.md5> --output <private.json>`.
4. Contrôle géographique/doublons et shortlist :
   `python scripts/neighborhood-context/maarif-geofabrik-qualify-private.py --input <private.json> --out-dir <private-dir>`.
5. Contrat read-only JS :
   `node scripts/audits/vivre-ici-maarif-osm-pbf-gate.mjs --input <private.json> --output <private-gate-summary.json>`.
6. Smoke synthétique : `scripts/neighborhood-context/fixtures/maarif-synthetic-area-smoke.osm`, MD5 local à calculer sur le fichier et à fournir. Attendu **3 objets artificiels** : node santé, way parc et relation parc. **Ne jamais commiter les données candidates brutes ni les journaux contenant noms/coordonnées**.

## Interdictions et gates

- Le **centre/rayon** n'est ni le quartier central ni une délimitation cadastrale/administrative ; l'OSM relation/2801474 reste une **shadow preview** de l'arrondissement, désactivée tant que la revue SIG n'est pas obtenue.
- Date de réplication OSM ≠ date d'activité de chaque magasin ; `source fresh` ≠ `business open now`. Les stations de transport des deux côtés de rue ne doivent pas être fusionnées automatiquement. `osm_polygon_representative_point` n'est pas une entrée publique certifiée.
- Attribution **© OpenStreetMap contributors**, [ODbL](https://www.openstreetmap.org/copyright) et obligations sur bases dérivées : revue juridique/licence avant exposition publique. [Lignes directrices OSMF](https://osmfoundation.org/wiki/Attribution_Guidelines).
- **Aucun accès BD, écriture publicitaire, preview fournisseur live, push POI, activation flag admin, fusion ni Vercel** via ces scripts.
- Après revue indépendante d'identité, position, source commerciale, licence et territoire, décider explicitement d'une **projection UI candidate** ou d'un *read-model* certifié avec tests E2E ; faire BEFORE/AFTER 390/430/768/1280 et vérifier la CI HEAD exacte.
- Le parcours de qualification reste **ouvert** : 3/24 recoupements de nom/adresse, 21/24 encore à revoir ; indépendance des sources GPS et état d'ouverture non vérifiés ; 2 erreurs de géométrie non investiguées. Ne pas convertir ce taux en score de réussite global.

## Emplacements QA du 9 novembre

- Snapshot privé (hors Git) : `C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261109\poi-pbf\maarif-osm-pbf-candidates-private.json`
- Diagnostic : `...\poi-pbf\qualification\maarif-pbf-quality-report.json`
- File d'examen : `...\poi-pbf\qualification\maarif-pbf-review-shortlist-private.json`
- Recoupements : `...\poi-pbf\qualification\maarif-private-crosschecks.json`
- Manifeste et contrôle : `...\poi-pbf\PBF_SOURCE_MANIFEST_2026-11-09.json`
