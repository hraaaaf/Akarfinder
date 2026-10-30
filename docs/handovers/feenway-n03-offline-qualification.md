# FeenWay N03 — qualification offline des URL N01 — 2026-10-30

## Goal / succès / preuve
Goal : reconstruire et qualifier **les identités d'URL candidates** à partir des archives N01, sans convertir des URL en biens actifs, frais, uniques physiquement ou réutilisables.
Succès observable : inventaire intégral des 40 ZIP disponibles, identité syntaxique et provenance contrôlées, divergence historique mesurée, manifestes `review_url_only` conservateurs. **Ce lot ne certifie pas d'annonces commercialement exploitables.**

### Preuves observées localement (aucune requête réseau/DB du script)
- 40 ZIP GitHub Actions téléchargés par ID et SHA-256 de chaque archive vérifié, puis manifeste interne et contrôle de complétude relus.
- 35 lots de découverte complets, **1 736/1 736** pages distinctes.
- Six XML du dernier snapshot : **58 513 URL distinctes**, toutes avec identité de route `/listings/<id>`.
- Cohorte primaire (35 lots + les versions retenues des sitemaps/villes/échantillon) : **73 708 URL distinctes**.
- Union des **40 archives historiques** : **73 715 URL distinctes**, dont **7 uniquement présentes dans les versions historiques** des sources villes/échantillon.
- Référence historique N01 : **73 710 URL**. Non reproduite à l'identique : **+2** par rapport à la cohorte primaire, **-5** par rapport à toutes les observations. **Ne PAS annoncer 73 710 comme nouvellement recertifié.**
- **65 URLs** qualifiées « hors XML » par des observations historiques se trouvent dans le dernier XML : **dérive de snapshots**, sans doublon à additionner.
- Les 73 715 identifiants URL sont syntaxiquement distincts ; cela ne certifie ni la fraîcheur ni l'unicité physique.
- **0/73 715** avec cinq champs attestés *par ces archives URL-only* : ville, quartier, prix, surface absents du manifeste. **0 disponible/actif/réutilisable physiquement unique éligible certifié**, **0 écriture DB**.

### Validation et garde-fous
- Réexécution réelle en répertoire vierge depuis le bundle : **47 fichiers source/outils/manifestes vérifiés par SHA-256**, recomputation de deux manifestes byte-identiques ; 4/4 tests Python locaux PASS, dont rejet de mauvais hash, fausse provenance, URL à query/alias et rapport avec DB writes.
- SHA256 du manifeste primaire 73 708 lignes : `7b4f14df1f6a587c7b6a0dc1560bdcdfba92c670688f9e41e6c146c009a7440c`.
- SHA256 de l'union 73 715 lignes : `2797418f770cb7f6ba13b4dde100aae0f7dbe3de9c6a0b40bf825b364e32aabf`.
- SHA256 de l'archive portable complète (1 737 168 octets) : `4333eebc4cf542f9109e5392ae062f56fa5991cb6680f3e462ec2cfcf78aee0a`.
- **Bundle pérennisé dans Google Drive (privé)** : https://drive.google.com/file/d/10nFq94pH22EF95wkdCI1RSzxKn-FglB3/view?usp=drivesdk . Contient le code complet, 4 tests, inventaire des 40 artifacts, 40 ZIP, les deux manifestes de revue et le rapport exhaustif.
- Le code de qualification n'effectue aucun fetch, accès DB, déploiement ou publication. La validation N03 **est locale**, pas une CI GitHub : ne pas la qualifier de CI verte.

### Limite de certification et prochaine action
Le manifeste canonique consolidé N01 et son SHA hors-sitemap `22406be5fd15c510c0775bca563816e70591b30e59f71af964ebf90e0f10fa38` n'ont pas été retrouvés pour une comparaison byte-à-byte avec les 73 710 historiques. Les 40 archives sont authentiques et le résultat d'union est reproductible, mais les sous-ensembles historiques ne décrivent pas un même état instantané du portail.

**Next exact :** rapprocher l'union URL-only avec les 81 audits sources et 60 benchmarks déjà documentés, par identité FeenWay quand elle est disponible ; classifier les cinq champs, l'identité source, les dates, les conflits, et conserver toutes les fiches en `review` tant que fraîcheur, disponibilité, unicité physique et droits ne sont pas prouvés. Une preuve HTTP200 ou une date d'extraction n'autorise pas l'admission.

**Governance :** [PR #1105](https://github.com/hraaaaf/Akarfinder/pull/1105) DRAFT. Aucun merge, SQL, déploiement Vercel, nouvelle collecte live ni contournement de robots. Mubawab/Sarout indépendamment bloqués par la freeze historique expirée `10910779576`.
