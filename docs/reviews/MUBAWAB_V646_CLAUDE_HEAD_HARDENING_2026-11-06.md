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


## Contre-audit indépendant suivant : P1 provenance historique / promotion / publication + P2 exports périmés

**Rapport utilisateur** : version précédente (HEAD \`8c90d4f\`) notée **6,5/10, CHANGES_REQUIRED** ; anciennes lignes SQLite sans colonne de provenance encore prises pour un core source, promotion « Villa Casablanca » sans lien ignorée avant contrôle, publication JSON et Markdown mixtes après erreur, ancien export restant visible après lot refusé. Ce score est celui de l'ancien HEAD, pas du nouveau.

**Goal / Success / Proof** :
- **Provenance (P1)** : \`benchmark_evidence.evaluate(rows, source_rows=False)\` est désormais obligatoire pour un audit SQLite. Le chemin \`inspect_sqlite()\` le force, même si la base historique ne contient pas la colonne \`last_source_observation_json\`. Les métriques source-core restent à zéro sans preuve d'observation, sans supprimer les champs historiques descriptifs. Fixture V645 sans colonne : un core enrichi apparent, **0 source-core certifié**, **1 provenance inconnue**.
- **Shards (P1)** : toute promotion comportant un titre/type/ville explicite contradictoire est inspectée **avant** le filtre \`adBoostBox\` sans lien. Les titres de promotions \`h2/h3\` explicitement typés (villa/bureau/terrain/appartement…) peuvent déclencher un rejet fail-closed ; une promotion générique vide reste ignorable. Deux tests synthétiques de type villa, avec \`listingTit\` ou \`h3\`, plus une promotion neutre admise.
- **Publication (P1/P2)** : chaque appel à \`main()\` publie atomiquement **un marqueur d'état** \`akarfinder_publication.json\` avec un nouveau \`run_id\` et \`running\`. Une erreur laisse \`failed\` ; seul un cycle complet sans erreur écrit \`complete\` avec SHA-256 des **six exports + SQLite**. Le nouveau lecteur \`verify_v646_publication.py\` vérifie intégralement le marqueur et les sept fichiers et retourne exit 0 seulement sur \`valid:true\`. Toute modification, mélange JSON/MD, arrêt code 5 ou échec du lot invalide le marqueur. Les anciens fichiers peuvent rester physiquement présents mais sont **non consommables** par les lecteurs respectant ce contrat. \`README.md\` documente cette obligation ; n'affirmez jamais une transaction ACID SQLite+filesystem.

**Preuve locale hors ligne** : dix nouveaux tests dans \`tests/test_v646_round3_provenance_publication.py\` : base V645 sans provenance, mode source explicite, promotions contradictoires, promotion neutre, succès avec marqueur complet, corruption d'export, publication partielle avec code 5, ancien lot devenu périmé après erreur, absence de manifeste. **10/10 PASS**. Suite complète locale \`162 tests\` : **157 PASS, 5 SKIP, 0 FAIL/ERROR** (le test Chromium sans binaire est l'un des cinq SKIP). Toutes les nouvelles requêtes sont synthétiques ; pas d'interrogation de Mubawab, pas de base cloud.

**Traçabilité de commit** : modifications de \`akarfinder_scraper.py\`, \`benchmark_evidence.py\`, \`README.md\`, ajout \`verify_v646_publication.py\` et \`tests/test_v646_round3_provenance_publication.py\`, comparées par blobs Git aux versions locales ayant passé les tests. La CI « Efficiency Policy » SUCCESS ne valide pas les tests V646 ; obtenir la CI offline sur le nouveau HEAD avant toute clôture.

**Limites résiduelles et NO-GO** : ce marqueur établit une **cohérence vérifiable si le lecteur appelle le vérificateur**, sans empêcher un programme non conforme de lire un fichier de tête incohérent. Un échec du système de fichiers empêchant d'écrire le marqueur peut exiger un traitement manuel. Aucune certification de réseau MIME/Chromium live, fraîcheur d'annonce, autorisation de collecte, unicité physique, ou réutilisation commerciale. Aucune production, merge, ni Vercel.
