# Akarfinder V7 — J7 : contrat d'automatisation 10 minutes (13 novembre 2026)

**GOAL :** faire avancer J7 malgré les admissions sources et DB non certifiées, sans ouvrir de cron live ni contourner J6. Contrat de créneau UTC 600 secondes et idempotence hors ligne.

**Architecture :** `scripts/acquisition/v7_parallel/j7_ten_minute_contract.py` construit une intention déterministe par créneau UTC, identifiant `AKARFINDER_V7_10M:<slot_index>`, début de créneau et fin exclusive. Les déclenchements en retard conservent leur créneau UTC observé. Un événement de type `schedule` ne déclenche **jamais** la collecte et n'autorise aucune DB.

**Tests :** `test_v7_j7_ten_minute_contract.py` vérifie les limites dix minutes, fuseaux, changement de jour, refus d'horloge naïve, impossibilité d'activer le LIVE, et concurrence simulée dans un fichier SQLite temporaire. Le harness SQLite est **uniquement un simulateur de contrainte UNIQUE/transaction locale**. Il n'est pas un registre durable partagé entre des runners GitHub Actions. Une reprise après panne reste désactivée, sans tentative automatique de rerun du même créneau.

**Workflow :** `.github/workflows/akar-v7-j7-offline.yml` fonctionne uniquement sur `pull_request` avec `contents: read`, sans clause `schedule`, sans secret, sans URL source, sans service DB ni Vercel. Le cron déjà déclaré dans PR #1204 reste un état de diagnostic désactivé, non une ingestion V7.

**NO-GO live jusqu'à :** registre d'atomicité distribué réellement durable (contrainte UNIQUE avec fencing/gestion de crash), qualification d'au moins un connecteur source et admission privée J6, autorisation opérateur explicite, vérifications robustes sous retards/doubles appels GitHub Actions. Le scheduler GitHub ne garantit ni déclenchement exact toutes les dix minutes ni disponibilité d'un créneau.

**SUCCESS limité :** intention pure et simulation robuste PASS en CI à HEAD exact. Aucune affirmation d'exécution continue, de source collectée ou d'annonce ajoutée. J7 complet restera ouvert.

**NEXT :** valider CI, documenter preuve, puis concevoir un registre partagé authentifié externe aux GitHub runners, toujours sans activer la collecte.

## Closeout J7 — simulation des créneaux et registre atomique éphémère

