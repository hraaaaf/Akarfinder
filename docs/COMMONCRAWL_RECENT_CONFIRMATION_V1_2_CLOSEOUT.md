# Common Crawl Recent Confirmation V1.2 — Closeout

**Date : 2026-08-31**  
**État : CLOSED**

## Goal

Augmenter réellement les résultats externes minimaux servis à partir de preuves Common Crawl récentes, sans inventer de fraîcheur, sans élargir les règles d'admission exact-URL et sans réutiliser le contenu des pages source.

## Succès

- provenance temporelle CDX certifiée de bout en bout ;
- cause réelle des rejets identifiée sur les seeds encore récentes ;
- patch limité au blocage démontré ;
- CI verte avant merge ;
- migration Production appliquée ;
- batch live activé avec delta strict exact ;
- aucune fuite de contenu riche ;
- rollback conservé.

## Preuves

### Provenance temporelle

Chaîne certifiée :

`Common Crawl CDX capture timestamp -> last_cdx_timestamp -> cdxTimestampToIso -> source_offer_seeds.last_observed_at`

Code de référence :
- `scripts/openserp/commoncrawl-bulk-seed-harvest.ts` ;
- `lib/acquisition-scale-v1/commoncrawl-mass-seeds.ts`.

Le timestamp d'ingestion n'est pas substitué au timestamp de capture CDX.

### Analyse des gates

Sur les trois sources supportées par le flow V1 :

- `agenz.ma` : 3 571 `seed_only` ;
- `masaken.ma` : 1 108 `seed_only` ;
- `kawtarimmobilier.com` : 79 `seed_only` ;
- total : **4 758**.

Gate exact-URL : **4 758 / 4 758 acceptées**. Aucun élargissement regex n'était justifié.

À la date du lot, 13 URLs restaient dans la fenêtre policy de 14 jours. Les 13 passaient URL + CDX 200 + HTML + document vierge + type + intent ; les 13 échouaient sur la récupération de ville.

### Dry-run sûr

Récupération URL-only retenue :

- Dar Bouazza / `agenz.ma` : 6 URLs ;
- Benslimane / `agenz.ma` : 5 URLs ;
- Bouznika / `masaken.ma` : 1 URL ;
- total : **12 URLs**, **10 identifiants provider numériques distincts**.

Une URL `M'diq-Fnideq` reste volontairement fail-closed car le token correspond à une zone/préfecture plus large et ne suffit pas à attribuer une ville unique.

### Patch

PR **#957** : `fix(index): recover safe cities for recent Common Crawl confirmations`  
Merge squash : `9fbfc94e784ed0602aafd0e7f95a2b15700b413b`

Migration repo :
`supabase/migrations/20260831094500_commoncrawl_recent_confirmation_v1_2_city_recovery.sql`

Le premier patch global a été rejeté avant merge après mesure de sa portée parasite. La version mergée utilise uniquement `odm_commoncrawl_recent_city_v1(source_domain,url)` et laisse `odm03_recover_city` / `odm04_normalize_city` inchangées.

Gate dédié : GitHub Actions **33380261508**, SUCCESS. Contrat V1.2 et TypeScript SUCCESS. Les autres gates du HEAD PR étaient également verts avant squash.

### Production DB

Migration Supabase appliquée :
`20260831100334 commoncrawl_recent_confirmation_v1_2_city_recovery`

Preuve de portée :
- helper présent ;
- `anon EXECUTE=false` ;
- `authenticated EXECUTE=false` ;
- `service_role EXECUTE=true` ;
- global recover Dar Bouazza = `NULL` ;
- global normalize Dar Bouazza = `NULL` ;
- helper isolé Dar Bouazza = `Dar Bouazza`.

Après migration, candidats live : **12** exactement :
- Dar Bouazza : 6 ;
- Benslimane : 5 ;
- Bouznika : 1.

Batch live : `cb4aedee-1f8a-410e-b9de-c3c9abd348c1`

Pré-activation : 12/12 encore éligibles, 0 fuite de contenu.

Activation :
- strict-served avant : **2 005** ;
- lignes activées : **12** ;
- strict-served après : **2 017** ;
- delta : **+12 exact** ;
- `content_rows_exposed=0` ;
- `detail_fetch_performed=false` ;
- `content_reuse_performed=false` ;
- rollback disponible.

Post-activation :
- 12/12 `fresh_confirmed` ;
- 12/12 `fresh_last_seen_at = last_observed_at` ;
- 12/12 evidence `recent_cdx_200_html` / V1.2 ;
- 12/12 `LISTING` + HIGH confidence ;
- 12/12 éligibles ;
- 0 titre/snippet/prix/surface exposé ;
- candidats V1.2 restants : **0** ;
- strict-served confirmé : **2 017**.

### Rollback

Le chemin rollback V1 avait déjà été exercé sur un batch réel de 30 lignes. Les mêmes 30 lignes ont ensuite été préparées de nouveau ; comparaison des snapshots originaux avant réactivation :
- seed mismatch : 0 ;
- core document mismatch : 0 ;
- quality/display/ranking mismatch : 0.

## Conclusion

Le lot convertit **12 URLs externes minimales réellement servables**. Il ne transforme pas 12 URLs en 12 propriétés uniques et n'ouvre pas un réservoir de masse : le pool V1.2 admissible est désormais épuisé (`0` candidat restant).

Le prochain gain significatif doit venir d'un nouveau réservoir récent et autorisé, pas d'un élargissement artificiel des regex ou de la fraîcheur.

Aucun déploiement Vercel n'a été effectué.
