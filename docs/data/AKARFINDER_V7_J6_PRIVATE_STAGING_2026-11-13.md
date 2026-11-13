# Akarfinder V7 — J6 readiness (13 novembre 2026)

**GOAL** — Avancer malgré J2/J3/J4/J5 partiellement bloqués, sans créer de migration, secret, ingestion live, ni assertion de validité d'une annonce. Préparer un inventaire **hors ligne** de quarantaine à partir de la vraie structure AkarParser V3 et du validateur Radar10.

**SUCCESS limité** — Un lot synthétique de fiches V3 peut être examiné sans requête source, sans DB, sans promotion; un ID de portail contradictoire, un extrait URL-only, un override de publication ou les trois ID Agenz J3 litigieux restent bloqués. Aucun code de mise en staging n'est appelé.

**CODE** — `scripts/acquisition/v7_parallel/j6_staging_readiness.py` : appel direct au vrai `radar10.ingest.normalize`, déduplication URL/identité, refus de collisions, comptage des motifs sans exposer les URL brutes, SHA de l'inventaire. Son résultat **`eligible_for_private_staging=0` est constant** et intentionnel : aucun canal de preuve/autorisation source fiable n'est raccordé.

**TESTS** — `test_v7_j6_staging_readiness.py` (8 scénarios, dont parsing réel V3), workflow `akar-v7-j6-readiness.yml`. Tests **non encore certifiés** tant que la CI au commit exact n'a pas réussi.

**LIMITES** — Pas de migration SQL, pas de connexion PostgreSQL, pas de test de comportement réel DB sur ce lot, pas de HTML nouvellement acquis, pas d'admission automatique. Le garde-fou J3 n'est pas fusionné : les trois ID conflictuels sont re-déclarés dans le contrat J6 comme quarantaine de sécurité. Le module existant `radar10.ingest.apply_batch` n'est ni modifié ni raccordé ; rien ne peut prétendre être une prévention globale des écritures depuis d'autres chemins.

**DÉCISION** — J6 sous-lot "readiness no-write" réalisable sans attente des sources ; J6 complet (migration + RLS + identité/permissions + staging réel) reste soumis à autre contrôle et autorisation. Pas de déploiement Vercel, merge, cron live ni DB de production.

**NEXT** — Vérifier CI et corriger. Puis étudier un couplage explicite avec les validations d'original HTML SHA+UTC et règles d'origine pour sélectionner une admission **uniquement** après validation humaine/identité DB, puis test PostgreSQL éphémère. En parallèle poursuivre les portails et ne pas promouvoir les URL-only.

## Correctif complémentaire — collision de contenu intra-batch

Le premier commit J6 `2b44c1533bfc3761128ab6f5b1763adcc28bbfaf` a obtenu [CI J6 #43395861642](https://github.com/hraaaaf/Akarfinder/actions/runs/43395861642) **SUCCESS : 8/8 tests**, et [CI Policy #43395861528](https://github.com/hraaaaf/Akarfinder/actions/runs/43395861528) SUCCESS. L'audit a identifié un deuxième cas : même URL et identifiant mais contenu normalisé divergent au sein d'un batch. Ce lot renforce le fail-closed en rejetant cette contradiction plutôt qu'en la comptant comme deux observations. Un neuvième test est ajouté. La nouvelle CI au HEAD corrigé doit être vérifiée avant de qualifier ce correctif.

## Closeout de préparation no-write — 13 novembre 2026

**Code exact :** `2e803311b71ba942c48fb32d77b6e6c978299de5` : [J6 no-write CI #43396093228](https://github.com/hraaaaf/Akarfinder/actions/runs/43396093228) **SUCCESS (9/9 tests PASS)** ; [CI Efficiency Policy #43396093217](https://github.com/hraaaaf/Akarfinder/actions/runs/43396093217) **SUCCESS**. Le test supplémentaire vérifie le rejet d'une même URL avec deux contenus normalisés divergents. En outre, la CI précédente au SHA initial `2b44c1533bfc3761128ab6f5b1763adcc28bbfaf` avait **8/8 PASS**.

**Clôture du sous-lot seulement :** validation de contrat read-only, aucun texte de source publié, aucune migration, zéro appel à `apply_batch` et aucun accès DB ni source. L'éligibilité reste **0** par conception : ce sous-lot ne constitue pas une certification d'alimentation ni une activation du staging. Il est incorrect de comptabiliser J6 parmi les jalons V7 clôturés.

**Suite :** la vraie intégration au staging privé (validateur indépendant de source + autorisation + schéma/RLS + DB isolée), puis la préparation de l'automatisation distribuée, sont des lots distincts, plus risqués. Laisser les travaux J2/J3/J4/J5 quarantainés sans les convertir en annonces fiables.

## J6 — Source byte pin + PostgreSQL réel isolé : preuves du 13 novembre 2026

**Code testé :** commit `df32f1f1ec6026280e30df4e71873cb291914f00` — [GitHub Actions J6 #43397513397](https://github.com/hraaaaf/Akarfinder/actions/runs/43397513397) **SUCCESS**, 22/22 tests (10 readiness + 6 SHA/rejeu V3 + 6 PostgreSQL 17 isolé) ; [GitHub Actions CI Policy #43397513315](https://github.com/hraaaaf/Akarfinder/actions/runs/43397513315) **SUCCESS**. L'instanciation PostgreSQL est `127.0.0.1:5432/akarfinder_v7_j6_ci`, rôle `postgres` de test, deux rôles restreints ; aucune connexion ni écriture à une base extérieure. Les lignes enregistrées dans l'éphémère sont des données synthétiques ; les messages ERROR du serveur DB dans les logs correspondent à des rejets intentionnellement testés (RLS, DELETE refusé, collision de clé).

**Différence d'empreintes vérifiée :** `V3.raw_sha256` porte sur l'enveloppe JSON complète ; `manifest.html_sha256` porte sur le HTML brut. Le contrôle nouveau exige SHA épinglé par un registre **externe au record soumis**, validation du manifeste, cohérence URL/ID, identité d'enveloppe et comparaison des sept champs V3 après replay. Cette fonction ne garantit PAS que le registre de pin ait été authentifié, ne prouve ni la vérité terrain ni la fraîcheur et n'autorise aucune admission.

**Hardening ultérieur :** `review_with_verified_bytes` (dans le module J6) relie le contrôle HTML et l'inventaire quarantine en une fonction sans DB, retourne toujours `eligible_for_private_staging=False`; test ciblé ajouté. Le workflow est renommé pour signaler honnêtement que les tests écrivent seulement dans un PostgreSQL **éphémère CI**, et non « zéro DB write » absolu. Ce code complémentaire nécessite sa propre CI HEAD avant closeout.

**État jalon :** la conception et preuve de sécurité en CI n'autorisent pas une activation du staging privé. Reste nécessaire : registre d'attestations authentifiées, autorisation des sources et identité d'accès, preuve de champs indépendants, mécanisme de promotion explicite, puis gate humain. Maintenir J6 ouvert ; V7 = 2/8 jalons clôturés.
