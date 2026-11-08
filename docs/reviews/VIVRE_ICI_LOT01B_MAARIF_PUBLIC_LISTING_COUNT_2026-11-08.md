# LOT01-B Casablanca–Maârif — compteur public de biens (08/11/2026)

**Constat externe en lecture seule (site public existant, pas la nouvelle PR)** : `GET /api/search?city=Casablanca&district=Maârif&limit=24` puis versions `offset=0`/`limit=100` renvoient toutes `{"listings":[],"total":5,"source":"database","has_more":false}`. La page Search annonce 5 résultats, alors que **zéro fiche** est renvoyée. **Ne pas présenter ces cinq lignes comme des annonces disponibles.**

**Cause vérifiée dans le code** : `lib/search/structured-district-total.ts` fait un `SELECT COUNT(*)` sur `public.property_listings` par quartier avant contrôle des droits de publication ; `lib/search/database-search.ts` calcule les fiches visibles après `canPublishDbRowToPublicSearchSurface`, filtrage et canonicalisation, mais affichait la valeur SQL non filtrée comme `total`. Aucun assouplissement des règles d'autorisation n'est acceptable.

**GOAL** : afficher le nombre de fiches réellement admissibles quand le scan de quartier est complet, plutôt que le total SQL brut. **SUCCESS** : pour 5 lignes SQL et 0 fiche admissible, résultat public `total:0` ; pour 2 fiches admissibles, `total:2` ; sur scan incomplet, ne pas prétendre avoir validé un chiffre définitif et conserver estimation historique. **PROOF** : nouveaux tests unitaires 3 cas ajoutés dans la suite existante `search-page-visible-odm-canary-v1.test.ts` ; CI typecheck + tests à vérifier sur le SHA de la PR.

**Invariants** : source `database`, filtres, scan max 10 000, pagination, droits des sources, hiérarchie, suppression des duplicatas et absence de données fabriquées préservés. Un total égal aux correspondances post-filtre **avant** consolidation des doublons reste une limitation technique ; l'inventaire réel Maârif n'est pas certifié. Le Search peut afficher zéro annonce si les lignes n'ont pas l'autorisation légale — c'est préférable à une fausse disponibilité.

**Limite** : changer le code dans PR ne corrige pas PROD sans merge/déploiement ; aucune intervention Vercel n'est autorisée. Les essais live après déploiement restent une validation humaine ultérieure.

**Next exact** : tests du helper + vérification CI du code, puis audit prix/sources et échantillon de vrais liens autorisés sur la DB à accès maîtrisé. Aucun déploiement Vercel, aucune DB.


## Closeout test de contrat LOT01-B — 08/11/2026

- **Code SHA certifié** : `e13d36b22bc7e108118d3ee374c413832312ebdb` via [PR #1195 Draft](https://github.com/hraaaaf/Akarfinder/pull/1195).
- **CI** [Search Page Visible ODM Canary V1 #42469023580 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42469023580) : suite de contrats Node `--experimental-strip-types` PASS, `npm ci` PASS, `npx tsc --noEmit` PASS. Les tests supplémentaires couvrent : 5 lignes SQL / 0 admissible → 0 ; 5 SQL / 2 admissibles → 2 ; scan incomplet ou hors quartier → estimation conservée. Aucun élargissement des droits de publication.
- **Limite de preuve** : test unitaire/TypeScript uniquement ; **aucun test sur une vraie base Maârif avec le nouveau code en production**. La lecture du serveur public avant déploiement montre toujours `listings:[],total:5,has_more:false`. Aucun changement PROD, aucune DB.
- **Conséquence produit** : après release autorisée et si les mêmes règles/rows s'appliquent, l'API ne promettra plus cinq offres quand aucune fiche ne peut être publiée. Cela **ne crée pas** de nouvelles annonces ni ne confirme l'existence/actualité des cinq lignes SQL, et n'élimine pas les limites de scan borné ou de déduplication.
- **Lot 01-B état** : correction de vérité du total **GREEN aux tests de contrat**, inventaire/sources/prix Maârif **OUVERTS**. Ne pas annoncer release ou score global. Next : vérifier sources autorisées, prix et liens dans un environnement DB contrôlé ; comparer au serveur public uniquement après autorisation de déploiement.


## Tranche B2 — Sélection de la bonne source autorisée (lecture de code, 08/11/2026)

**Autre incohérence identifiée dans le code, non prouvée comme incidente en PROD** : le SQL de `queryNeonListings({public_search_only:true})` sélectionne les biens dès qu'une **source autorisée** est associée, mais le `LEFT JOIN LATERAL listing_sources` conservait systématiquement **la plus ancienne** source active (potentiellement tierce/legacy). Le contrôle `canPublishDbRowToPublicSearchSurface(row)` regarde ensuite uniquement `row.source_name` sélectionné et peut exclure un bien qui a pourtant une autre représentation **autorisée**.

**Correctif candidat** : en recherche publique seulement, réutiliser les paramètres SQL de sources autorisées du `EXISTS` pour prioriser, dans le `LATERAL`, les représentations actives `first_party`/`partner_authorized` avant l'ancienne source tierce ; sous chaque classe, ordre historique `first_seen_at,id` conservé. Les autres lectures non publiques ne changent pas. **Aucune nouvelle source n'est autorisée**, aucune annonce synthétique, aucune transformation d'un site tiers en partenaire. Les candidats OpenSERP restent soumis aux contrôles d'origine/lien/PII habituels.

**Preuve à obtenir** : tests du builder SQL (priorité/legacy/injection), lecture du code et `tsc --noEmit` via CI Search Page Visible ODM Canary. Aucun runtime PROD modifié ; données réelles non certifiées.

### Audit source historique (preuve limitée, read-only)

Dans la branche Neon **historique** `recovery-schema-cert-20260924` de la base `AkarFinder`, pour les paires exactes `city=Casablanca`, `district` dans `Maarif`/`El Maarif` (casse ignorée), on compte **1 535 lignes**, **747 prix positifs**, **647 surfaces positives**, et **0 association source autorisée** selon les six identifiants en vigueur. **0** ligne a le marqueur OpenSERP. La dernière date `updated_at` de ce sous-ensemble est **2026-09-28**, donc **aucune mise à jour sous 30 jours** au 08/11. Sources majoritaires : marocimmo.com, mubawab.ma, avito.ma, domio.ma, agenz.ma. Ce stock ancien est un index de référence, **pas un inventaire publiable ou frais**. La branche `test-neon-runtime-p0-20261006` présentait la même distribution agrégée de quartiers, sans source autorisée, mais **n'est pas la preuve du runtime PROD**. La vraie `DATABASE_URL` Vercel est sensible/non lisible, `DATABASE_PROVIDER=neon` est confirmé ; la branche par défaut `production` de ce projet Neon n'a pas de table `public.property_listings`. Ne pas inférer la connexion Vercel.

**Constat live distinct** au même moment : `GET /api/search?city=Casablanca&district=Maârif&limit=24&offset=0` renvoie `total:5,listings:[],has_more:false`. `GET /api/search/gateway?city=Casablanca&district=Maârif` renvoie explicitement `reason:district_requires_structured_search,results_count:0` ; la restriction quartier est volontaire et protège contre les résultats faux positifs ville entière.

**Gate produit toujours ouvert** : sans partenariat ou annonce propriétaire explicitement autorisée et vérifiée, il n'y a pas de vraie annonce Maârif exploitable prouvée. Ne pas publier les 1 535 lignes historiques. Aucune écriture DB / aucun Vercel deploy.
