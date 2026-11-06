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
