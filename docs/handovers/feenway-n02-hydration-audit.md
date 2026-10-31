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

## N02c — chronologie de blocages certifiée (30 octobre 2026)

**Preuve indépendante :** [CI 41093983871](https://github.com/hraaaaf/Akarfinder/actions/runs/41093983871), `completed/success`, **5/5 tests offline PASS**, artifact `12996205056` ZIP SHA-256 `52ed2f6de8484b090a4b3eef5325db2de1b5c2950a08de45398be61eba10d589`, JSON `browser-probe.json` SHA-256 `a81be68a6807a83377179fe7bb0bf56180450f0d340088eb98d4587eebeef8b5`. Vérification : extraction ZIP + comparaison des sommes par catégorie et par phase sur chacune des trois pages, **0 incohérence**.

| Catégorie bloquée | Chargement | Scroll 1 | Scroll 2 | Scroll 3 | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Catégories immobilières dynamiques | 5 | 4 | 0 | 61 | 70 |
| Villes dynamiques | 2 | 0 | 0 | 0 | 2 |
| Autres chemins dynamiques | 28 | 11 | 0 | 5 | 44 |
| Fiches `/listings` | 0 | 27 | 27 | 12 | 66 |
| API `/api` | 6 | 0 | 0 | 0 | 6 |
| **Total** | **41** | **42** | **27** | **78** | **188** |

**Constat exact :** 116 requêtes de type dynamique (35 `load`, 15 `scroll_1`, 0 `scroll_2`, 66 `scroll_3`), plus 66 fiches et 6 API toutes bloquées. Casablanca ville porte 60 des 61 appels `dynamic_market` observés dans `scroll_3`. Comptes DOM inchangés à 18/24/24 sur les trois pages ; 0 nouvelle ID observée, 0 erreur, 0 écriture DB, 0 visite autorisée des fiches.

**Interprétation prudente :** les appels sont temporellement *associés* aux phases de scroll, pas nécessairement causés par le scroll ; ils peuvent correspondre à du préchargement Next.js/de navigation, sans annonce nouvelle. Comme les appels restent refusés, l'absence d'ancres après scroll ne démontre **ni couverture exhaustive, ni absence d'infinite scroll**. Les trois conclusions restent `INCONCLUSIVE_BLOCKED_DYNAMIC_REQUESTS`.

**N02d décidé :** insérer trois fenêtres témoins `idle_1..3` de 600 ms sans scroll avant les trois scrolls, sur les trois mêmes landings, avec les mêmes interceptions strictes et aucune nouvelle route autorisée. Comparer le comportement pendant l'immobilité vs le défilement ; ne pas présenter le résultat comme preuve causale définitive. CI N02d à certifier avant conclusion.

PR #1105 DRAFT. Freeze historique `10910779576` expirée HTTP 410 ; Mubawab/Sarout toujours en attente de preuve indépendamment de FeenWay. Aucun deploy, DB write ni merge.

## N02d — témoin immobile certifié (30 octobre 2026)

**Run exact :** [41095618047](https://github.com/hraaaaf/Akarfinder/actions/runs/41095618047) `completed/success`, HEAD `42f1908edac49b026a6ae0e788890bb7c6b4a507`, **6/6 tests offline PASS**, artifact `12996845649`. ZIP SHA-256 `bef30669209ce19798765504920f7ca362ca9ad3851edc2228c08f5f0dec0b47` recalculé ; JSON SHA-256 `5dc3d7d8063f753c27dcb901e93c526e469afadb06bcb78fcb3a904b7e56a3de`. Comptes par phase/bucket recalculés : **188/188** cohérents, 0 erreur.

**Résultat observé :** 9 fenêtres `idle` (3 par page, 600 ms chacune) : **0 requête refusée et 0 nouvelle ancre**, contre **147 requêtes refusées** dans les phases de scroll et 41 au chargement. Même distribution de requêtes bloquées que N02c malgré l'attente sans scroll. Pages : 18/24/24 liens de fiches inchangés ; `new_ids_after_idle=[]` et `new_ids_after_scroll=[]`. Le scroll est donc fortement associé à l'activation du préchargement/chargement réseau. Ce n'est toujours **pas** une preuve du contenu des requêtes refusées ou de l'exhaustivité du site. Les trois verdicts restent `INCONCLUSIVE_BLOCKED_DYNAMIC_REQUESTS`.

**N02e — corrélation avec liens DOM publics, sans ouvrir les routes :** calculer en mémoire uniquement des empreintes de chemins de navigation, classifier les destinations des requêtes refusées selon leur présence préalable dans les ancres HTML, puis ne stocker que des totaux agrégés (liens initiaux / liens observés durant immobilité / liens observés après scroll / destination non observée). Aucune URL, chemin brut, ID, token ou hash n'est persisté dans le rapport. `gate()` et robots inchangés. Lien déjà présent → préchargement de navigation plausible ; absent → inconclusif, pas autorisation de suivre. CI à vérifier avant toute interprétation.

Pas de DB, Vercel, merge. PR #1105 reste DRAFT ; certification Mubawab/Sarout indépendante non débloquée.

## N02e — clôture du diagnostic restreint, preuves vérifiées (30 octobre 2026)

**CI et intégrité :** [run 41096486059](https://github.com/hraaaaf/Akarfinder/actions/runs/41096486059) `completed/success`, HEAD `e13a3dd086e789f6e908a93f057aaa9f54d05e34`, **7/7 tests offline PASS**, `complete=true`, `errors=[]`, artifact **12997685311**. ZIP SHA-256 GitHub **et recalcul local** `34de620395ad4447a5467b2e1ef0ae68352e1d56b6c09061fe6e342657cd1f37` ; `browser-probe.json` SHA-256 `e48cfecc6116d421cad843c2d2ba06541d1256cb0b2634bddcb89dea8afe4209`. Totaux par page, par phase et par catégorie recalculés et cohérents, `blocked_target_linkage_complete=true` sur les 3 pages. Rapport : aucun hash de chemin, domaine, token, paramètre ni identifiant de destination bloquée stocké.

| Landing publique | Liens de fiches sur 4 mesures | Requêtes suivies | Chemin présent dans le DOM initial | Chemin sans ancre initiale |
| --- | --- | ---: | ---: | ---: |
| Casablanca (ville) | 18 → 18 → 18 → 18 | 108 | 106 | 2 API |
| Appartement Casablanca | 24 → 24 → 24 → 24 | 39 | 37 | 2 API |
| Racine | 24 → 24 → 24 → 24 | 41 | 39 | 2 API |
| **Total** | **0 nouveau lien parmi ces 3 pages** | **188** | **182 (96,8 %)** | **6 API** |

**Décomposition :** 116 requêtes dynamiques refusées (70 catégories immobilières, 2 villes, 44 autres), 66 requêtes vers les fiches `/listings`, 6 vers `/api`. **182/188 appels bloqués** ciblent des *chemins* correspondant aux ancres déjà présentes dans le DOM initial : **116/116 dynamiques + 66/66 fiches**, tandis que les 6 API n'ont pas d'ancre. Les 9 fenêtres témoins immobiles de N02d n'ont produit aucun appel classé ; les phases scroll ont produit 147 appels, après 41 au chargement. Aucun chargement interdit n'a été autorisé, aucune nouvelle ID DOM observée, aucune écriture DB.

**Limitation méthodologique essentielle :** les empreintes comparent uniquement les **chemins** (slash final normalisé) : les paramètres de requête sont volontairement ignorés. Un appel dynamique à la même route avec un curseur ou des paramètres différents peut donc être classé `linked_initial`. Les **182 sont des requêtes**, pas des pages uniques et encore moins des annonces. La nature des réponses bloquées n'a pas été observée. Le rapprochement est **fortement compatible avec un préchargement de liens connus**, mais ne démontre **ni l'absence de pagination dynamique, ni l'exhaustivité de FeenWay**. Les 3 conclusions JSON restent exactement `INCONCLUSIVE_BLOCKED_DYNAMIC_REQUESTS`, avec `site_exhaustiveness_certified=false`.

**Décision :** le **diagnostic restreint N02** est terminé (pas la certification d'exhaustivité). Ne pas multiplier les probes JS identiques ou autoriser /api et /listings pour résoudre un doute. Chemin de meilleure valeur pour l'objectif 200K : valoriser en **offline** les **73 710 URLs de fiches découvertes par N01** (URLs candidates, non biens actifs/certifiés), mesurer déduplication, 5 champs, fraîcheur, disponibilité et droits/réutilisation ; ne jamais promouvoir en DB sur le seul critère URL découverte. Pour revisiter le chargement dynamique, formuler une hypothèse testable avec une nouvelle autorisation explicite de portée et conformité ; pas de contournement de protections.

**Closeout :** handover technique certifié dans ce document ; [PR #1105](https://github.com/hraaaaf/Akarfinder/pull/1105) **DRAFT**, ne pas merger automatiquement. Certifications Mubawab/Sarout indépendantes toujours affectées par le freeze historique `10910779576` expiré HTTP 410. Aucun merge, déploiement Vercel, SQL ou publication.
