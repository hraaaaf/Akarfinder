# Vivre Ici — J11-B Read-model national par tuiles (10/11/2026)

## Goal / Success / Proof
- **Goal** : préparer une couche de lecture spatiale portable, sans embarquer SQLite sur le runtime Vercel et sans publier de données non certifiées.
- **Succès technique préparatoire** : conversion déterministe de l'index SQLite J11-A en manifest + tuiles GeoJSON privées de 0,05° ; SHA-256 par tuile ; relecture bornée par bbox ; refus explicite en cas de source non conforme, altération ou zoom trop large.
- **Preuves** : tests synthétiques locaux **7/7 PASS** sur deux zones Casablanca/Rabat et cas de corruption ; CI GitHub exigée sur le HEAD de ce lot. Les résultats réels Maroc entier, performance réseau, MapLibre et visuel **ne sont pas attestés**.

## Contrat privé
- Producteur : `national-osm-tile-pack.py build --index INDEX.sqlite --out-dir PACK_PRIVE`.
- Lecture QA : `national-osm-tile-pack.py query --pack-dir PACK_PRIVE --bbox=-7.68,33.55,-7.60,33.64 --limit 180 --output QA.json`.
- `manifest.json` porte l'identité source MD5/SHA-256, la licence ODbL, l'attribution et les compteurs. Chaque cellule possède un chemin déterministe `tiles/<x>/<y>.json` + SHA-256.
- Points OSM nodes et surfaces représentatives conservés ; identifiant strict, sans regroupement par proximité ni suppression des arrêts opposés.
- Affichage prévu : **« Repères à proximité »**. Les champs `currentlyOpen` et `officialQuarterMembership` restent `null` ; statut d'entrée GPS non certifié.
- Lecture maximale de **64 cellules** par requête QA, 1–1 000 objets, round-robin sur 6 catégories. À faible zoom, refus explicite plutôt que téléchargement national non borné.
- Écriture atomique `.part` vers un nouveau dossier ; aucune écriture dans le repo de données, dans la DB produit, dans le répertoire `public/` ou sur Vercel.

## Gates non franchis
1. **J11-A** : vérifier l'index Geofabrik complet et son rapport, mesurer Casablanca/Rabat/Marrakech + régression 415 Maârif.
2. **J11-B** : mesurer la taille nationale du pack, les temps de génération, les volumes/cellule et dimensionner le budget de requêtes ; ajuster la grille si les tuiles denses sont trop lourdes.
3. **J11-C** : décider du backend de distribution (stockage statique versionné + cache, jamais lien vers le PC) ; intégrer un adaptateur MapLibre privé seulement après une revue du manifest et des conditions d'attribution.
4. **J12–J14** : captures BEFORE/AFTER 390/430/768/1280, tests interaction/perf, score produit, closeout, validation humaine et gate de release.

**Interdits** : aucun tile national commité, aucune mise à disposition publique de `PRIVATE_QA_ONLY`, aucun merge, aucune DB PROD, aucun déploiement Vercel sans autorisation explicite.

## J11-B — validation nationale du pack privé (10/11/2026)

**Preuve réelle après l'extraction** : commande `build` exécutée sur l'index national final avec exit 0. Pack `morocco-20261109-osm-tiles-v1`, **1 339 tuiles**, **27 567 points**, **9 359 502 octets** manifest inclus, médiane de tuile **1 162 octets**, tuile la plus lourde **351 305 octets**. SHA-256 source identique à J11-A. Les 1 339 entrées du manifeste possèdent un checksum ; seules les tuiles consultées ont été effectivement relues/vérifiées à ce stade.

**Conformité source → tuiles** : 25 requêtes par ville sur Casablanca Maârif, Rabat Agdal et Marrakech centre ; 180 features par ville ; résultats des tuiles **strictement identiques** à la requête SQLite (ordre, ID OSM, catégorie et coordonnées). 75 lectures privées exit 0.
- Casablanca : médiane 44,138 ms ; P95 58,312 ms ;
- Rabat : médiane 50,916 ms ; P95 58,964 ms ;
- Marrakech : médiane 48,494 ms ; P95 56,110 ms.

**Limites** : benchmark local disque sans HTTP ni coût de sérialisation/client MapLibre ; fenêtre <=64 cellules, sinon refus. La tuile maximale de 351 Ko impose une mesure de compression et de charge avant toute approche mobile. Pack sous `PRIVATE_QA_ONLY`, jamais copié vers `public/`, Git ni déployé.

**J11-C suivant** : modèle de distribution versionné avec cache et compression, adaptateur QA cartographique, politique des zooms et restitution réelle en 390/430/768/1280 ; contrôle systématique OSM/ODbL, zéro affirmation commerciale ou de frontière non certifiée. J12–J14 restent ouverts.
