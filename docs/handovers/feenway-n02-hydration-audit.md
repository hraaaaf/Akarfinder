# FeenWay N02 — Public hydration audit mission, 2026-10-30

**Goal.** Determine whether three allowlisted public French landing pages reveal new listing anchors after up to three scrolls, without opening property details or disallowed APIs.

**Proof.** A CI artifact records the initial listing anchor count, counts after each scroll, newly observed IDs, denied request categories, HTTP errors and per-page conclusion. Three offline guard tests must pass before opening Chromium.

**Safety.** Before browser startup, fetch and check robots.txt; reject 403/429 and disallowed/ambiguous rules. Browser network interception permits only the exact landing document and same-host /_next/static/ script/style resources. Block every /api, /listings, /admin, /samsar and /paiement path, non-GET requests, dynamic XHR/fetch, off-host resources, images and downloads. No login, data writes, screenshots or visits to individual listings.

**Interpretation.** A positive new-links count means new public anchors were observed on that sample. A zero count is not proof of site-wide completeness. If dynamic requests were blocked, result must remain INCONCLUSIVE_BLOCKED_DYNAMIC_REQUESTS, not proof that no additional listings exist.

**Existing evidence.** FeenWay N01 currently certifies 1736/1736 public FR market/quartier landing pages listed in the snapshot and 73710 distinct discovered listing URL links (58513 from six XML plus 15197 outside XML). It does not certify active unique properties or reuse rights.

**Dependencies and next.** Verify the specific N02 GitHub run, download the artifact and independently check URL counts and forbidden request records. If browser setup fails, distinguish infrastructure failure from product behavior; do not invent a result. PR #1105 remains DRAFT with separate Mubawab/Sarout full-field checks blocked by expired GitHub artifact 10910779576 (HTTP 410). No deploy, SQL write or merge.

## CI 41092010780 — résultat certifié, N02 NON CONCLUSIF (30 octobre 2026)

[GitHub run 41092010780](https://github.com/hraaaaf/Akarfinder/actions/runs/41092010780) **SUCCESS**, tests de garde **3/3 PASS**. Artifact `12994162881` `browser-probe.json` téléchargé, JSON relu et SHA-256 brut `8668b322039f7e300e698e1cffb17acd64e4900b36f1a4596a775a8b4112119f` recalculé.

Sur les 3 landings et jusqu'à 3 défilements : ville Casablanca **18→18→18→18**, appartements Casablanca **24→24→24→24**, Racine **24→24→24→24** liens de fiches HTML. **0 lien supplémentaire** observé ; **0 erreur**, `db_writes=0`, `listing_detail_requests=0`. Mais **116 requêtes dynamiques bloquées** : respectivement **88, 13 et 15**, plus d'autres requêtes bloquées par domaine ou route. Les trois conclusions exactes du rapport sont **INCONCLUSIVE_BLOCKED_DYNAMIC_REQUESTS** ; pas de preuve de l'absence de chargement différé ni d'exhaustivité.

**Amélioration N02b engagée :** classifier les seules requêtes interceptées (catégories génériques de chemin sans domaine, paramètres, tokens ou IDs) **sans les exécuter**. Les protections existantes restent identiques : XHR/fetch, fiches détaillées, API et ressources externes toujours bloquées. Nouveau test de sécurité sur la classification. L'objectif est d'identifier si les requêtes bloquées concernent plutôt Next.js, les catégories publiques ou d'autres routes, pour décider si une investigation plus profonde est justifiée. **Aucun résultat N02b présumé avant sa CI**.

PR #1105 toujours DRAFT, checks historiques séparés bloqués par l'artifact `10910779576` expiré HTTP 410. Aucun merge, aucune modification DB ni Vercel.

## N02b — classement vérifié des requêtes refusées (30 octobre 2026)

**Preuve :** [run 41093275306](https://github.com/hraaaaf/Akarfinder/actions/runs/41093275306) **completed/success** ; 4/4 tests offline PASS, artifact `12995565311`, JSON SHA-256 `2ee5daeba23df41db21dd982e81db831995e092aafe1e9015fba0c753a5b5d84` recalculé. Les pages publiques donnent respectivement **18 / 24 / 24** liens identiques sur quatre mesures (chargement initial + 3 scrolls), aucun nouveau lien, zéro erreur. **116 requêtes dynamiques refusées** : **70** chemins de catégorie, **2** chemins ville, **44** autres ; de plus **66** requêtes vers `/listings` et **6** vers `/api` refusées. Tous ces appels sont restés bloqués ; les valeurs ne sont pas des annonces supplémentaires. Les conclusions demeurent `INCONCLUSIVE_BLOCKED_DYNAMIC_REQUESTS`.

**Hypothèse à tester sans ouverture d'API :** les requêtes vers catégories peuvent provenir du préchargement de liens au chargement initial plutôt que du défilement. **N02c** ajoute donc un compteur agrégé par phase (`load`, `scroll_1`, `scroll_2`, `scroll_3`) aux catégories déjà collectées. Aucun chemin brut, domaine, token, ID ou paramètre conservé ; aucune requête interdite autorisée. Test unitaire sur l'agrégateur ajouté. La CI doit confirmer l'exécution avant interprétation.

N01 reste à **73 710 URL de fiches découvertes** ; N02 ne certifie pas l'exhaustivité. Les certifications Mubawab/Sarout/full-field de PR #1105 DRAFT restent bloquées sur la freeze historique expirée `10910779576` HTTP 410. Aucun merge, Vercel ou DB.
