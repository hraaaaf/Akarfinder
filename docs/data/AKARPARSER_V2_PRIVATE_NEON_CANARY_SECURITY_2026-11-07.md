# Q1E — Accès sécurisé Neon Recovery (GitHub Actions manuel)

**État :** workflow et contrôles intégrés à la PR Draft #1188 ; aucun secret fourni et aucune exécution réelle sur Neon Recovery via GitHub Actions.

## Conditions de démarrage

- Le workflow est accessible en déclenchement manuel **seulement depuis main**, une fois le code audité et fusionné. La PR ne reçoit aucun secret.
- La branche Neon de récupération est épinglée à \`ep-falling-unit-b2hper1a.c-6.eu-central-1.aws.neon.tech\`, base \`AkarFinder\`. L'accès à une autre branche / DB est refusé.
- Le rôle dédié doit avoir **SELECT uniquement** sur \`public.property_listings\` et \`public.listing_sources\`, sans droits INSERT/UPDATE/DELETE/TRUNCATE ni CREATE. Le script refuse le rôle \`neondb_owner\`.
- Utiliser un secret d'environnement GitHub **\`Q1E_NEON_RECOVERY_READONLY_URL\`** dans l'environnement \`q1e-neon-readonly\`, limité à \`main\`, avec approbation si disponible. Vérifier les contraintes du plan GitHub (environnements / approbateurs).
- Ne pas publier le ZIP SQLite, les URL, les dossiers de revue ou les logs bruts. Les lignes privées sont éphémères sur le runner ; **aucun artifact ni cache**.
- Le canary prélève exactement 200 lignes par source (Mubawab, Avito, Agenz, Domio, autres) dans Neon Recovery, puis lance AkarParser V2, produit 100 dossiers de revue non annotés et ne logge que des agrégats.
- L'exécution technique ne constitue pas une certification de précision. Les 100 dossiers doivent être examinés de manière indépendante sur les preuves d'origine.

## GOAL / SUCCESS / PROOF

GOAL : vrai canary 1000 lignes sur récupération Neon, sans privilèges d'écriture ni divulgation. SUCCESS : les 1000 lignes passent, zéro écriture, sortie privée et agrégats vérifiés. PROOF : run GitHub completed/success + contrôle des privilèges + revue manuelle 100 fiches. **Il n'y a pour l'instant aucune preuve de run Neon réel.**

## Gate restant

Ne pas créer ou injecter des secrets de production dans la PR. L'activation exige un rôle SELECT-only, la configuration de l'environnement protégé et un lancement manuel depuis une version de code auditée sur main. Aucun merge ou déploiement Vercel autorisé par ce document.
