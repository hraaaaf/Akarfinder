# AkarFinder — N06, pont qualité des 338 sources historiques

Goal : exploiter les preuves source archivées en sorties de qualification exploitables sans jamais les convertir en annonces actives.

Résultat de la jointure existante : 338 références distinctes et 337 identités portail, 318 URL anciennes ; le pont classe exactement 50 dossiers à cinq champs historiques sans avertissement connu, 18 prix+surface partiels, 37 avec un seul champ numérique, 3 avertissements économiques, 204 identités seules et 26 quarantaines. Les catégories sont disjointes et totalisent 338.

Les champs historiques et leur provenance sont conservés dans docs/data/feenway-338-quality-review-queue-2026-10-30.jsonl. Le pipeline existant scripts/data/fresh-active-unique-shadow-v1.mjs est branché en sécurité : aucun jeu historique ne peut fournir une preuve positive de fraîcheur, disponibilité, unicité physique ou droits. Le JSONL comporte un statut commercial non éligible sur toutes les lignes. Les tests comparent l'export à son calcul et vérifient le shadow.

Aucun HTTP, DB, merge ou Vercel. Les workflows de freeze Mubawab, Sarout et full-field ne se relancent plus automatiquement à chaque mise à jour de PR ; workflow_dispatch reste disponible pour reprise une fois l'archive canonique 226286 rétablie et vérifiée. Le code parseur est inchangé.

Success/Proof : CI dedicated 338-queue à vérifier ; le registre committé est relu et recomptable avant certification. Next exact : contrôler run CI exact head, comparer artifact au snapshot, suivre la progression sur données fraîches autorisées sans réutiliser les URL archivées comme disponibilité actuelle.

## Closeout N06 — preuves exactes, 30 octobre 2026

Goal technique confirmé : file de qualification source-first raccordée au shadow de fraîcheur et de droits. Aucune annonce historique promue en publication.

- CI https://github.com/hraaaaf/Akarfinder/actions/runs/41133005644 : completed/success, job real-corpus-quality success, HEAD testé 42632a56ff2b2497acd99f7ee06fe0076fde8146.
- Artifact 13014322201 téléchargé et lu : ZIP SHA256 6f68c33aacd671c6365b4b2f8bee365bc1b1d66aebca41e82744c75e3063f54d, identique au digest GitHub.
- JSONL SHA256 5f229a282a5595cc885316d76c87a7f3cb5261c9e0e02fc81fb067314dd3868c ; summary SHA256 8e2d783cdba82134471f8f37fd94dadabf22ad0fc5d6442b561e6a9b35a07646.
- Comptage indépendant : 338 lignes, 338 IDs distincts, 50 dossiers historiques complets, 18 prix+surface partiels, 37 un seul numérique, 3 alertes économiques, 204 identité seule, 26 quarantaine. Eligible DB = 0 ; shadow publishable = 0 ; HTTP = 0 ; DB = 0.
- Commit intervenu après la CI : 07326d1a4d579623710ea35ab95bd0177c3ccaf2 modifie seulement deux workflows N01 FeenWay pour désactiver leurs déclenchements push et conserver workflow_dispatch. La CI verte N06 porte sur 42632a56, pas sur ces ajustements ultérieurs.
- Mubawab et Sarout sont toujours bloqués par le fetch du freeze 226286 expiré et leur run associé a échoué. Cela ne constitue pas un échec du pont N06.
- PR #1105 DRAFT ; aucun merge, déploiement ou import DB réalisé dans ce lot.

Next exact : utiliser la file pour une vérification permise des 50 historiques prioritaires ou commencer par un flux direct de données autorisées ; sans confondre les 338 observations avec un stock frais. Trouver la copie SHA-identique du freeze canonique avant reprise des anciens parseurs.
