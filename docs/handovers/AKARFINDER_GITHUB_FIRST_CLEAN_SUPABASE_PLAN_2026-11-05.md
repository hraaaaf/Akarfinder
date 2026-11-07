# AKARFINDER — GitHub-first → Supabase propre (05/11/2026)

**STATUT : PLAN PROPOSÉ / NON ACTIVÉ — NO DB WRITE / NO DELETE / NO MERGE / NO VERCEL DEPLOY**

## Goal / succès / preuve
**Goal :** développer et tester AkarFinder à partir du dépôt GitHub, reconstruire la base de données avec migrations versionnées et ne connecter la nouvelle base Supabase qu'après validation du code, du schéma, des tests et de la topologie des environnements.

**Succès :** (1) migrations rejouables depuis une base vierge en environnement isolé ; (2) tests automatisés du schéma, RLS/policies, Auth/Storage/Edge éventuels et pipeline d'annonces ; (3) projet de staging réellement fonctionnel, sans écrire en production ; (4) déploiement/connexion de production uniquement sur autorisation explicite. **Preuve :** logs CI + tests SQL + comptages et contrôles read-only + go/no-go documenté.

## État vérifié au 05/11/2026
- Repo : `hraaaaf/Akarfinder`, `main` HEAD `c02d0b73ed18b0e136d478fab39e71df425173a7` à l'audit, branche protégée.
- `supabase/migrations` : **214 fichiers SQL** répertoriés dans l'arbre GitHub du HEAD Draft R2 `a77a9cab88fb72895808511c3d7f441a4e0f86bd`. **Leur rejouabilité complète n'a PAS été testée.**
- Ancien Supabase : `kusfiyimwvxblvsrhaes` (nom `AqarFinder`, créé le 23/06/2026), **INACTIVE**. Utilisé par l'ancienne CI P5 : DNS `ENOTFOUND`, API `casablanca/price` HTTP 503, [run #42046861866](https://github.com/hraaaaf/Akarfinder/actions/runs/42046861866) FAILURE.
- Nouveau Supabase : `mgqsckxsqdqbzqwkgvwo` (nom actuel `AkarfFnder`, créé le 04/11/2026), **ACTIVE_HEALTHY** ; `list_tables(schemas=['public'])` → **aucune table**. Rien ne permet de considérer cette base comme restaurée ou connectée à la production.
- R1 : union historique **77 072 identités source-scoped** via rapprochement explicite, quarantaine 12 815, non assimilable au stock d'annonces actives.
- R2 : Draft PR #1159 HEAD `a77a9ca`, CI ciblée [#42046862082](https://github.com/hraaaaf/Akarfinder/actions/runs/42046862082) **SUCCESS, 33/33 PASS**, Efficiency SUCCESS ; CI P5 FAILURE externe à Supabase. Aucun merge ni déploiement.
- Le propriétaire indique avoir récupéré la base historique, **mais la complétude du backup (données + schémas + Auth + Storage + fonctions + politiques) n'a pas été vérifiée ici**.

## Décision d'architecture recommandée — GitHub source de vérité
1. **GitHub :** code, versionnement des migrations SQL et de la config non secrète, fixtures synthétiques, tests, documents de reprise, PR Draft → reviews/CI → merge après autorisation. Les clés et dumps bruts ne doivent pas être committés.
2. **Développement local / CI isolée :** `supabase init/start/db reset` avec moteur local adapté aux commandes confirmées `--help` ; tester une reconstruction *from scratch* des **214 migrations** sur une base sacrifiable, puis corriger leur ordre/dépendances dans les branches. Installer le minimum requis, et ne pas masquer les migrations qui échouent.
3. **Nouvelle Supabase :** réserver `mgqsckxsqdqbzqwkgvwo` au **staging initial** tant que schéma et données n'ont pas passé les gates ; appliquer les migrations approuvées, injecter seulement fixtures contrôlées. Auth, Storage, RLS, vues, fonctions, webhooks, service roles, usages du portail et quotas doivent être vérifiés séparément.
4. **Production :** ne pas pointer le site existant vers la nouvelle DB ni migrer des données à l'aveugle. Distinguer staging de production. Si une base dédiée prod est décidée, planifier sa configuration (projet ou compte distinct si besoin de propriété/permissions séparées), migration progressive, rollback et monitoring. **Tout déploiement Vercel / remplacement de secrets ou URL de prod exige autorisation explicite préalable.**
5. **Qualité de données :** réimporter uniquement les annonces et médias autorisés selon la source ; ne pas confondre `is_active`, `last_seen_at`, ID-source et preuve positive de disponibilité. `fresh_unique_eligible=UNKNOWN` jusqu'à R2 réelle + R3 droits + déduplication physique.

## Suppression de l'ancien Supabase — human gate irréversible
**NE PAS SUPPRIMER AUJOURD'HUI.** Même un projet inactif peut encore contenir des configurations, historiques Auth, Edge Functions, Storage, backups et tokens qui ne figurent pas dans l'export d'annonces.

Checklist préalable :
- [ ] Vérifier le backup brut : restauration test dans environnement isolé, intégrité, schéma, tables, comptages.
- [ ] Vérifier/exporter Auth, Storage, Edge Functions, migrations, RLS/grants, paramètres SMTP/OAuth, webhooks et secrets/config non récupérables.
- [ ] Inventorier et découpler les références `kusfiyimwvxblvsrhaes` dans la CI, le backend, les environnements Vercel et les intégrations, **sans modifier les secrets en production sans accord**.
- [ ] Faire valider par le propriétaire la destination définitive du projet actif et les coûts/roles d'accès.
- [ ] Obtenir un **OK de suppression explicite et spécifique à l'ID `kusfiyimwvxblvsrhaes` après les preuves précédentes**, puis supprimer séparément (action irréversible) seulement si un outil autorisé permet de le faire.

**Documentation Supabase :** [suppression irréversible](https://supabase.com/docs/guides/platform/delete-project), [workflow de développement](https://supabase.com/docs/guides/local-development/cli-workflows), [environnements](https://supabase.com/docs/guides/deployment/managing-environments), [migrations versionnées](https://supabase.com/docs/guides/deployment/database-migrations).

## Next exact et séquence
**Next :** lancer un contrôle de chaîne de migrations et de schéma sans toucher aux deux projets distants ; relever les conflits de migrations historiques. **Puis :** tests CI hors-ligne → stratégie de staging + compte/roles → revue humaine du nouveau projet → migration contrôlée + tests read-only → feu vert connexion prod distinct → closeout. Suppression ancienne uniquement sous checklist complète et approbation explicite.

**Rapport statut :** décision technique recommandée, pas encore approbation de migration, d'un changement prod ou de suppression.

## Decision du propriétaire — 05/11/2026 (mise à jour)

Le propriétaire confirme que **l'ancien projet est un environnement de construction, sans utilisateurs**, et qu'**il détient une copie exportée de toute la base de données**. Ces points sont des déclarations du propriétaire : pas d'audit indépendant du contenu de cette sauvegarde au moment de cette note.

**Décision de gestion :** décommissionner et supprimer l'ancien projet Supabase `kusfiyimwvxblvsrhaes` plutôt que tenter une réactivation, en conservant le nouveau `mgqsckxsqdqbzqwkgvwo` comme base propre, initialement vide. La conservation indéfinie de l'ancien n'est pas un objectif. Ne pas retarder pour des hypothétiques utilisateurs, puisque le propriétaire confirme qu'il n'y en a pas.

**Prérequis techniques courts avant suppression** : (a) sauvegarde située hors de l'ancien projet ; (b) identifier les références résiduelles dans secrets CI / Vercel / backend, car la CI P5 actuelle cible encore cet ID et échoue déjà ; (c) noter qu'une suppression retire également les configurations, Storage, Edge et Auth éventuels non inclus dans un dump Postgres. Si ces éléments n'existent pas ou ne sont pas utiles, la suppression est rationnelle.

**Exécution :** aucun outil de suppression Supabase n'est exposé par le connecteur disponible, et aucune session de navigateur Supabase authentifiée n'est disponible ; **l'ancien projet n'a PAS été supprimé**. Le propriétaire peut l'effacer directement via le dashboard `Settings > General > Delete project` en vérifiant l'ID précis. Ceci ne doit pas affecter `mgqsckxsqdqbzqwkgvwo`. Aucune écriture en base, merge, changement d'environnement prod ou déploiement Vercel autorisé.

**Next exact après suppression :** conserver l'export sécurisé, éliminer les références vers l'ancien projet en PR distincte, vérifier la rejouabilité des 214 migrations sur DB éphémère, puis initialiser un staging propre sur la nouvelle Supabase après vérification des droits/coûts et sans lier la prod.
