# Akarfinder — R0 audit lecture seule vers 200K frais — 04/11/2026

**Statut : R0-CODE_AUDIT_COMPLETE / R0-LIVE_DB_BLOCKED.**  
**Goal :** mesurer le stock réellement exploitable, vérifier la chaîne de production et identifier les gardes avant de compter 200 000 biens actifs et distincts.
**Succès du lot R0 complet :** inventaire SQL actuel par source, âge, activité, droits et dédup physique, plus audits de side-effects. **Non atteint** : la base connectée est inactive. Aucune valeur live de `fresh_unique_eligible` ne peut être annoncée.

## 1. Baseline observable, source et portée

| Mesure | Preuve au 04/11/2026 | Statut |
|---|---|---|
| Projet Supabase connecté `AqarFinder` (`kusfiyimwvxblvsrhaes`) | `list_projects` et `get_project` renvoient indépendamment `INACTIVE` | **Confirmé** |
| Accès tables Supabase | `list_tables` (lecture seule) échoue : `Database is possibly not accessible at the moment` | **Bloqué**, aucune restauration tentée |
| Nombre exact actuel de `property_listings` | Aucun SQL possible sur le projet connecté ; autres éventuelles bases non certifiées comme source effective | **UNKNOWN** |
| Nombre actuel de biens actifs/frais/publiables | Aucun flux/statut positif indépendant et aucun comptage SQL live | **UNKNOWN** |
| Réservoir historique Avito/Mubawab | CI #41322759990 : 32 460 clés `(source, source_id)`, 32 460 `UNVERIFIED`, 0 `ready_for_use`; Avito 27 106 + Mubawab 5 354 | **Historique vérifié**, pas un stock actif |
| V6.4.6 Mubawab | 3 pages live PASS, 97 IDs-source le 04/11 ; nouvelle politique réseau non validée live | **Qualité P1 limitée** ; pas 97 nouveaux biens physiques |
| Revue MASS-2F | 101 domaines, 43 PERMISSION_REQUIRED, 58 HOLD, 0 source activable par cette revue | **Historique de policy**, pas licence |
| Grand réservoir MASS-1 | Snapshot de 2026-08-12 : 199 381 lignes `discovery_candidates`, 101 131 URL de découverte distinctes, 56 812 Thin Index, 24 028 structures de détail probables au Maroc | **Historique uniquement**, URLs ≠ biens |

