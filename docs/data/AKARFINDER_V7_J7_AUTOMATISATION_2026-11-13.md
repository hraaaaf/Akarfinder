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
