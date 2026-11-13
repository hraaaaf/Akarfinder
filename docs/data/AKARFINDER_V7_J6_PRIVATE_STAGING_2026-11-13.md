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

## J6 — Closeout du sous-lot preuve+PostgreSQL isolé (13 novembre 2026)

**Preuve exacte validée :** code HEAD `746dfc8d3aed1b9d07e79506e6bcfa9b5b0e4612`; [GitHub Actions J6 #43397919469](https://github.com/hraaaaf/Akarfinder/actions/runs/43397919469) **SUCCESS, 23/23 tests** : 10 readiness avec SHA d'inventaire sensible au contenu, 7 vérifications SHA/rejeu V3 incluant la fonction d'orchestration read-only, 6 tests PostgreSQL 17 éphémère. [CI Efficiency Policy #43397919504](https://github.com/hraaaaf/Akarfinder/actions/runs/43397919504) **SUCCESS**.

**Résultat exact :** la fonction `review_with_verified_bytes` combine vérification du HTML + quarantaine sans jamais produire de ligne admissible ni appeler une base. Les tests PostgreSQL montrent une transaction Radar10 en rôle limité dans une base CI et les rejets de permissions/RLS, **non l'exécution d'une admission réelle**. Le registre externe pouvant fournir l'empreinte indépendante n'est pas authentifié ; faux sentiment de certification interdit.

**Sous-lot clos :** architecture et contrôle CI de sécurité du staging isolé **validés sur données synthétiques**. **J6 complet pas clôturé** tant que preuves sources indépendantes, authentification du registre, décision d'admission et gate opérateur ne sont pas implémentés et certifiés. Source fetchs=0, DB externe=0, migration extérieure=0, cron actif=0, Vercel=0, merge=0.

**Passage de relais :** laisser les annonces non vérifiées en quarantaine et poursuivre les tâches de roadmap V7 indépendantes (préparation J7 dry-run sans activation). V7 demeure 2/8 jalons clos, progrès global non certifié.


## J6 — Preuve de capture authentifiée par clé extérieure, sans admission (13/11/2026)

**Goal :** remplacer le simple SHA fourni par le candidat par une enveloppe de provenance cryptographiquement vérifiable **sans** traiter le contenu de l'annonce comme une preuve de sa propre authenticité. Il s'agit d'un sous-lot sécurité déjà prévu par J6, pas d'une nouvelle roadmap.

**Code :** scripts/acquisition/v7_parallel/j6_authenticated_capture.py valide une attestation HMAC-SHA256 à domaine séparé (version de protocole figée), authentifiée par clé 256 bits provenant **d'un canal opérateur extérieur**, identifiée par key_id de configuration de confiance. L'attestation lie domaine source, ID source original, URL originale, SHA du HTML, SHA des octets du manifeste, date UTC de capture, émetteur et fenêtre de validité (émission dans 7 jours, expiration sous 30 jours). Rejet des clés absentes/invalides, MAC falsifié, clé différente, ID/URL/manifeste contradictoire, horodatage futur/périmé, champs de schéma inconnus. Vérifie ensuite les originaux par le validateur J6 existant et rejoue AkarParser V3 et le no-write gate.

**Tests :** scripts/acquisition/__tests__/test_v7_j6_authenticated_capture.py (10 scénarios synthétiques adversariaux), workflow J6 PostgreSQL éphémère étendu ; le SHA de test HMAC est volontairement connu et ne sert **jamais** de clé opérationnelle. La CI du code exact doit être vérifiée avant déclaration de réussite.

**Portée exacte :** seul le contrôle d'authenticité d'une *enveloppe d'origine de capture* est préparé. Un MAC valide atteste la possession de la clé désignée, **pas** la légitimité d'une collecte, la véracité du prix, la géographie réelle, la disponibilité, la fraîcheur ou l'unicité du bien ; l'identité de l'émetteur et la sécurité du canal d'émission doivent être certifiées séparément. Le vérificateur HMAC détient une clé partagée, donc **ne convient pas comme architecture de confiance finale multi-acteurs** sans évaluation de séparation des rôles (signature asymétrique recommandée avant activation). Pas de registre durable, ni politique de rotation/révocation, ni garantie anti-rejeu inter-runners.

**Décision :** l'interface retourne toujours eligible_for_private_staging=false, publication=false et aucune ligne SQL ; elle ne détient aucun accès réseau/DB, n'écrit pas de secret et n'active aucune collecte ni migration. **J6 complet reste OUVERT.** Next exact : CI, revue cryptographique/menaces, provisionnement de clés et signatures opérateur hors dépôt, registre durable anti-rejeu et comparaison de preuves primaires spécifiques à chaque annonce avant tout gate d'admission réelle. Aucune production, merge, cron live ou Vercel.
