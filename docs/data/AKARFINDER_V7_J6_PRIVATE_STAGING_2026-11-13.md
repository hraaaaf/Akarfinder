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

## Clôture CI du protocole d'attestation J6 — 13/11/2026

**Code/test/workflow SHA :** 8691487e7ae7840bf2d1dddddde58cb61b326e60 ; **HEAD documentaire testé :** 5446a03672ff1fdd350405238f7c79afdb7c1639. [J6 CI #43461891564](https://github.com/hraaaaf/Akarfinder/actions/runs/43461891564) **COMPLETED SUCCESS : 33/33 tests** (10 readiness + 7 original HTML/replay + 10 attestation HMAC adverse + 6 PostgreSQL 17 éphémère) ; [CI policy #43461891578](https://github.com/hraaaaf/Akarfinder/actions/runs/43461891578) SUCCESS. Le premier run #43461619809 CANCELLED par un commit suivant n'est pas comptabilisé. Aucune capture originale nouvelle, aucune clé opérationnelle, aucun appel réseau source ni DB extérieure.

**Sous-lot clos :** vérificateur d'enveloppe HMAC à clé de confiance externe, comparaison exacte manifest/HTML/URL/ID/time, échec fermé sur falsifications ; synthétique seulement. **J6 complet ouvert** : processus d'émission indépendant, signature asymétrique à étudier, gestion/revocation de clés, registre partagé durable, preuve d'annonce fiable et gate opérateur. Zéro staging/admission/cron/merge/Vercel.



## 13/11/2026 — J6 : Sarouty désormais accepté par le validateur de provenance, jamais par le staging

**GOAL** : rendre utilisable à J6 le premier original Sarouty obtenu en J4 (référence #894012), sans réduire les contrôles originaux exigés. Le validateur J6 ne reconnaissait jusque-là que Agenz et Mubawab via canonical_identity ; la capture Sarouty était structurellement rejetée même si ses octets étaient vérifiés.

**CODE** : scripts/acquisition/v7_parallel/j6_source_evidence.py introduit _listing_identity(url) : Agenz/Mubawab gardent leur validateur strict existant ; Sarouty passe par le **vrai adaptateur L8 J4** (_real_l8_identity), et doit présenter identité exacte portail/ID/URL et les statuts URL-only sans admission. Pour Sarouty, le HTML source doit contenir link rel=canonical dans HEAD conforme à l'URL candidate et un og:url conforme s'il est présent ; incohérence ou métadonnée absente = fail-closed. Le validateur HMAC j6_authenticated_capture.py réutilise cette identité commune, puis vérifie le SHA du manifeste, le SHA de l'HTML et rejoue réellement AkarParser V3.

**CI exacte** : code+tests+workflow SHA **5368c17280d3dfcaa7e1e74e3c0d4db2d3d76d99**, [J6 PostgreSQL 17 #43519866510](https://github.com/hraaaaf/Akarfinder/actions/runs/43519866510) COMPLETED SUCCESS : **40/40 tests** (10 readiness, 7 HTML provenance, 10 MAC, **7 nouveaux tests Sarouty**, 6 PostgreSQL 17). [CI Policy #43519866494](https://github.com/hraaaaf/Akarfinder/actions/runs/43519866494) SUCCESS. Tests Sarouty sur **fixtures synthétiques uniquement**, aucune vraie clé opérateur dans le dépôt, aucun GET portal, DB réelle, staging, cron ou Vercel.

**Limites importantes** : ceci démontre que le protocole sait accepter un original Sarouty avec signature correcte, pas que la vraie archive privée #894012 est déjà signée par un émetteur certifié. Le JSON-LD géographique Sarouty demeure contradictoire (coordonnées à >250 km de Salé), et le champ district des parseurs reste nul. **Aucune localisation, disponibilité, droit d'usage ni propriété physique n'est certifié ; admission=0**.

**Prochaine gate J6** : provisionnement d'une clé/identité d'émission hors dépôt, attestation authentifiée et horodatée reliée aux octets originaux déjà archivés, registre durable de révocation/anti-rejeu et contrôles métier indépendants avant décision humaine. J6 métier OUVERT, J0/J1 seuls clos (V7 2/8). Aucun merge/DB source/cron/Vercel.



## 13/11/2026 — J6 : registre de confiance opérateur épinglé + reçu unique en PostgreSQL isolé

**GOAL** : corriger deux limites du vérificateur d'attestation initial, sans ouvrir une quelconque admission : (1) correspondance stricte émetteur / clé HMAC / portail avec révocation, (2) progression monotone de version du registre et unicité transactionnelle d'un reçu entre workers concurrents.

**Politique hors ligne J6 :** fichier scripts/acquisition/v7_parallel/j6_issuer_policy.py ; registre JSON public borné 16 KiB / 32 émetteurs, génération positive, key_id, issuer, périmètre limité à agenz.ma / mubawab.ma / sarouty.ma, état active/revoked et fenêtre de clé de 90 jours maximum. SHA256 du registre pris dans une **référence opérateur hors de la pièce vérifiée**, clés secrètes HMAC prises dans un deuxième canal opérateur (aucune dans Git). Rejet des clés inconnues ou révoquées, des portails usurpés, de la modification du nom de l'émetteur même avec MAC valide, des dates incompatibles, entrées JSON en double, SHA falsifié ou détails V3 incohérents. Ne prétend pas vérifier indépendamment l'identité de l'opérateur ou la vérité immobilière. Résultat toujours public_admission_authorized=false, eligible_for_private_staging=false.

**Preuve CI du premier sous-lot** : code/test/workflow SHA bbb75b79f223efcd875c30e94d853ac45a2598ba. [J6 run #43526814383](https://github.com/hraaaaf/Akarfinder/actions/runs/43526814383) **COMPLETED SUCCESS 54/54** (40 tests préexistants + 14 nouveaux de politique/clé/révocation), [policy #43526814339](https://github.com/hraaaaf/Akarfinder/actions/runs/43526814339) SUCCESS. Clefs des fixtures entièrement connues et SYNTHÉTIQUES.

**Verrou DB en CI éphémère uniquement** : fichier scripts/acquisition/v7_parallel/j6_ephemeral_receipt_ledger.sql ; schéma v7_capture.policy_head (contrainte singleton ; compare-and-swap generation n→n+1, SHA256 du registre) et v7_capture.capture_receipts (unicité MAC et source/offer/HTML SHA). Trois rôles NOLOGIN / NOSUPERUSER / NOBYPASSRLS : propriétaire v7_capture_owner, v7_capture_operator seul autorisé à avancer la génération, v7_capture_reviewer seul autorisé à inscrire un reçu. FORCE RLS, SECURITY DEFINER propriété dédiée non-superuser, fonctions EXECUTE restreintes, aucun accès SELECT/DELETE direct des deux acteurs. Les 10 tests supplémentaires utilisent UNIQUEMENT le serveur PostgreSQL 17 de GitHub Actions : 127.0.0.1/akarfinder_v7_j6_ci ; testent collisions concurrentes, doublons, version obsolète, périmètre, rôles, RLS et absence de table immobilière de production.

**Preuve CI finale** : SHA code/test/workflow c517ab2c2c61e63dd86753c8b2616a174038c51b. [J6 run #43527314427](https://github.com/hraaaaf/Akarfinder/actions/runs/43527314427) **COMPLETED SUCCESS : 64/64 tests** = 10 readiness + 7 HTML + 10 HMAC + 7 Sarouty + 14 registre opérateur + 6 PostgreSQL initial + 10 nouveaux PostgreSQL anti-rejeu. [Policy #43527314346](https://github.com/hraaaaf/Akarfinder/actions/runs/43527314346) SUCCESS. Pas de migration vers base réelle.

**LIMITES / NO-GO** : empreinte de registre fournie par opérateur externe seulement si authentifiée indépendamment ; une version antérieure pourrait être réintroduite si un système externe recharge une vieille base : la progression n'est prouvée que dans la même base de CI. Le reçu SQL ne contrôle PAS la vraie MAC, les droits sur la source, la géographie, la fraîcheur, la séparation de l'opérateur ou un effet externe ; il doit être appelé par un vérificateur déjà autorisé et reste un marqueur de revue, non un permis de publication. Pas de connexion aux sources, DB extérieure, staging, cron live, merge ou Vercel. Le registre durable réel, les clés de production, le provisionnement opérateur, la vérification de provenance et le gate humain restent à construire sous autorisation distincte.

**STATUT** : deux sous-lots supplémentaires J6 techniquement validés en CI ; **J6 métier OUVERT**, V7 seuls J0/J1 clôturés = **2/8 jalons**. NEXT exact : confirmer CI au HEAD documentaire, mettre à jour la roadmap mère et Notion, puis exiger un opérateur/registre partagé réellement provisionné avant toute décision de raccordement à J7 ou admission réelle.



### J6 — Chaînage concret du reçu après preuve cryptographique (13/11/2026)

**Ce qui change :** le retour de review_with_operator_issuer_policy contient désormais un objet review_receipt_intent avec six arguments bornés pour la fonction SQL de reçu (registry_generation, registry_sha256, attestation_mac_sha256, source_domain, source_offer_id, html_sha256). Il n'est produit **qu'après** que la politique opérateur épinglée, la MAC HMAC, le manifeste d'original HTML, l'identité source et les sept champs du vrai AkarParser V3 ont passé leurs contrôles. L'interface **n'appelle aucune DB** ; ce n'est ni une autorisation de SQL automatique ni une admission d'annonce.

**Test d'intégration additionnel :** test_v7_j6_ephemeral_receipts.py crée une fixture source synthétique originale, une politique et clé HMAC de test (non secrètes), exécute le vrai chemin de validation J6, extrait ce seul reçu, enregistre la version de registre dans PostgreSQL 17 éphémère et vérifie la première réservation acceptée puis le doublon refusé. Test lié au code SHA f3f8fcca8880ef3c24c3aa348b55de6b8dade180 ; [CI #43527970158](https://github.com/hraaaaf/Akarfinder/actions/runs/43527970158) et [policy #43527970146](https://github.com/hraaaaf/Akarfinder/actions/runs/43527970146) EN COURS au premier contrôle ; ne pas annoncer PASS avant lecture de leur résultat. Les 64/64 tests de la précédente CI #43527314427 restent prouvés.

**Limites inchangées :** fixture synthétique seulement ; registre partagé réellement durable et credentials opérateur non provisionnés, clé symétrique non identitaire, source externe non certifiée, registre SQL non déployé, aucun effet externe fencing, aucune donnée staging/production. V7 reste 2/8 jalons métier clos, J6 ouvert.



## 13/11/2026 — Audit HIGH J6 : Ed25519 indépendant + défense SQL (validation CI en cours)

**GOAL** : supprimer, pour la FUTURE voie multi-acteurs, la faiblesse structurelle de l'attestation HMAC symétrique (un vérificateur possédant la clé peut également se faire passer pour l'émetteur), sans autoriser admission ni collecte. La voie HMAC v1 reste en quarantaine ; aucun protocole n'est automatiquement promu.

**CODE ASYMÉTRIQUE :** scripts/acquisition/v7_parallel/j6_ed25519_capture.py. Nouveau format séparé akar-v7-j6-ed25519-capture-v1, avec clé PUBLIQUE 32 octets et signature 64 octets Ed25519 (RFC8032). Le registre public de clés est borné 16KiB/32 émetteurs, entièrement épinglé par un SHA256 provenant du canal opérateur extérieur et non de la source, et rejette duplications de champs, réutilisation de clé sous deux identifiants, algorithme substitué, portée portail hors liste, clé révoquée ou expirée et fenêtre de validité dépassant 90 jours. La signature porte sur 12 champs textuels encodés en UTF-8 strict avec cadrage binaire TLV longueur uint32 (domaine cryptographique dédié) : ce format n'est PAS un RFC8785 JCS et nécessitera interopérabilité SDK émetteur testée. Les originaux HTML, URL/ID, manifeste exact, SHA, UTC et vrai replay AkarParser V3 restent indispensables. L'absence de signature, les substitutions de SHA, domaine, URL, algorithme et nom d'émetteur doivent être refusées.

**SÉPARATION DES SECRETS :** aucun service de génération de clés privées dans le module, aucune clé opérateur dans GitHub ou Notion. Les signatures de tests sont créées avec une clé de fixture PUBLIQUEMENT CONNUE. Ed25519 NE PRODUIT PAS review_receipt_intent pour le schéma HMAC v1 (attestation_mac_sha256) afin de prévenir un contournement de protocole ; un ledger v2 séparé avec proof_algorithm/signature_sha256 sera requis avant enregistrement de signatures Ed25519. L'interface renvoie toujours eligible_for_private_staging=false, public_admission_authorized=false, database_writes=0, source_http_requests=0.

**TESTS :** 19 cas adversariaux, dont un test obligatoire de vrai AkarParser V3 + HTML/manifeste (aucun skip autorisé en CI). 18 contrôles crypto/registrar validés en local, test d'intégration repo non exécutable localement. CI GitHub installant cryptography==50.0.2, code HEAD 5758ea3829881baffe4f46e4b6bebb067d2974d4, [CI J6 #43531157104](https://github.com/hraaaaf/Akarfinder/actions/runs/43531157104) et [Policy #43531156818](https://github.com/hraaaaf/Akarfinder/actions/runs/43531156818) initialement QUEUED : ne pas annoncer succès avant les logs réels de ce HEAD.

**HARDENING SQL** : les deux fonctions SECURITY DEFINER du registre J6 isolé ont maintenant search_path pg_catalog, v7_capture, pg_temp (temp en dernier), vérifié par proconfig en tests. Cela respecte la recommandation PostgreSQL17 de limiter les schémas susceptibles d'être masqués. Aucun changement de privilège réel n'est appliqué.

**PLAN / GATES** : voir docs/data/AKARFINDER_V7_J6_J7_TRUST_AUDIT_2026-11-13.md, modèle de menaces inclus dans la PR J6. GO prod exige identité et clé privée de l'émetteur hors système, preuve et rotation d'inscription par opérateur indépendant, registre durable partagé protégé contre rollback/replay et schéma v2 de reçus Ed25519 distinct, géographie/champs commerciaux indépendants, décision humaine, tests PG sur base de préproduction puis activation autorisée. J6 métier OUVERT ; V7 J0/J1 seuls clos 2/8. Aucun merge, migration DB réelle, cron live ou Vercel.

## 14/11/2026 — Closeout CI du durcissement High J6

**Goal :** ajouter une vérification de source Ed25519 séparée de HMAC, conserver les refus d'admission et durcir le search_path SECURITY DEFINER.

**SUCCESS vérifié au HEAD exact** `208d7c6c4cb749fc92b6cf8f1fc11d91e6773ac5` de [PR Draft #1209](https://github.com/hraaaaf/Akarfinder/pull/1209) : [CI J6 #43531521681](https://github.com/hraaaaf/Akarfinder/actions/runs/43531521681) **COMPLETED SUCCESS** ; **84/84 tests** (10 readiness, 7 original HTML, 10 HMAC, 7 Sarouty, 14 politique opérateur, 6 PostgreSQL initial, **19 Ed25519** et 11 reçus PostgreSQL). [Policy #43531521782](https://github.com/hraaaaf/Akarfinder/actions/runs/43531521782) **COMPLETED SUCCESS**. Le test source/V3 réel Ed25519 figure dans les 19 cas, et le job Ed25519 a conclu SUCCESS.

**Portée stricte :** signatures et clé privées synthétiques seulement. La validation de clé publique ne constitue pas une identification externe de l'émetteur, une qualification physique/geo du bien ou une autorisation de collecter. Aucun changement de DB réelle, cron, promotion, merge ni Vercel. **Sous-lot High J6 clos techniquement ; J6 métier toujours OUVERT** avant enregistrement d'émetteurs réels, ledger Ed25519 v2 durable et gate opérateur.

**Next :** émetteur opérateur authentifié (gate humain), registre partagé durable et attestations réelles auditées, aucune réutilisation du reçu HMAC pour Ed25519.

## 14/11/2026 — Voie parallèle J6 : gate opérationnel explicite (préparation, pas activation)

**GOAL observable :** pouvoir recevoir une preuve Ed25519 d'un émetteur réel approuvé sans révéler de clé privée à la CI, au vérificateur, à Git, à Notion ou à un runner ; refuser tout staging sans provenance, géographie et politique indépendante.

**Décisions techniques préparées :**
1. Conserver la validation asymétrique `j6_ed25519_capture.py`, testée [CI J6 #43536709662](https://github.com/hraaaaf/Akarfinder/actions/runs/43536709662) SUCCESS, totalement distincte du registre HMAC v1.
2. Exiger **une version v2 du reçu** avec `proof_algorithm='Ed25519'`, `signature_sha256` (SHA256 des 64 octets), `key_id`, `registry_generation`, `registry_sha256`, `html_sha256`, `source_domain`, `source_offer_id`. Aucun champ ancien `attestation_mac_sha256` réutilisé. Signature Ed25519 vérifiée **avant** insertion par le validateur ; SQL seul n'authentifie pas l'émetteur.
3. Rôles séparés : opérateur politique (rotation/revocation), émetteur détenant une clé privée hors repo, reviewer en lecture source et reçus limités, service staging sans privilège sur annonces publiques. Protéger la génération de registre contre restauration ancienne par témoin externe immuable à la DB.
4. Les annonces de J3/J4/J5 restent **0 admissible** (7 originaux intègres mais pas de géographie/fraîcheur/vente actuelle indépendantes). Un reçu n'implique ni droit d'indexer ni vérité immobilière.

**SUCCESS/PREUVE AVANT GO DE STAGING :** émetteur authentifié et documenté hors Git, signature produite par SDK indépendant testée en cross-language contre le vérificateur, rotation et révocation effectives, tentatives de replay/rollback/concurrence refusées par stockage partagé durable avec preuve de restauration, RLS sur roles réels, insertion impossible sans validation humaine et source actuelle autorisée, logs caviardés des secrets. Aucune de ces conditions externes n'est aujourd'hui prouvée.

**NEXT J6 :** préparer ledger de preuve Ed25519 v2 isolé, puis soumettre le provisionnement du registre/secret store de l'émetteur et du stockage partagé à un gate humain spécifique. Ne pas déployer tant que les preuves sources J3–J5 et l'autorisation DB manquent. **J6 métier ouvert ; aucun staging, merge, Vercel ou DB réelle.**

## 14/11/2026 — Parallel High J6 Ed25519 v2 receipt isolé : 91/91 PASS

**GOAL :** préparer un registre de reçus Ed25519 strictement indépendant de la MAC HMAC V1, dans PostgreSQL17 de CI isolé, sans passer pour une preuve de validation automatique par SQL.

**CODE :** nouveau `scripts/acquisition/v7_parallel/j6_ed25519_ephemeral_receipt_v2.sql` : schéma `v7_capture_ed` séparé, policy_head CAS monotone une génération à la fois, clé de preuve `signature_sha256`, `proof_algorithm='Ed25519'` fixé en CHECK, `key_id`, empreinte registre opérateur et identité source, clé unique d'annonce+HTML. Rôles distincts `v7_capture_ed_owner` (NOLOGIN, NOSUPERUSER, NOBYPASSRLS), `operator` et `reviewer`, FORCE RLS et fonctions SECURITY DEFINER avec `pg_temp` dernier. Un SQL receipt reste **une attestation du reviewer autorisé, PAS une vérification Ed25519 par PostgreSQL** ; seules les fonctions Python doivent prouver la signature avant ce geste. Aucun accès réseau/DB extérieure, staging ou publication.

**PREUVE CI :** code HEAD `f8ef4c9027324c53966f045d6c26d7d0479a6770` ; [J6 #43579867407](https://github.com/hraaaaf/Akarfinder/actions/runs/43579867407) **COMPLETED SUCCESS, 91/91 tests** : 10 readiness + 7 source original + 10 HMAC + 7 Sarouty + 14 issuer registry + 6 PostgreSQL initial + 19 Ed25519 signature/V3 + 11 reçu HMAC + **7 reçu Ed25519 v2 PostgreSQL17**. [CI Policy #43579867414](https://github.com/hraaaaf/Akarfinder/actions/runs/43579867414) SUCCESS. Premier run [#43579733227](https://github.com/hraaaaf/Akarfinder/actions/runs/43579733227) FAILED pour comparaison littérale du `search_path` contenant des espaces dans `pg_proc.proconfig` ; correction de l'assertion par normalisation des espaces, sans changement de SQL, puis suite PASS. Historique d'échec conservé.

**LIMITES** : jeu synthétique, absence de clé réelle, émetteur authentifié, registre partagé anti-rollback dans un stockage externe, révocation opérationnelle, approbation d'une source J3/J4/J5, connexion staging. **J6 métier ouvert**, ni migration vraie ni cron, merge ou Vercel. Next : attester l'émetteur et prouver le lien révision signée → reçu v2 stocké dans DB durable avec gate humain.