Preuves : [reservoir #41322759990](https://github.com/hraaaaf/Akarfinder/actions/runs/41322759990), [MASS-1](../data/DATA-MASS-1-RESERVOIR-QUALIFICATION.md), [MASS-2F](../data/DATA-MASS-2F-FINAL-CERTIFICATION.md), [V646](../reviews/MUBAWAB_V646_DIRECT_CANARY_RUN_2026-11-04.md).

### Portée du code inspecté

Référentiel GitHub `hraaaaf/Akarfinder`, `main@c02d0b73ed18b0e136d478fab39e71df425173a7` ; fichiers vérifiés à la lecture :
- `lib/feeds/schema.ts`, `parsers.ts`, `staging.ts`, `partner-v2-bridge.ts`;
- `lib/freshness-lifecycle/freshness-lifecycle-engine.ts`, `lib/seed-freshness/{matcher,job}.ts`;
- `scripts/audits/data-mass-1-reservoir-qualification.ts`;
- `scripts/import-partner-csv.ts`;
- `.github/workflows/morocco-web-l8-{mubawab-exhaustive,avito-sitemap}.yml`, `live-sarouty-full.yml`, `data-mass-1-current-readonly-refresh.yml`, `lot-b3-4-1-feed-contract-quarantine.yml`;
- `scripts/acquisition/{mubawab-supabase-shard-runner,avito-supabase-shard-runner}.mjs` et `mubawab-exhaustive-enumerator.mjs`.

C'est un **audit ciblé**, pas une preuve exhaustive des 555 workflows `.github/workflows/` ou de tous les wrappers DB existants. Ne pas exécuter des workflows massifs ou avec `SERVICE_ROLE_KEY` sans revue propre à chaque run.

## 2. Ce qui existe réellement (ne pas réimplémenter)

1. **Flux directs :** `parseCsvFeed`, `parseJsonFeed`, `parseXmlFeed` → `validateFeedRow` → `stageFeed`. Fonctions de staging pures, identités `source_name::external_id` ou URL canonique, rejets et signaux `delete/unpublish`. Pas de wrapper réel de publication dans `staging.ts`; doublons repérés **dans un feed**, pas biens physiques multi-sites.
2. **Contrat de quarantaine DB :** `docs/data/LOT-B3-4-1-FEED-CONTRACT-QUARANTINE.md` et migration associée prévoient imports/lignes/audit, par défaut non publiables, fichier max 20 MiB. **Implémentation appliquée à la DB actuelle non observable**.
3. **Fraîcheur interne :** `evaluateFreshnessLifecycle` calcule un état et un score depuis le journal d'observations ; sa documentation indique clairement que ce sont des projections **et non une preuve de disponibilité réelle**. `seed-freshness/matcher.ts` appelle `fresh_confirmed` un URL exact réobservé dans une découverte au plus âgée de **30 jours** : signal utile mais **insuffisant** pour SLA « actif confirmé en 48 h ».
4. **Inventaire read-only :** `scripts/audits/data-mass-1-reservoir-qualification.ts` utilise des GET REST paginés et ne fait aucune insertion. Le workflow `data-mass-1-current-readonly-refresh.yml` est prévu pour `main`, mais exige la base accessible et un `SERVICE_ROLE_KEY` ; **non lancé ici**.
5. **Collecteurs L8 :** Mubawab/Avito possèdent des modes de découverte bornés ; `mubawab-supabase-shard-runner.mjs` et `avito-supabase-shard-runner.mjs` interrogent l'ancien réservoir par GET pour choisir des shards, puis accèdent aux sites. Leurs workflows ne sont **pas des inventaires SQL complets de production** et ne doivent pas être déclenchés pour R0.
6. **Legacy CSV :** `scripts/import-partner-csv.ts` n'accepte que `--dry-run` ; sa fonction lève explicitement une erreur hors mode dry-run, les écritures directes ont été désactivées par la frontière P5.

## 3. Risques de vérité identifiés dans le code (avant R1)

| Priorité | Référence exacte | Observation | Conséquence / exigence |
|---|---|---|---|
| **P0** | `lib/feeds/partner-v2-bridge.ts` | `authorization_status: "partner_authorized"` est posé depuis un simple `PartnerFeedV2Context.source_authorization_note`, sans contrôle documentaire ici | Un simple texte ne prouve pas les droits ; nécessiter un gate d'autorisation vérifié hors du bridge |
| **P0** | idem | `availability_status: "available"` est posé pour toute ligne non retrait | Une annonce nouvelle ne prouve pas « active » ; passer par statut de disponibilité vérifié, inconnu sinon |
| **P0** | idem, `safeUpdateTime()` | `updated_at_source` absent/invalide devient `now` | Risque de fraîcheur artificielle ; ne pas confondre date de conversion et preuve de mise à jour source |
| **P1** | `lib/feeds/schema.ts` | `images_rights_confirmed` est un booléen fourni par le feed ; URLs d'image conservées sur cette seule assertion | Preuve de droits externe nécessaire avant affichage, ne jamais inférer une licence de la donnée |
| **P1** | `lib/feeds/staging.ts` | Déduplication `source+external_id` ou URL, doublons internes `seenThisRun` | Il manque ici la preuve de déduplication conservatrice entre plusieurs portails au niveau du bien physique |
| **P1** | `lib/freshness-lifecycle/freshness-lifecycle-engine.ts` + `lib/seed-freshness/matcher.ts` | Scores de fraîcheur et découverte récente existent déjà mais ne certifient pas l'activité réelle | Ne jamais alimenter `fresh_unique_eligible` à partir de ces scores seuls |
| **P1** | Workflows L8 et MASS-1 | Différentes voies possèdent des accès à des secrets et/ou des requêtes externes ; des preuves `zeroDbWrites` existent pour certains runs seulement | Gate individuel de side-effects et de périmètre source avant activation |

**Nuance :** les P0 décrivent une **possibilité d'inférence dans le bridge**, pas une preuve de publication non autorisée ni d'écritures prod. Le patch doit être testé sur une branche isolée et ne pas casser les signaux `delete/unpublish`.

## 4. Questionnaire SQL read-only, à exécuter seulement lorsque la DB réellement servie est accessible

**Étape A — Vérifier source effective et colonnes (lecture seule) :**

```sql
SELECT current_database() AS database_name, now() AS observed_at_utc;
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
  'property_listings', 'listing_sources', 'discovery_candidates',
  'source_offer_seeds', 'source_offer_observations',
  'source_policy_registry', 'partner_feed_sources',
  'partner_feed_imports', 'partner_feed_import_rows'
)
ORDER BY table_name, ordinal_position;
```

**Étape B — Reprendre les requêtes exactes de comptage uniquement après validation du schéma :**
- `COUNT(*)` par table effectivement présente et par source réelle ;
- `COUNT(DISTINCT (source,source_id))` vs groupes de propriétés physiques attestés, jamais leur somme ;
- distribution des statuts de retrait, date `last_active_verified_at` (ou colonne équivalente validée), ancienneté, accès/permission enregistrés ;
- `COUNT(*)` où **activité positive** ET preuve <=48 h ET droits adaptés ET qualité ET groupes physiques uniques ;
- couverture des villes, champs manquants, p90 de délai de mise à jour, erreurs, `delete/unpublish` et churn.

**Ne pas inventer** de colonnes sur la seule base des docs : l'étape A sert précisément à découvrir le schéma. Pas de SQL sur une DB `INACTIVE` sans disponibilité confirmée, aucune migration/restauration automatique.

## 5. Conclusion et gates

- **R0 code/archives : AUDITÉ**, avec preuves reproductibles et limites explicites.
- **R0 production : BLOQUÉ EXTERNE** ; Supabase connecté `INACTIVE`, `list_tables` échoue ; stock effectif du site et métriques d'activité **UNKNOWN**.
- **R1 prérequis sécurité indépendants :** faire refuser par défaut les droits, la disponibilité et les timestamps source inconnus dans le bridge ; tests négatifs sur ligne `updated_at_source` absente, note de licence vide, image sans preuve, retrait et doublon inter-sources. Les preuves de droits et d'activité viennent de l'amont autorisé, pas des valeurs par défaut.
- **Next exact :** vérifier quel backend DB sert réellement le site ; si c'est Supabase `kusfiyimwvxblvsrhaes`, une décision distincte est requise avant restauration/upgrade potentiellement financière. Une fois actif, exécuter **uniquement** les lectures A/B, mesurer le `fresh_unique_eligible` réel et corriger la roadmap. En parallèle, les tests statiques et les correctifs de gate R1 peuvent être préparés hors production.
- **Ne pas faire :** merge, déploiement Vercel, SQL DDL/DML, crawl massif, contact partenaire, retentative de 3 pages historiques Mubawab.

**Verdict vers 200K : INSUFFICIENT_EVIDENCE**. Les 32 460 clés historiques ne valent pas 32 460 biens actifs ; aucun nouvel objectif temporel n'est justifié sans source et capacité vérifiées.
