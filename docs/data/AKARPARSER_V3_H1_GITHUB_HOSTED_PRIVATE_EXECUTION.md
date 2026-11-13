# AkarParser V3 H1 — GitHub-hosted Linux + Supabase Storage privé

Date: 2026-11-13. Draft PR #1203. Preparation only — aucun dispatch réel, merge, import de données ni Vercel.

## GOAL / SUCCESS / PROOF

Traiter exactement 151 900 annonces historiques Neon Recovery dans un bucket Supabase Storage privé, avec GitHub-hosted Ubuntu, sans AWS. Une première page canary de 1000 et 151 pages suivantes, 152 lots au total, dernier lot 900. Reprise sur incident par checkpoints versionnés SHA-256 append-only.

Success: 152 lots validés, 151900 entrées, 0 erreur parseur, 0 écriture source ou réseau via parseur, empreintes de chaque objet et manifeste final vérifiés. Le statut ready_internal ne constitue ni admissibilité PROD ni autorisation de publication.

Vérifié côté Neon: 151900 lignes jointes, 53083 prioritaires, 98817 autres, 14950 descriptions renseignées et 0 titre/ville/URL manquant. Source V3 épinglée au SHA 3eb2b8a7b7ec78832e764e014b387eabd5e74058. Exécution réelle encore 0/152 lots.

## Projet et stockage isolé

- Organisation Supabase AqarFinder sur plan FREE ; projet actif AkarfFnder, ref mgqsckxsqdqbzqwkgvwo, région eu-west-1.
- Bucket H1 dédié: h1-historical-evidence, PRIVÉ, 10 MiB maximum par objet. Ne toucher ni au bucket existant seller-property-drafts, ni aux tables applicatives.
- Quota Free: 1 GiB Storage par organisation. Le code borne son propre volume à 650 MiB, projette les fichiers du canary sur 152 lots plus 80 MiB de réserve, puis contrôle la capacité avant chaque upload. Un échantillon SQL de 1000 lignes donne 408 octets JSON en moyenne pour certains champs essentiels : ce chiffre ne représente PAS la taille finale des exports.
- Interdiction des clés administrateur Supabase S3 (contournent RLS), de service_role, sb_secret et des URL publiques. GitHub Actions ne demande que contents:read, aucun id-token, aucune publication Actions artifact/cache.

## Provisionnement privé — procédure contrôlée

1. **FAIT / VÉRIFIÉ 2026-11-13** : scripts/ci/h1_supabase_bucket_setup.sql appliqué sur mgqsckxsqdqbzqwkgvwo. Vérification SQL : bucket h1-historical-evidence public=false, file_size_limit=10485760, exactement deux politiques H1 SELECT et INSERT liées à app_metadata.h1_storage=enabled et aux chemins akarfinder/h1/run-{numérique}/..., aucune UPDATE/DELETE ; seller-property-drafts préservé. Les deux buckets affichent 0 objet ; aucun utilisateur technique marqué h1_storage=enabled n’existe encore. Supabase Security Advisors : seulement des INFO RLS-no-policy sur d’autres tables préexistantes, pas de nouvelle alerte H1.
2. Créer depuis Supabase Auth un utilisateur technique email/mot de passe propre à H1, email vérifié, avec app_metadata administrateur h1_storage='enabled'. Ne pas utiliser un compte d'utilisateur de l'application. Révoquer après la campagne.
3. Variables GitHub de l'environnement q1e-neon-readonly : H1_SUPABASE_PUBLISHABLE_KEY (clé sb_publishable du projet) et H1_SUPABASE_AUTH_USER_ID (UUID de l'utilisateur technique). Projet et bucket sont codés en dur et revalidés à l'exécution.
4. Secrets GitHub du même environnement : Q1E_NEON_RECOVERY_READONLY_URL (Neon Recovery direct, rôle limité akar_h1_ci_readonly), H1_SUPABASE_AUTH_EMAIL, H1_SUPABASE_AUTH_PASSWORD. Ne jamais afficher les valeurs dans une conversation, un commit ou un log.
5. GitHub Settings > Environments > q1e-neon-readonly : restreindre aux branches main, exiger reviewer indépendant et prevent self-review si accessible, désactiver le bypass administrateur. L'ancienne capture affichait No restriction et bypass activé ; protection NON CERTIFIÉE.
6. Après mise en place, tester depuis l'identité technique : création + lecture d'un objet test uniquement H1 ; rejet GET/POST seller-property-drafts, rejet GET anonyme, rejet UPDATE/DELETE H1. Contrôler les advisors Supabase. Ne pas publier d'annonce réelle pendant ce test.

## Persistance et reprise

- Auth via POST /auth/v1/token?grant_type=password, JWT court valide vérifié sur UUID et app_metadata, renouvelé avant expiration.
- Storage utilise seulement GET /storage/v1/object/authenticated/{bucket}/{path} et POST /storage/v1/object/{bucket}/{path} avec x-upsert:false. Aucune méthode PUT/PATCH/DELETE et aucun service_role. Téléchargement et calcul SHA-256 après chaque upload.
- Namespace akarfinder/h1/run-{run_id}/. Checkpoints immuables checkpoints/000.json (initial), 001..152.json (un par lot), 153.json (terminé), plus final-manifest.json. Le parser as_of est enregistré dans le checkpoint initial et réutilisé pour des reprises reproductibles.
- En reprise, inspecter les checkpoints ordonnés, **vérifier une chaîne SHA-256 de checkpoint en checkpoint**, contrôler le workflow HEAD exact, le snapshot attendu, les SHA de tous les objets, la sûreté et les ranges ID. Un objet partiellement uploadé n'est réutilisé que si octets/sha identiques ; sinon STOP sans overwriting. Une modification du workflow HEAD entre deux dispatchs interdit automatiquement la reprise.
- Après le canary 1000, continuation automatique des 151 autres lots seulement si parser safety PASS et projection budget <=650 MiB. Si stockage rempli, STOP sans forcer la suite.
- Un ensemble de sessions SQL successives ne garantit pas un snapshot transactionnel unique. Neon Recovery doit rester figée en écriture durant exécution ET reprises ou disposer d'un mécanisme de fingerprint de contenu vérifiable. Les hashes Supabase permettent détection d'altération mais ne créent pas une immutabilité WORM contre les administrateurs.

## Gate avant exécution

1. Preuve bucket privé, policies en place, identité technique authentifiée, accès refusé hors bucket.
2. Quota réel disponible sur l'organisation confirmé, coût d'egress compatible et gate canary validée.
3. GitHub protections des environments vérifiées, secrets et variables confirmés sans divulgation.
4. Route réseau GitHub Linux vers Neon direct et Supabase Auth/Storage confirmée, source immuable à travers reprises.
5. CI du HEAD exact (test offline + parseur synthétique, actionlint, gate PR) SUCCESS. La fusion sur main et le dispatch live sont deux opérations séparées et non réalisées dans ce lot.
6. Un dispatch manuel sur main, actor hraaaaf, authorize_h1_readonly=true après validation. Vérifier finalement les 152 lots/151900 lignes, manifest SHA, 0 errors, 0 db writes, 0 publication.

**État: bucket privé et RLS créés et vérifiés ; identité technique absente (0 compte H1), GitHub env/secrets non vérifiés, egress Neon non testé ; aucun dispatch live, 0/152 lots, 0/151900 entrées. Pas de merge ni Vercel.**

## Sources primaires

- https://supabase.com/docs/guides/storage/buckets/fundamentals
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/platform/manage-your-usage/storage-size
- https://supabase.com/docs/guides/storage/s3/authentication
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword
