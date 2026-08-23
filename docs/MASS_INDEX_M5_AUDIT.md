# DATA MASS-INDEX — M5 Dedup + freshness audit

**Issue : #854**  
**Lot : M5**  
**Statut : 🟡 ACTIVE — baseline read-only**

## Goal
Mesurer l’état réel de la déduplication et de la fraîcheur avant toute modification, afin de définir un contrat M5 déterministe sans activer Search ni fabriquer de métrique de propriétés uniques.

## Succès de l’audit
- inventaire du schéma et des mécanismes réellement présents ;
- baseline DB exacte en lecture seule ;
- séparation entre mécanismes existants, couverture réelle et dette ;
- aucun write DB ; aucune activation Search ; aucun Vercel.

## Baseline vérifiée — 2026-08-23

### Stock
- `source_offer_seeds` : **57 836** ;
- `property_listings` : **5 700** ;
- `thin_index_search_documents` : **56 866**.

### Déduplication historique `property_listings`
- `canonical_fingerprint` : **5 700 distincts / 5 700 lignes** ; la contrainte unique empêche uniquement les collisions de ce fingerprint exact ;
- lignes avec `duplicate_group_id` : **82** ;
- groupes renseignés : **54** ;
- plus gros groupes observés : 9, 6, puis 3 membres ;
- `duplicate_score` renseigné sur les mêmes 82 lignes.

Conclusion : ce mécanisme couvre une faible fraction du stock historique et ne constitue pas à lui seul une déduplication multi-source globale.

### Clustering `property_clusters`
- `property_clusters` : **5 561** ;
- `property_cluster_members` : **5 561** ;
- clusters avec plus d’un membre : **0** ;
- taille maximale : **1**.

Conclusion : la structure de clustering existe mais, dans l’état observé, elle matérialise essentiellement un mapping 1 membre -> 1 cluster. Aucune métrique de « propriétés uniques » ne peut être dérivée de ces clusters avant M5.

### Représentations propriétaire
- `owner_listing_representations` : **0 ligne** au moment de l’audit ;
- le schéma prévoit `dedupe_fingerprint` + `canonical_cluster_key`, mais il ne contribue actuellement à aucune déduplication observée.

### Fraîcheur des seeds
Distribution `source_offer_seeds` :
- `seed_only` : **53 642** ; dont **965 `metadata:null` M4**, `fresh_last_seen_at` absent ;
- `fresh_confirmed` : **4 006** ;
- `aging` : **188** ;
- `stale` / `rejected` : **0** observé.

Confirmation fraîche :
- sans `fresh_last_seen_at` : **53 642** ;
- <=30 jours : **1 992** ;
- 31–90 jours : **2 202** ;
- >90 jours : **0**.

Ces chiffres décrivent des représentations/seeds, pas des propriétés uniques.

### Moteur de fraîcheur source B1
`odm_b1_source_freshness_report_v1()` retourne :
- registry sources : **35** ;
- sources évaluées : **16** ;
- current : **15** ;
- overdue : **1** ;
- due soon : **0** ;
- blocked unverified : **0** ;
- high risk : **9** ;
- `coverage_complete=false` ;
- `publication_eligible=0` ;
- évaluation persistée datée du **2026-08-05**.

Conclusion : le moteur source est fail-closed côté publication, mais sa couverture est incomplète (16/35).

## Schéma/mécanismes déjà présents
- `source_offer_seeds.canonical_url` possède un index UNIQUE : dédup URL exacte ;
- `property_listings.canonical_fingerprint` possède un index UNIQUE ;
- `property_listings` possède `duplicate_group_id` + `duplicate_score` ;
- `property_clusters` / `property_cluster_members` existent ;
- `owner_listing_representations` possède `dedupe_fingerprint` + `canonical_cluster_key` ;
- `source_offer_observations` possède une clé d’idempotence basée notamment sur `content_fingerprint` et champs observés ;
- des fonctions de fraîcheur existent, dont `odm_audit_freshness_assessment_v2`, `odm_b1_source_freshness_report_v1` et le moteur de refresh B1 ;
- la projection Thin Index possède ses propres états `freshness_status`, mais M4 minimal reste volontairement hors Thin Index/Search.

## Risques / dette constatés
1. **Dédup fragmentée** : URL exacte, fingerprint legacy et clusters existent mais ne forment pas encore un moteur global démontré.
2. **Clusters mono-membre** : impossible de prétendre à un nombre de propriétés uniques.
3. **Fraîcheur seed très incomplète** : 53 642/57 836 sans confirmation fraîche explicite.
4. **Fraîcheur source incomplète** : 16/35 sources évaluées dans l’état B1 actuel.
5. **Contrats historiques hétérogènes** : plusieurs générations ODM utilisent des fenêtres et statuts distincts ; M5 doit les réconcilier avant écriture.

## Contrat recommandé M5
M5 doit séparer deux axes :

### M5-A — Dedup shadow
- calcul read-only/shadow d’un fingerprint de similarité explicable à partir des données réellement autorisées et disponibles ;
- générer des paires/groupes candidats sans muter `property_clusters` ;
- scorer par dimensions stables (ville/quartier/type/intent/surface/prix et identifiants de source quand disponibles) avec règles de tolérance documentées ;
- mesurer faux positifs/faux négatifs sur un échantillon déterministe ;
- seulement après validation, matérialiser des clusters multi-membres.

### M5-B — Freshness hardening
- unifier fenêtres/états sur une politique canonique ;
- ne jamais transformer `last_observed_at` d’un provider d’archive en preuve de fraîcheur ;
- conserver `seed_only` fail-closed sans canal frais admissible ;
- porter la couverture source de 16/35 vers la totalité du registre ou bloquer explicitement les sources non évaluées ;
- aucun Search activation.

## Preuve de cet audit
Toutes les requêtes de baseline ci-dessus ont été exécutées en **SELECT/read-only** contre le projet Supabase AqarFinder. Aucune fonction de refresh, aucun INSERT/UPDATE/DELETE, aucun déploiement n’a été exécuté.

## Next exact
Construire M5-A en shadow/read-only : candidat clustering déterministe + distribution des groupes + échantillon de validation, puis seulement décider d’une matérialisation.