**Code SHA `4c5eeca2935dbc43564682e3b6559b580dcf2a87` :** [GitHub Actions J7 #43399007468](https://github.com/hraaaaf/Akarfinder/actions/runs/43399007468) **SUCCESS 17/17 tests** (9 slot/temps/SQLite simulation + 8 PostgreSQL 17 éphémère), et [CI Policy #43399007243](https://github.com/hraaaaf/Akarfinder/actions/runs/43399007243) **SUCCESS**. Première version code SHA `3c937193e4224c64d8473e96da2b54a1f25b3f8e` : [run #43398618102](https://github.com/hraaaaf/Akarfinder/actions/runs/43398618102) 9/9 PASS.

**Design technique éprouvé en CI exclusivement :** `j7_ephemeral_ledger.sql` crée la table de claims à clé `slot_index` UNIQUE et trois fonctions SQL fermées : claim/finish/fail. Compétition simultanée de deux connexions et deux jetons UUID : un seul claim gagne ; le jeton étranger ne peut terminer ; un créneau marqué failed ou abandonné ne se réattribue pas automatiquement. Le rôle `v7_schedule_worker` NOLOGIN dispose seulement d'EXECUTE sur les fonctions, sans SELECT/DELETE sur les tables ; rôle observateur sans droit. Aucun contournement des privilèges constaté dans la fixture.

**Limites de sécurité à respecter :** ce schéma SQL est un **projet non déployé**, utilisé avec PostgreSQL sous GitHub CI, sur `127.0.0.1/akarfinder_v7_j7_ci`. Le SECURITY DEFINER est propriétaire de l'utilisateur `postgres` **superuser en CI uniquement** : avant toute migration réelle, il faudra un propriétaire dédié non-superuser, audit du `search_path`, tests de permissions et une politique de fencing des éventuels effets externes. L'absence de retry évite le doublon mais peut laisser une fenêtre perdue après crash ; aucun mécanisme de replay automatique n'est validé. Le schéma n'est raccordé ni aux sources V7 ni à un cron.

**Closeout du seul sous-lot :** clé 10 min UTC + preuve de collision au niveau DB isolée validées. **J7 complet reste NON clôturé** ; ni cron réel activé, ni cadence mesurée, ni rendement de collecte démontré. J6 admission privée n'est pas non plus clôturée. V7 toujours 2/8 jalons clos (pas 25 % du travail total).

**Next exact :** choix d'un stockage durable partagé au périmètre Akarfinder, owner/migration non-superuser et test d'identité externe, avant tout déploiement du registre ; qualification réelle d'au moins une source J2–J5 ; gate humain sur calendrier et collecte. Tant que ces preuves n'existent pas, poursuivre les travaux de qualification hors ligne sans activer le live.


## J7 — Isolation propriétaire SQL et marqueur sous fencing en CI (13 novembre 2026)

**GOAL :** fermer deux faiblesses concrètes de la proposition précédente, sans prétendre avoir un registre de production partagé : fonctions SECURITY DEFINER appartenant au superuser PostgreSQL CI et absence de primitive d'écriture conditionnée par un claim actif.

**CODE :** j7_ephemeral_ledger.sql crée désormais un rôle v7_schedule_owner NOLOGIN/NOSUPERUSER/NOBYPASSRLS, lui transfère la propriété du schéma/tables/fonctions et force RLS avec politiques explicites pour ce propriétaire. Les rôles worker/observer restent sans accès direct aux tables. La nouvelle table fenced_markers (slot_index + marker_name unique, evidence_sha256 obligatoire) n'enregistre que des marqueurs transactionnels, jamais des données de bien. La fonction SECURITY DEFINER record_fenced_marker prend un jeton UUID exact, verrouille le créneau revendiqué via SELECT ... FOR UPDATE et refuse un jeton étranger, un créneau terminé, un doublon et des données invalides. Tous les chemins de code V7 actuels restent déconnectés de ce contrat.

**TESTS AJOUTÉS :** (1) marqueur accepté seulement pendant un claim actif au token correct, (2) valeurs invalides et créneaux inexistants refusés, (3) rôle propriétaire non-superuser et RLS forcé sur les deux tables, (4) worker/observateur sans accès direct ni exécution non autorisée. Ces quatre scénarios complètent les huit tests PostgreSQL existants ; CI GitHub PostgreSQL 17 éphémère uniquement, aucune migration réelle.

**LIMITES :** cette barrière protège l'enregistrement d'un marqueur dans la même DB transactionnelle ; elle ne garantit **pas** le fencing d'effets externes (requête HTTP/source, écriture dans une autre DB, side effect), ni la reprise automatique après crash. Le ledger de CI ne persiste pas entre runs ; les clés, la séparation de l'émetteur, le registre J6 et l'admission des vrais biens ne sont pas raccordés. Exiger un audit de sécurité de la migration réelle, puis un opérateur GO séparé pour DB/cron. J7 reste ouvert.

**Preuve à vérifier** : SQL code SHA 988d5fa6c70796de89ff49f9141eecc4bcbec479 ; tests code SHA 8450a27a5aca7fc69a92b9a107fa1325521c7b30. Ne pas déclarer PASS sans logs GitHub au SHA exact. Aucun merge, import, activation, secrets, Vercel.

## Clôture CI propriétaire non-superuser et marqueur J7 — 13/11/2026

**Code corrigé SHA :** 55f349e231085d0f8d214f2c436eb1c3a29656c6. [J7 PostgreSQL 17 CI #43463575848](https://github.com/hraaaaf/Akarfinder/actions/runs/43463575848) **COMPLETED SUCCESS : 21/21 tests** (9 tests UTC/SQLite, 12 tests PostgreSQL 17, dont 4 nouveaux de token/fencing/permissions/ownership), [policy #43463575793](https://github.com/hraaaaf/Akarfinder/actions/runs/43463575793) SUCCESS. Tous les tests SQL utilisent exclusivement la DB éphémère localhost/akarfinder_v7_j7_ci.

**Débogage traçable :** premier run [#43462772218](https://github.com/hraaaaf/Akarfinder/actions/runs/43462772218) FAILED : dollar-quoting et regex SQL corrompus lors de l'assemblage du patch ; second [#43463294729](https://github.com/hraaaaf/Akarfinder/actions/runs/43463294729) FAILED sur ambiguïté PL/pgSQL marker_name dans ON CONFLICT (11/12 tests PG déjà verts). Correctifs successifs puis run final vert.

**Sous-lot clos :** SECURITY DEFINER appartient au rôle NOLOGIN non-superuser avec FORCE RLS explicite ; worker et observateur n'ont aucune permission de table directe ; marqueur UNIQUE attesté **dans la transaction DB** seulement pour le token actif et avant finish/fail. Ne pas confondre avec un fencing d'effet externe, ni une reprise durable de runners. **J7 complet ouvert** : pas de DB partagée durable, aucun cron live, aucune source admissible, aucun observabilité 24h, aucune approbation d'activation/merge/Vercel. V7 = 2/8 jalons clos.



## 13/11/2026 — Audit sécurité High : réservation de créneaux UTC bornée et claims expirés (CI en cours)

GOAL : éliminer deux abus potentiels du worker disposant de EXECUTE sur le registre de créneaux : la réservation permanente d'un créneau arbitrairement futur/ancien, et l'utilisation d'un token de claim encore marqué « claimed » longtemps après la mort d'un runner.

CODE SQL (toujours PostgreSQL17 EPHEMERE CI) : j7_ephemeral_ledger.sql / v7_schedule.claim_slot vérifie désormais l'horloge de la BASE (floor(epoch/600)) ; il ne permet QUE le créneau UTC courant ou les deux créneaux précédents. Les créneaux du futur et les créneaux vieux de plus de deux périodes sont refusés ; aucune ré-attribution d'un créneau déjà réclamé. finish_slot, fail_slot et record_fenced_marker refusent un claim vieux de plus de 30 minutes, même si le UUID du token correspond. Les quatre fonctions SECURITY DEFINER ont search_path pg_catalog, v7_schedule, pg_temp, explicitement pg_temp en dernier. Le rôle worker demeure sans privilèges tables et la fonctionnalité n'est reliée à aucun crawler live.

ADVERSARIAL TESTS : test_v7_j7_postgres_ledger.py se fonde sur l'horloge serveur PostgreSQL pour calculer son créneau réel (plus de fixture 09:03 codée en dur) ; nouveaux tests refus future/old claims, rejet de tokens stale dans la même base, inspection effective de proconfig pour les quatre fonctions. Les preuves historiques 21/21 de la version antérieure restent distinctes ; nouveau SHA code/test 886da0e7db95138df07525c90c4eebf5aef7997b, [J7 CI #43530915708](https://github.com/hraaaaf/Akarfinder/actions/runs/43530915708), [policy #43530915732](https://github.com/hraaaaf/Akarfinder/actions/runs/43530915732) QUEUED au premier contrôle. NE PAS déclarer 24/24 PASS sans CI terminale.

LIMITES / ARBITRAGE : un job arrivé à plus de 20 minutes de retard ne peut plus réclamer son ancien slot : perte de collecte délibérément préférée aux claims vieux non contrôlés. Une exécution >30 minutes ne peut plus enregistrer une preuve ; le run 10 minutes est par ailleurs supposé avoir timeout 9 minutes en CI. Cela n'est PAS une garantie d'exactitude de cadence GitHub, de fencing de side effects réseau ou d'authentification de véritable opérateur. Aucun cron live ou registre durable n'a été activé, aucun merge ni DB extérieure. J7 métier OUVERT.

## 14/11/2026 — Closeout CI du durcissement High J7

**Goal :** empêcher les créneaux arbitraires et tokens zombies dans la proposition de ledger PostgreSQL local sans activation de cadence.

**SUCCESS vérifié au HEAD exact** `3f6281efdbb7be2f3338fb2b18f41de01c6565c8` de [PR Draft #1210](https://github.com/hraaaaf/Akarfinder/pull/1210) : [J7 #43531236057](https://github.com/hraaaaf/Akarfinder/actions/runs/43531236057) **COMPLETED SUCCESS, 24/24 tests** (9 intention UTC/SQLite offline, **15 PostgreSQL17 éphémères**, dont les trois nouveaux cas : future/old slot, claim expiré, pg_temp en dernier). [Policy #43531236041](https://github.com/hraaaaf/Akarfinder/actions/runs/43531236041) **COMPLETED SUCCESS**.

**Portée :** le bornage s'appuie sur le temps du serveur DB, refuse futur/plus de 2 créneaux anciens et empêche les preuves/finish/fail d'un claim de plus de 30 min. Aucune garantie d'exactitude temporelle des runners ou de fencing des effets externes. DB PostgreSQL CI seulement, aucun cron source live, merge ni Vercel. **Sous-lot High J7 clos techniquement, J7 métier OUVERT** tant qu'absence de registre durable partagé, source J6 autorisée et GO opérateur.

**Next :** tester continuité du registre partagé réel et les retards/crash/effets externes avec gate d'activation séparé.

## 14/11/2026 — Voie parallèle J7 : acceptance gate de l'ordonnanceur durable (sans cron live)

**GOAL observable :** exécuter au maximum une décision de traitement par créneau UTC de 600 secondes, même avec plusieurs runners GitHub, redémarrage ou retard, sans écriture externe doublonnée.

**Invariants existants, contrôlés en CI sur la PR #1210 :** [run #43536731249](https://github.com/hraaaaf/Akarfinder/actions/runs/43536731249) SUCCESS, 24/24 tests offline/PG17 ; clé unique `slot_index`, jeton de claim UUID, limitation serveur aux créneaux courant/2 précédents, refus de tokens âgés de plus de 30 minutes, fonctions SECURITY DEFINER en rôles limités et pg_temp dernier. Le ledger en CI est **éphémère** et n'est ni un vrai ordonnanceur ni un fencing des effets externes.

**Design minimal fiable avant activation :**
1. Un seul stockage PostgreSQL **durable et partagé** accessible à tous les workers d'un environnement défini ; schéma J7 versionné et migration réversible validée sur staging isolé, jamais sur prod par défaut.
2. Définir `run_id`/source/slot et l'ID d'idempotence à la destination : réserver un slot ne garantit PAS les effets HTTP, message ou écriture dans une autre DB. Tant que la destination ne déduplique pas la mutation elle-même, **ne pas raccorder un crawler source**.
3. Conserver la politique **pas de takeover d'un slot déjà revendiqué**, même après crash ; un créneau perdu est préférable à une ingestion doublée. Établir un tableau de bord « missed/delayed/failed/completed » indépendant des succès de GitHub.
4. Configurer cron actif uniquement après J6 et sources qualifiées ; canary en mode zéro effet extérieur d'abord, puis tests 24 h de slots consécutifs, arrêt/rollback prouvé. L'absence de garantie GitHub d'exactitude à la minute interdit de promettre exactement six exécutions par heure.

**SUCCESS/PREUVE AVANT GO LIVE :** test deux runners concurrents -> 1 claim ; crash après claim -> 0 second claim ; retard >20 min -> refus ; UUID expiré -> 0 marker ; aucune fuite table/roles ; restauration du ledger/rollback testées ; idempotence prouvée au point réel d'écriture ; mesures de fréquence réelles ; identité et source J6 approuvées. **Aucun de ces prérequis réels n'est encore validé.**

**NEXT J7 :** migration seulement sur DB d'essai explicitement autorisée puis simulation multi-runners sans requête source. Aucune activation schedule/crawler, merge, Vercel. **J7 métier ouvert.**

## 14/11/2026 — Parallel High J7 outbox intentionnel : 28/28 CI PASS

**GOAL :** réduire le risque de mutations externes dupliquées sans prétendre les avoir résolues de bout en bout. Nouveau schéma/table `v7_schedule.private_review_outbox` dans la base PostgreSQL17 **éphémère CI seulement**, channel strictement symbolique `private_review_only` (jamais URL/endpoint), dispatch_key déterministe `v7-j7-slot:<slot>:private-review` unique, FOREIGN KEY sur slot et FORCE RLS. Fonction SECURITY DEFINER `enqueue_private_review_intent` : vérification UUID worker, claim actif et non âgé de plus de 30 min, verrou sur la ligne du créneau, INSERT idempotent (conflit = false). Aucun consumer, aucun HTTP, aucune clé privée, aucun cron, aucune DB réelle, aucune écriture staging.

**Preuve GitHub vérifiée sur le SHA code `85f7758f1c4ef5d118f25c168ecd85a6ce97d92a` :** [J7 CI #43579828171](https://github.com/hraaaaf/Akarfinder/actions/runs/43579828171) **COMPLETED SUCCESS, 28/28 tests** (9 intention UTC offline + **19 tests PG17**, dont 4 tests outbox : unique, collision, token erroné/expiré/terminé, privilèges/RLS). [CI Policy #43579828204](https://github.com/hraaaaf/Akarfinder/actions/runs/43579828204) SUCCESS. Un premier commit SQL avait une **erreur de génération du remplacement de chaîne** ($ dans la regex/quoting) ; [CI #43579692990](https://github.com/hraaaaf/Akarfinder/actions/runs/43579692990) FAILURE en setUpClass. Restauré sur la version SQL précédente et réinjecté sans substitution spéciale ; CI finale verte. Ne pas effacer l'historique du premier échec.

**Limite majeure :** même avec cet outbox, aucun émetteur externe n'a été idempotent-vérifié. Une outbox unique en base ne garantit pas une livraison externe exactement une fois : l'aval doit honorer `dispatch_key` en écriture atomique, et le mécanisme de reprise/crash doit être testé. **J7 métier ouvert**, schéma durable/cron live/staging toujours soumis à GO séparé.
