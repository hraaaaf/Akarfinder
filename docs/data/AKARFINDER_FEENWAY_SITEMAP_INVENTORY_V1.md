# FeenWay — acquisition accélérée / six sitemaps publics V1

**Goal** : passer du prélèvement manuel de 100 fiches à un inventaire reproductible des URL de six sitemaps publics, sans ouvrir les fiches détail.

**Preuves attendues** : run GitHub Actions `FeenWay public sitemap discovery`, cinq tests Node, artifact `discovery.jsonl` (URLs dédupliquées, statut `discovered_unverified`), `sample.jsonl` (240 réparties entre six sitemaps), `summary.json` (comptage et SHA256). Le script respecte robots, liste explicite des URL, arrête sur 403/429 ou redirection, espace les requêtes et n'accède à aucune API privée. 0 DB, 0 images/contacts, 0 déploiement.

**Observation initiale 27 octobre 2026** : 29 161 URL distinctes **au minimum** apparaissent dans un extracteur externe (cinq sitemaps plafonnés à 5 000 URL chacun, sixième 4 161). Résultat probablement tronqué ; seul l'artifact XML brut du run permettra de compter correctement. Un lien n'est **pas** une annonce active, physiquement unique ou autorisée à la republication.

**Next exact** : vérifier succès CI et manifest, dédupliquer les 240 candidates contre les 100 déjà auditées, contrôler leurs fiches originales en lots limités, puis rapprochement dans Neon archive 151 900 en lecture seule. Aucun changement `eligible` tant que disponibilité/unicité/droits sont inconnus.
