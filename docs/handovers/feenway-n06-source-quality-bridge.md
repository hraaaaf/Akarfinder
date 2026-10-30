# AkarFinder — N06, pont qualité des 338 sources historiques

Goal : exploiter les preuves source archivées en sorties de qualification exploitables sans jamais les convertir en annonces actives.

Résultat de la jointure existante : 338 références distinctes et 337 identités portail, 318 URL anciennes ; le pont classe exactement 50 dossiers à cinq champs historiques sans avertissement connu, 18 prix+surface partiels, 37 avec un seul champ numérique, 3 avertissements économiques, 204 identités seules et 26 quarantaines. Les catégories sont disjointes et totalisent 338.

Les champs historiques et leur provenance sont conservés dans docs/data/feenway-338-quality-review-queue-2026-10-30.jsonl. Le pipeline existant scripts/data/fresh-active-unique-shadow-v1.mjs est branché en sécurité : aucun jeu historique ne peut fournir une preuve positive de fraîcheur, disponibilité, unicité physique ou droits. Le JSONL comporte un statut commercial non éligible sur toutes les lignes. Les tests comparent l'export à son calcul et vérifient le shadow.

Aucun HTTP, DB, merge ou Vercel. Les workflows de freeze Mubawab, Sarout et full-field ne se relancent plus automatiquement à chaque mise à jour de PR ; workflow_dispatch reste disponible pour reprise une fois l'archive canonique 226286 rétablie et vérifiée. Le code parseur est inchangé.

Success/Proof : CI dedicated 338-queue à vérifier ; le registre committé est relu et recomptable avant certification. Next exact : contrôler run CI exact head, comparer artifact au snapshot, suivre la progression sur données fraîches autorisées sans réutiliser les URL archivées comme disponibilité actuelle.
