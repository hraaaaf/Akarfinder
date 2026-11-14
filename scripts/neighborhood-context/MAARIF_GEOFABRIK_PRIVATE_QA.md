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

## 09/11/2026 — Traitement des anomalies et POI prioritaires

- L'extraction PBF précédente comptait 2 `area_geometry_error` sans enregistrer les IDs. Le parseur versionné journalise désormais jusqu'à 25 anomalies avec `source_id`, raison et classe d'exception dans `area_error_examples` ; seule une nouvelle passe PBF permet d'identifier les deux cas réels. Le test offline `fixtures/test_maarif_area_errors.py` injecte un faux `way/999991` : diagnostic conservé, zéro candidat émis, **PASS**. Aucune nouvelle passe lourde pendant les workflows GitHub en cours.
- Sur les 24 POI prioritaires, **9 disposent d'une source secondaire repérée**, MAIS aucun n'a de certification d'ouverture terrain/GPS indépendant/quartier central. Fichier de rapprochement strictement local QA : `...\poi-pbf\qualification\maarif-24-priority-reconciled-private.json`.
- Les 93 paires proches ne sont pas des doublons certains : 54 mêmes noms de transport peuvent désigner des arrêts opposés, et 2 paires de commerces BIM sont prioritaires pour une revue de proximité. **Zéro suppression automatique**. Rapport local : `...\poi-pbf\qualification\maarif-near-pairs-triage-private.json`.
- SIG : ne jamais utiliser le seul P.A Maârif 2026 comme acte délimitant l'arrondissement : il concerne l'usage du sol. Valider séparément la limite administrative avec document de la commune et carte/acte compétent ; shadow OFF.

### Source OSM datée par objet (09/11/2026)

- Après la vérification de 4 paires d'arrêts de bus sur l'API OSM v0.6, les dates de dernière modification individuelles sont parfois **2024** malgré une réplication du PBF en **novembre 2026**. Le script d'extraction écrit `osm_object_version`, `osm_object_modified_at` et `business_last_verified_at=null`. La valeur non initialisée `1970` n'est **pas** une source fraîche : elle est convertie en null.
- Le test `fixtures/test_maarif_area_errors.py` (venv pyosmium+Shapely) contrôle l'ID de faux polygone défectueux et l'âge d'un faux objet OSM : PASS. Le test fixture PBF node/way/relation montre 3 candidats, et les timestamps fictifs non initialisés sont tous null.
- Les deux **anomalies réelles area** de l'extraction antérieure restent inconnues : l'ancien PBF n'enregistrait que le nombre ; il faut une unique nouvelle passe épinglée pour les IDs. Ne pas la lancer pendant les workflows lourds GitHub de la PR #1197.
- Preuve de quatre paires : `...\poi-pbf\qualification\maarif-transport-pairs-sample-private.json`. Aucune des 8 stations examinées n'a de tag `direction` ; interdiction de fusionner sur la seule similitude du nom, des lignes, de l'opérateur ou du rayon 50 m.

### Correction de portée — 09/11/2026

- Les **2 erreurs de géométrie** vues pendant le premier parcours concernent des objets catégorisés examinés sur **l'ensemble du Maroc** : le callback `area()` construisait leur polygone **avant** le filtre radial centré sur Maârif. Leur appartenance à Maârif est **inconnue** tant que les deux identifiants OSM ne sont pas récupérés. Ne pas les déclarer comme des défauts locaux certains.
- La file de 24 candidats contient désormais **11 candidats avec sources secondaires** et **13 sans**. Deux nouveaux recoupements de pharmacies proviennent d'annuaires indépendants mais aucune ouverture actuelle ni vérification GPS ou administrative n'est certifiée. Source QA locale : `...\poi-pbf\qualification\maarif-24-priority-reconciled-private.json`. Pas d'injection read-model.

### Sas offline d'admission revue humaine (LOT01-K)

Commande QA privée (hors dépôt et hors serveur de rendu) :

```powershell
node scripts/neighborhood-context/maarif-offline-review-admission.mjs --input "<private-v2-pbf-candidates>.json" --reviews "<private-review-ledger>.json" --manifest "<pinned-source-manifest>.json" --output "<private-admission-report>.json"
```

- Exige l'empreinte PBF Geofabrik épinglée MD5 `c2334c9499b4565a6a16cf2f45624912`, le manifeste de réplication `2026-11-08T21:21:00Z`, les 415 objets cohérents (catégories, identités, géolocalisation dans un **rayon contextuel**, pas une limite administrative).
- Un rapprochement secondaire de nom/adresse ne suffit **jamais**. Pour accéder uniquement à une **preview privée**, chaque dossier demande une revue datée : identité et adresse, coordonnées vérifiées depuis une autre source, activité documentée à la date du contrôle, attribution/ODbL revue, reviewer identifié, pas de revendication « ouvert maintenant » ni d'appartenance au quartier central, sources HTTPS distinctes. Le code vérifie la *structure déclarée*, **pas la vérité des sites ni leur indépendance réelle**.
- Sortie réelle du 09/11/2026 : `415` objets d'origine, `24` dossiers de revue, `0` admis, `24` en attente de revue humaine ; `public_read_model_write=false`, `database_write=false`, aucun appel Overpass.
- Ne pas déposer les JSON nominatifs ni les justificatifs source en Git/Notion. Test : `node --test scripts/scrapers/__tests__/vivre-ici-maarif-offline-admission.test.mjs` — **11 PASS**.
- L1 et ANN-L6 ne fusionnent plus deux IDs OSM différents par simple proximité/nom : une fusion de plateformes de bus ou de commerces exige preuve manuelle. La comparaison PBF V2 prouve seulement **415 IDs cohérents**, pas 415 établissements actuels.

- **SHA-256 de la sortie JSON V2** conservé dans le manifeste privé : `e8fcb8e382e365952bfa0971d81c319014e68831d39fb9a36a60fca441d66933`. La CLI refuse une modification des octets JSON ; le MD5 valide séparément le PBF original. **11/11 tests** du sas d'admission et 0/24 candidat admis en QA, aucun traitement runtime.
