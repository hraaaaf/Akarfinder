# LOT01-B Casablanca–Maârif — compteur public de biens (08/11/2026)

**Constat externe en lecture seule (site public existant, pas la nouvelle PR)** : `GET /api/search?city=Casablanca&district=Maârif&limit=24` puis versions `offset=0`/`limit=100` renvoient toutes `{"listings":[],"total":5,"source":"database","has_more":false}`. La page Search annonce 5 résultats, alors que **zéro fiche** est renvoyée. **Ne pas présenter ces cinq lignes comme des annonces disponibles.**

**Cause vérifiée dans le code** : `lib/search/structured-district-total.ts` fait un `SELECT COUNT(*)` sur `public.property_listings` par quartier avant contrôle des droits de publication ; `lib/search/database-search.ts` calcule les fiches visibles après `canPublishDbRowToPublicSearchSurface`, filtrage et canonicalisation, mais affichait la valeur SQL non filtrée comme `total`. Aucun assouplissement des règles d'autorisation n'est acceptable.

**GOAL** : afficher le nombre de fiches réellement admissibles quand le scan de quartier est complet, plutôt que le total SQL brut. **SUCCESS** : pour 5 lignes SQL et 0 fiche admissible, résultat public `total:0` ; pour 2 fiches admissibles, `total:2` ; sur scan incomplet, ne pas prétendre avoir validé un chiffre définitif et conserver estimation historique. **PROOF** : nouveaux tests unitaires 3 cas ajoutés dans la suite existante `search-page-visible-odm-canary-v1.test.ts` ; CI typecheck + tests à vérifier sur le SHA de la PR.

**Invariants** : source `database`, filtres, scan max 10 000, pagination, droits des sources, hiérarchie, suppression des duplicatas et absence de données fabriquées préservés. Un total égal aux correspondances post-filtre **avant** consolidation des doublons reste une limitation technique ; l'inventaire réel Maârif n'est pas certifié. Le Search peut afficher zéro annonce si les lignes n'ont pas l'autorisation légale — c'est préférable à une fausse disponibilité.

**Limite** : changer le code dans PR ne corrige pas PROD sans merge/déploiement ; aucune intervention Vercel n'est autorisée. Les essais live après déploiement restent une validation humaine ultérieure.

**Next exact** : tests du helper + vérification CI du code, puis audit prix/sources et échantillon de vrais liens autorisés sur la DB à accès maîtrisé. Aucun déploiement Vercel, aucune DB.
