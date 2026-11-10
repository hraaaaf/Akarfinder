# Vivre Ici — J11-C adaptateur de lecture QA locale (10/11/2026)

## Scope et sécurité
Objectif : vérifier la lecture du pack privé J11-B depuis le moteur Node de Next, **sans UI et sans mise en ligne**. L'API `/api/geo/qa-national-landmarks` existe uniquement pour la preview locale, et retourne `404` sauf si les **trois** conditions sont remplies : `NODE_ENV=development`, `AKAR_VIVRE_ICI_LOCAL_POI_PREVIEW=true` et les variables serveur `AKAR_VIVRE_ICI_QA_TILE_PACK_DIR`, `AKAR_VIVRE_ICI_QA_EXPECTED_SHA256` définies.

La lecture est limitée à 64 cellules de 0,05° et à 1 000 features au maximum, hors vues nationales à faible zoom. Chemins de tuiles construits à partir d'indices numériques, SHA-256 vérifié pour chaque tuile chargée, refus des données malformées ; identité du PBF fixée par la variable de SHA-256 attendue. Réponse no-store/noindex. Aucun endpoint public déployé, aucune DB produit, aucun pack dans `public/` ni dans Git.

### Variables de QA Windows (exemple du lot)
- `AKAR_VIVRE_ICI_LOCAL_POI_PREVIEW=true`
- `AKAR_VIVRE_ICI_QA_TILE_PACK_DIR=C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110\national-index\morocco-20261109-osm-tiles-v1`
- `AKAR_VIVRE_ICI_QA_EXPECTED_SHA256=0ba250a5c27319a029b7c6b971e2a96a86b300d459406bb162be4c44a23a730f`

Ne jamais ajouter ces variables au Vercel ni envoyer le pack QA sur Internet.

### Gate et suites
- **J11-C1** : tests Node isolés sur bbox, provenance, hash, limite, chemin et refus des revendications commerciales ; workflow GitHub ciblé. Code fourni, pas encore certifié au HEAD.
- **J11-C2** : avant modification MapLibre, captures BEFORE aux 390/430/768/1280, puis lecture réseau QA + map markers à coordonnées OSM fixes (pas de glissement), collisions et attribution ; AFTER mêmes 4 viewports. Ne pas réutiliser automatiquement les POI 'certifiés commerce' existants comme s'ils étaient de nouvelles sources officielles.
- **J12** : QA performance mobile/réseau/cache et UX 3 modes Maârif ; puis J13 closeout et J14 gate release.

**Interdictions :** pas de déploiement Vercel, de merge, de DB PROD ni de publication des tuiles privées.

## J11-C1 durcissement accès local

En mode QA, le hostname de la requête doit également être loopback (`localhost`, `127.0.0.1`, `::1`) ; même un serveur Next de développement accessible sur le LAN ne doit pas distribuer ces données privées sur une autre adresse. L’échec donne HTTP 404, sans fuite de chemin local.
