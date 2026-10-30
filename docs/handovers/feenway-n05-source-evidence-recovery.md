# FeenWay N05 — récupération effective de champs sources historiques

**Goal :** exploiter maintenant les quatre corpus sources déjà archivés, sans redémarrer de crawl. **Succès :** un artifact JSONL à 338 FeenWay IDs uniques, jointure stricte sur identité de portail, champs numériques source historisés et quarantaine des identités incertaines. **Preuve :** CI et artifact à valider après run ; `scripts/data/feenway-archived338-recover.mjs` et 3 tests.

**Corpus :** 238 identités FeenWay, 100 contrôles historiques, 81 cinq-champs (inclus dans 100), 60 sondes complémentaires (incluses dans 238). Total unique **338**, identités de portail **337** et 1 sans référence source mise en quarantaine.

**Récupération vérifiée en lecture des sources :** 53 fiches historiques strictement à cinq champs, dont 50 sans anomalie économique explicitement connue ; sur 60 sondes : 55 identités source conservées, 30 signaux de prix, 43 de surface, et 18 des deux. Cinq identités source non prouvées n'alimentent aucun champ numérique. Les signaux et prix ne sont pas interprétés comme prix total/loyer mensuel sans unité confirmée.

**Aucune certification d'activité actuelle :** 0 fraîcheur, 0 disponibilité, 0 unicité physique, 0 droits, 0 éligible DB, 0 HTTP et 0 DB. Les 338 lignes ne valent PAS 338 annonces vivantes ni de nouvelles annonces hors de la cohorte URL FeenWay historique.

**Blocage indépendant identifié :** les workflows GitHub `41123420020` Mubawab, `41123420315` Sarout et `41123420024` full-field s'arrêtent sur `Fetch canonical freeze`, avant leur phase d'extraction ; le contenu de l'archive 226 286 `10910779576` (expirée) n'a pas été retrouvé dans Drive par les requêtes ciblées. Ne pas relancer en boucle les pipelines sans réparer cet input canonique. On préserve les champs historiques source documentés plutôt que de réinventer cette archive.

**Next exact :** vérifier le job/manifest 338, stocker l'export durablement puis brancher ses preuves sur le pipeline de qualification source-first. Ne pas promouvoir ces observations historiques en stock commercial. PR #1105 DRAFT, aucun deploy Vercel, merge ni écriture DB.
