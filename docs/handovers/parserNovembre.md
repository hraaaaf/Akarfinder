# parserNovembre — FeenWay / Aspiration exhaustive — Plan canonique

**État : PLANIFIÉ — aucune exécution nouvelle prouvée par ce document.**
**Repo :** hraaaaf/Akarfinder · **Branche :** data/200k-fresh-parser-v2 · **HEAD de référence :** b168ede39b92a5d4613611f30a278c762e7aaa32 · **PR historique :** #1105.

## Goal, succès et preuve

**Goal :** parcourir automatiquement l'ensemble du catalogue FeenWay publiquement accessible, conserver les données RAW complètes et les médias dont la collecte est autorisée, puis extraire des annonces fraîches, disponibles, uniques et réutilisables via PULPER, sans injecter le RAW dans la DB AkarFinder.

**Succès :** couverture mesurée et documentée de toutes les surfaces publiques découvertes, captures vérifiables, stockage durable chiffré, pipeline reproductible et qualification contrôlée. **Preuve :** manifestes URL, horodatages, empreintes SHA-256, tests, métriques et contrôles indépendants. Un run CI vert seul ne suffit pas.

## Point de départ vérifié / limites

- Inventaire historique FeenWay : **54 161 références URL**, pas 54 161 biens uniques certifiés.
- Dernier total communiqué : **161 captures RAW, 160 URL distinctes** (une URL recapturée). Le lot offset 120 a une CI SUCCESS, mais sa vérification cryptographique indépendante reste à achever.
- **120 URL distinctes** contrôlées cryptographiquement sur les lots précédents ; JSON-LD `RealEstateListing` présent sur les 120 pages auditées.
- PULPER JSON-LD : **7/7 tests** sur le run GitHub `40494059004` ; tous les moules restent non éligibles à la publication tant que les gates ne sont pas passés.
- **0 insertion DB / 0 publication / 0 déploiement Vercel** lié à cette collecte.
- L'hypothèse de **100 000+ annonces FeenWay** n'est pas vérifiée. Les artifacts GitHub temporaires (30 jours) ne sont pas un RAW Vault durable.

## LOT N01 — Cartographie exhaustive des entrées publiques

**Goal :** découvrir toutes les URL d'annonces accessibles via sitemaps, catégories, villes, pagination, liens internes et réponses JSON publiques.

**Exécution :** repartir des 54 161 références, canoniser les URL, dédupliquer, inventorier les partitions et détecter les pages hors sitemaps. Mesurer la couverture par ville, catégorie, statut HTTP et origine.

**Succès / preuve :** inventaire versionné des URL uniques, provenance par URL, rapport des écarts entre surfaces et estimation explicitement incertaine des manquants. **Gate :** ne pas confondre URL et biens réels.

## LOT N02 — Crawler hybride HTTP + Playwright

**Goal :** remplacer les lots manuels de 40 pages par une exploration continue et reprenable.

**Exécution :** HTTP direct pour HTML/JSON publics ; Playwright uniquement pour rendu JavaScript nécessaire ; file persistante, états par URL, déduplication, backoff, contrôle robots, quotas par domaine et reprise après incident. TinyFish Fetch peut servir à un échantillon de reconnaissance, sous réserve de ses limites réelles ; ne pas présumer un service illimité.

**Succès / preuve :** parcours reproductible d'un jeu d'URL, zéro contournement d'authentification/CAPTCHA, rapports d'erreurs, tests de reprise et comparaison HTTP/Playwright. **Gate :** arrêt/isolement de toute source qui refuse l'accès.

## LOT N03 — Capture complète et RAW Vault durable

**Goal :** préserver chaque réponse brute récupérable avec provenance et intégrité.

**Exécution :** HTML original, JSON public, prix, adresse publiée, surface, description, équipements, référence source, horodatage, empreinte SHA-256, URL des photos et médias autorisés ; stocker les octets médias seulement lorsque la collecte/conservation est permise. RAW Vault privé, chiffré, avec clés hors CI, index et politique de rétention. Ne pas exposer de données personnelles ou médias sans droits.

**Succès / preuve :** déchiffrement indépendant, vérification SHA-256 des pages et médias, restauration depuis stockage durable, manifeste complet, **0 écriture DB métier**.

## LOT N04 — Industrialisation par paliers

**Goal :** augmenter le débit sans perdre la fiabilité ni surcharger les sources.

**Exécution :** tests à **100 → 1 000 → 10 000 pages**, puis extension selon mesures et permissions. Suivre **URL découvertes, pages réellement capturées, médias conservés, erreurs par catégorie**, ainsi que taux de duplication, temps et coût.

**Succès / preuve :** manifestes et taux observés à chaque palier, reprise validée, couverture progressive mesurée ; aucun chiffre de capacité n'est garanti à l'avance. **Gate :** palier suivant seulement si le précédent est sain.

## LOT N05 — PULPER, moules et certification

**Goal :** transformer les RAW en annonces exploitables, sans faux positifs.

**Exécution :** moules JSON versionnés, extraction conservatrice, normalisation, déduplication des URL et biens physiques, contrôle de fraîcheur, disponibilité, cohérence, droits de réutilisation et gestion des incertitudes.

**Succès / preuve :** tests de parsing et d'intégrité, audit de faux positifs, comptages distincts `RAW capturés / URL distinctes / biens distincts / annonces certifiées`. Admission DB uniquement après gates ; aucun média publié sans droits.

## Ordre critique / reprise

1. **Next exact :** vérifier l'artifact chiffré du run `40493297128` (offset 120) et réconcilier le compte réel des URL distinctes.
2. Auditer l'inventaire des 54 161 références et rechercher les partitions publiques supplémentaires (LOT N01).
3. Construire file persistante et crawler hybride avec tests (LOT N02).
4. Raccorder RAW Vault chiffré durable et captures médias autorisées (LOT N03).
5. Tester paliers 100/1 000/10 000 avec métriques réelles (LOT N04).
6. Exécuter PULPER et gates de certification (LOT N05).
7. Closeout : mise à jour des documents canoniques, cohérence repo/HEAD/PR/CI, revue et merge uniquement selon gates applicables. **Pas de déploiement Vercel sans autorisation explicite.**

**Blocage connu :** écriture GitHub de lancement du lot suivant précédemment refusée par contrôle de sécurité ; ne pas annoncer de nouveau run sans preuve.
**Avancement global : non certifié.**
