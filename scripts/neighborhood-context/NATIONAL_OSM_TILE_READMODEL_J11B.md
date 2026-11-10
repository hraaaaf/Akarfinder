# Vivre Ici — J11-B Read-model national par tuiles (10/11/2026)

## Goal / Success / Proof
- **Goal** : préparer une couche de lecture spatiale portable, sans embarquer SQLite sur le runtime Vercel et sans publier de données non certifiées.
- **Succès technique préparatoire** : conversion déterministe de l'index SQLite J11-A en manifest + tuiles GeoJSON privées de 0,05° ; SHA-256 par tuile ; relecture bornée par bbox ; refus explicite en cas de source non conforme, altération ou zoom trop large.
- **Preuves** : tests synthétiques locaux **7/7 PASS** sur deux zones Casablanca/Rabat et cas de corruption ; CI GitHub exigée sur le HEAD de ce lot. Les résultats réels Maroc entier, performance réseau, MapLibre et visuel **ne sont pas attestés**.

## Contrat privé
- Producteur : \`national-osm-tile-pack.py build --index INDEX.sqlite --out-dir PACK_PRIVE\`.
- Lecture QA : \`national-osm-tile-pack.py query --pack-dir PACK_PRIVE --bbox=-7.68,33.55,-7.60,33.64 --limit 180 --output QA.json\`.
- \`manifest.json\` porte l'identité source MD5/SHA-256, la licence ODbL, l'attribution et les compteurs. Chaque cellule possède un chemin déterministe \`tiles/<x>/<y>.json\` + SHA-256.
- Points OSM nodes et surfaces représentatives conservés ; identifiant strict, sans regroupement par proximité ni suppression des arrêts opposés.
- Affichage prévu : **« Repères à proximité »**. Les champs \`currentlyOpen\` et \`officialQuarterMembership\` restent \`null\` ; statut d'entrée GPS non certifié.
- Lecture maximale de **64 cellules** par requête QA, 1–1 000 objets, round-robin sur 6 catégories. À faible zoom, refus explicite plutôt que téléchargement national non borné.
- Écriture atomique \`.part\` vers un nouveau dossier ; aucune écriture dans le repo de données, dans la DB produit, dans le répertoire \`public/\` ou sur Vercel.

## Gates non franchis
1. **J11-A** : vérifier l'index Geofabrik complet et son rapport, mesurer Casablanca/Rabat/Marrakech + régression 415 Maârif.
2. **J11-B** : mesurer la taille nationale du pack, les temps de génération, les volumes/cellule et dimensionner le budget de requêtes ; ajuster la grille si les tuiles denses sont trop lourdes.
3. **J11-C** : décider du backend de distribution (stockage statique versionné + cache, jamais lien vers le PC) ; intégrer un adaptateur MapLibre privé seulement après une revue du manifest et des conditions d'attribution.
4. **J12–J14** : captures BEFORE/AFTER 390/430/768/1280, tests interaction/perf, score produit, closeout, validation humaine et gate de release.

**Interdits** : aucun tile national commité, aucune mise à disposition publique de \`PRIVATE_QA_ONLY\`, aucun merge, aucune DB PROD, aucun déploiement Vercel sans autorisation explicite.
