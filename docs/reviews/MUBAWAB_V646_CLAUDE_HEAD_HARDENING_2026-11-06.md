# V6.4.6 — réaudit Claude : hardening du HEAD #1154 (06/11/2026)

## Scope et référence

- PR source : [#1154](https://github.com/hraaaaf/Akarfinder/pull/1154), HEAD exact de départ `752b6fa091eb7831d0067991ab6068d9608d2be2`.
- PR isolée : [#1172](https://github.com/hraaaaf/Akarfinder/pull/1172), branche `fix/akar-v646-readaudit-atomic-gate-20261106`.
- Revue Claude fournie par l'utilisateur : **4,5/10 sur le snapshot du 03/11 uniquement**, ni note ni certification du HEAD actuel. Diffs Claude originaux non fournis sous forme de fichiers ; pas de prétention d'application de ces diffs.
- **Aucune navigation Mubawab, aucun merge, aucune DB cloud, aucun Vercel** dans ce lot.

## GOAL / SUCCESS / PROOF

**Goal :** empêcher trois défauts démontrés : ingestion partielle d'un lot de shards, faux noyau « complet » construit en cumulant des observations, et validation de pages de mauvaise ville / catégorie.

**Success :** (A) un lot ayant ne serait-ce qu'une page en erreur n'ouvre pas SQLite ; (B) une métrique `complete_core_with_district` n'accepte qu'une observation source réellement complète ; (C) le pilote de vente d'appartements refuse un seul item de ville/type incompatible.

**Proof requise :** code exact + tests hors ligne sur le **nouveau HEAD** avec logs et résultat `success`; puis revue indépendante de cette version. Ni 200k ni droits commerciaux ne sont prouvés.

## Implémentation présente sur la branche

1. **P0-A — batch fail-closed** dans `akarfinder_scraper.py` : si `with_listings != requested`, diagnostic puis `return 1` **avant** `init_db()`. Le contrôle porte sur des shards invalides, pas sur la transactionnalité de toutes les écritures SQLite d'une exécution déjà admise.
2. **P1-B — noyau strict par observation** dans `benchmark_evidence.py` : `complete_core_*` est compté sur **une seule ligne source** ; les champs enrichis par union sont signalés séparément via `historically_enriched_core_with_district_not_a_source_observation`. `import_listings` sélectionne la meilleure carte source sans fusion croisée des champs complémentaires. **Limite** : un ancien export SQLite déjà enrichi sur plusieurs cycles ne prouve pas l'intégrité de son observation historique.
3. **P1-C — contextes de shards** dans `akarfinder_scraper.py` et `live_canary.py` : contrôle strict de la ville Rabat/Casablanca/Agadir réellement lue sur la carte, et du type `apartment` identifié par le titre. `villa`, `land`, `office`, `shop`, `mixed_ambiguous`, `unknown` et `apartment_probable` ne sont **pas** certifiés sur les shards « appartements ». **Un seul écart** fait échouer tout le shard. Le parser générique historique conserve des arguments optionnels.
4. SHA-256 de l'évaluateur ajouté au bloc de provenance de la preuve canary.

## Tests et contrôle

- `tests/test_v646_partial_batch_atomicity.py` : 3 scénarios synthétiques avec assertion `init_db.assert_not_called()`.
- `tests/test_v646_observation_shard_gates.py` : 11 scénarios synthétiques sur ligne unique, import non-composite, ville/type incongrus, rejet de toute la page, décision de canary, refus SQLite au niveau `main`.
- `tests/test_v646_review_adversarial.py` : fixtures de tests main/canary actualisées pour respecter la ville attendue, sans changer la fixture historique mixte utilisée par les tests du parseur.
- Workflow existant : `.github/workflows/mubawab-v646-offline-tests.yml`, `python -m unittest discover -s tests -v` (GitHub Actions).
- **ÉTAT DE VALIDATION : TESTS AJOUTÉS, EXÉCUTION NON ENCORE PROUVÉE**. Les outils GitHub renvoient zéro run `pull_request` et zéro commit status pour le HEAD interrogé ; ils ne couvrent pas toutes les exécutions `push`. Ne pas écrire « GREEN » sans preuve du run exact.

## Limitations et décision

- Aucune validation live de l'intercepteur réseau actuel ni validation DOM sur une nouvelle page autorisée.
- Les 97 IDs source historiques ne prouvent ni 97 biens physiques distincts, ni activité, ni permission de re-publication.
- Nul GO pour import cloud / production ou 200k ; pas de replay PostgreSQL / Docker.
- **Next exact :** récupérer un run CI de la branche/HEAD de #1172, lire tests + sortie JSON (si vert) ou diagnostiquer (si rouge), joindre le code du HEAD exact à Claude pour réaudit, puis décision sur un pilote sous licence. Pas de Vercel sans autorisation explicite.

## Contre-audit du 06/11/2026 — trois nouvelles P1 traitées après le pack aa87c347

**Origine :** compte rendu du contre-audit remis par le propriétaire : ZIP aa87c347 intègre, 140 PASS/5 SKIP (Chromium absent), **CHANGES REQUIRED / 6 sur 10 provisoire** sur les trois scénarios suivants : (1) noyaux composites de deux cycles acceptés ; (2) carte hors shard éliminée faute de lien/caractéristiques avant contrôle ville/type ; (3) SQLite déjà commitée si une exception survient après `import_listings()`. Ce score décrit **l'ancien HEAD aa87c347**, pas la présente correction.

**GOAL :** clôturer ces trois failles au niveau du pipeline complet, sans collecte live et sans extrapoler aux droits d'exploitation.

**Corrections committées sur Draft #1172** :
- `akarfinder_scraper.py` stocke `last_source_observation_json` pour chaque ID, contenant les champs **d'une seule carte réellement observée**, sans effacer l'historique de la fiche enrichie. `benchmark_evidence.py` compte les `complete_core_*` depuis ce JSON source si le champ SQL existe ; les lignes SQLite héritées sans preuve du cycle sont **inconnues**, donc ne peuvent être qualifiées comme observations complètes. La métrique `source_core_ids_without_observation_proof` les décompte. Les champs historiques enrichis restent descriptifs mais ne prouvent pas un noyau d'observation.
- La vérification ville/type est exécutée **avant** les filtres `missing_detail_link` et `missing_numeric_features` pour toute carte candidate. Les emplacements `emptyBox` et `adBoostBox` sans lien restent explicitement ignorés. Une villa Casablanca dans un shard Rabat, même sans lien ou prix, produit `shard_context_violation` et refuse tout le shard.
- `_main` n'autorise plus de commit intermédiaire : `import_listings`, `persist_price_reviews` et `persist_quality_signals` acceptent `commit=False` ; une transaction SQLite englobe toutes ces écritures et la génération de rapports **en répertoire temporaire**. Toute erreur **avant commit** déclenche `rollback`, `exit 4`, sans nouvelle ligne persistée. Les rapports sont publiés après commit. Si leur publication échoue, `exit 5` signale explicitement « DB commitée, fichiers incomplets » : **il n'existe PAS d'atomicité distribuée DB+filesystem**.

**SUCCESS / PREUVES LOCALES :** nouveau `tests/test_v646_counteraudit_hardening.py` : 7 scénarios adversariaux couvrant deux cycles `exit 0` successifs avec noyau composite non certifié ; provenance SQL manquante ; rollback de créations et modifications + journal après exception ; carte Villa sans lien ni nombres ; erreur d'export avant commit ; sortie distincte après erreur publication. **7/7 PASS**. Suite complète locale hermétique Python 3.13 : **152 tests, 147 PASS, 5 SKIP, zéro FAIL/ERROR**. L'un des 5 SKIP est le test Chromium non exécutable localement ; les quatre autres SKIP étaient déjà présents. Les 3 blobs de code/tests du HEAD ont été vérifiés contre les 3 copies testées localement, avec SHA Git correspondants : `290fe85484f85c18304a94cbce5876c8d81ac00b`, `5ac514e0b8e0047f9873003ff1862fef5d5cb83d`, `9a722e15fc0106fa8cf1e8fde0de7cd4fb6c3e1c`. **Aucune preuve de CI offline positive pour le nouveau HEAD** ; la CI « Efficiency Policy » n'est pas la suite du scraper.

**Limites :** il reste un intervalle non atomique entre commit SQLite et publication des rapports (reconciliation si `exit 5`), migration SQL possible avant la transaction et historique des anciennes observations inconnu sans provenance ; le test Chromium et le contrôle MIME réseau live restent sans preuve. P0/P1 corrigées localement ≠ certification réseau, ni 200k, ni autorisation de republication. Pas de production, merge, collecte ni Vercel.

**Next exact :** obtenir la CI offline sur le **HEAD final** de la PR #1172 ; si verte, préparer un ZIP de code/tests SHA-pinné, faire réauditer indépendamment ces trois P1 et documenter verdict. Si rouge, diagnostiquer la première erreur et corriger. Le droit d'acquisition live est une porte séparée.
