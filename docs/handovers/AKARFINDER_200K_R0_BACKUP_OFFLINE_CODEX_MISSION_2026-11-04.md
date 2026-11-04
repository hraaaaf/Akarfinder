# AKARFINDER 200K — Ordre de mission Codex : audit du backup local (.tz) — 2026-11-04

**Goal :** remplacer les estimations historiques par un inventaire **vérifiable** du backup local possédé par l'utilisateur, **sans jamais prétendre que sa date de sauvegarde prouve l'activité actuelle d'une annonce**.

**Accès :** le fichier backup se trouve dans l'environnement Codex de l'utilisateur (chemin exact à déterminer depuis cet environnement). Ce fichier **n'est pas accessible à la session ChatGPT** par simple synchronisation GitHub. Ne pas inventer son nom, taille, type, date ou contenu.

**Sécurité non négociable :**
- Lecture et analyse **100 % locale**, sur copie en quarantaine / répertoire temporaire ; aucun upload de backup, SQL brut, dump, image, contact ni donnée personnelle vers GitHub, Notion, Vercel ou outil externe.
- Aucune restauration vers Supabase réel, Neon, Vercel ou une autre DB de production. Aucun secret en log.
- Si un moteur local temporaire est nécessaire, l'isoler sans exposition de port externe, sans accès réseau et sans réutilisation d'une base existante. Aucun `DROP`/`CREATE` sur une base non jetable.
- Ne pas exécuter directement de commandes arbitraires contenues dans le backup ; prudence avec chemins d'archive, liens symboliques et fichiers volumineux.
- Ne pas utiliser le fait que Codex possède le fichier comme preuve de l'intégrité ou de la fraîcheur du contenu.

## Séquence exécutable

1. **Identifier** le fichier fourni : taille, `sha256sum`, sortie `file`, en-tête/magic bytes. L'extension `.tz` **n'est pas une preuve** de format PostgreSQL. Ne pas renommer ni décompresser aveuglément ; déterminer s'il s'agit de `tar`, `tar.gz`, dump `pg_dump` custom (`PGDMP`), SQL texte ou autre, puis choisir le lecteur correspondant. Éviter toute sortie incluant des données personnelles.
2. **Inventorier** de manière non destructive : tables, colonnes, types, éventuelles contraintes, volume d'objets, version DB et date de snapshot (si inscrits dans l'archive). Distinguer structure, données et logs. Si backup incomplet/corrompu : STOP avec preuve exacte.
3. **Charger seulement si nécessaire** dans une DB locale jetable, isolée, après vérification des commandes de restauration et des permissions. Il est interdit de démarrer/réactiver le Supabase connecté `kusfiyimwvxblvsrhaes` pour ce lot.
4. **Mesurer** sur les tables réellement présentes, sans supposer le schéma :
   - `COUNT(*)` total des listings, par table et par source ;
   - distinct `(source, source_id)`, URLs canoniques, doublons intra-source ;
   - candidats de doublons inter-sources et, si disponible, nombre de groupes de biens physiques réellement dédupliqués (ne pas assimiler IDs-source à biens uniques) ;
   - distribution ville / district / transaction / type de bien ;
   - prix numérique vs `NULL` / `on_request`, surface manquante, localisation incomplète et anomalies ;
   - ancienneté des dates de collecte, dates de mise à jour source, dates de **preuve positive d'activité**, retraits/tombstones, selon colonnes existantes ;
   - droits source / publication admissible uniquement s'il existe des attestations ou politiques valables ; sinon `UNKNOWN`.
5. **Définir et produire des compteurs distincts**, jamais additionnés abusivement :
   `rows_raw`, `source_ids_unique`, `canonical_urls_unique`, `property_groups_unique_proven`, `activity_verified_48h`, `rights_verified`, `fresh_unique_eligible`. Tout compteur dont la preuve/colonne nécessaire manque doit valoir `null` / `UNKNOWN`, **pas 0 inventé**. Les dates d'une archive ne certifient pas la disponibilité en direct.
6. **Double vérification** : recouper deux méthodes de comptage sur des sous-ensembles et valider au minimum `total = somme(par source)` si le modèle permet une partition unique ; enregistrer les requêtes SQL de contrôle, durées, erreurs, hash du rapport, sans données sensibles.
7. **Livrables** :
   - rapport local JSON agrégé `backup_inventory_safe.json` ;
   - tableau Markdown du baseline + hypothèses + limitations + verdict R0 ;
   - commandes reproductibles ne contenant aucun secret ni chemin privé sensible ;
   - uniquement les agrégats non sensibles peuvent être copiés dans `docs/handovers/AKARFINDER_200K_R0_READONLY_AUDIT_2026-11-04.md` puis Notion Akarfinder ; jamais le backup lui-même.
8. **Réconcilier** le résultat avec les *archives historiques* : 32 460 IDs-source du réservoir et les trois canaries Mubawab (97 IDs-source). Ne jamais additionner leurs chiffres sans jointure établie. Comparer aussi avec l'ancien chiffre de stock public **seulement si la même base et même période sont démontrées**.

## Critères de succès vérifiables

- Fichier exact identifié, SHA-256 calculé, structure SQL lisible ou raison de blocage documentée ;
- total d'annonces du backup **avec requêtes et preuves**, dates du snapshot reportées séparément ;
- rapport sur sources, villes, champs et doublons ;
- état de fraîcheur honnête : **historique vs actif actuel** explicitement séparés ;
- zéro écriture dans base réelle, zéro fuite du dump ;
- une fois seulement ces preuves acquises, mise à jour de la roadmap 200K / delta réel.

**STOP / Human gate :** backup illisible/chiffré sans clé ; espace disque local insuffisant ; restauration nécessitant DB réelle ou facturation ; risque de données sensibles dans un export ; absence de droits d'accès au fichier. Demander seulement le détail indispensable à l'utilisateur.

**Contexte:** [R0](AKARFINDER_200K_R0_READONLY_AUDIT_2026-11-04.md), [roadmap](AKARFINDER_200K_FRESH_INVENTORY_ROADMAP_2026-11-04.md), [PR #1155](https://github.com/hraaaaf/Akarfinder/pull/1155). Aucun merge, aucune requête vers Mubawab, aucun déploiement Vercel.
