# AkarFinder

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- Produit public : <https://akarfinder.vercel.app>
- Cœur produit : `/search`
- Branche canonique : `main`
- Objectif long terme : **Property Graph du marché immobilier marocain**

## Documentation canonique

1. `README.md` — identité, doctrine, architecture et état macro ;
2. `docs/ROADMAP.md` — ordre d’exécution ;
3. `docs/SESSION.md` — handover opérationnel court.

Ordre de vérité :

`code mergé dans main → README.md → ROADMAP.md → SESSION.md → specs techniques → preuves historiques`.

## Doctrine

Pipeline :

`DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION/CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP`

Principes non négociables :

- aucune donnée absente n’est inventée ;
- provenance et canonical URL restent explicables ;
- volume brut ≠ inventaire publiable ;
- robots/sitemap/capability ≠ permission ;
- no-bypass absolu ;
- Source Registry obligatoire avant activation ;
- un registre structurel/patterns ne constitue jamais une autorisation de canal ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- partner/autorisé ≠ public-indexed ≠ signal interne ;
- `Shadow → Canary → certification → activation bornée` pour les changements DATA/Search importants ;
- une responsabilité, une branche, une PR, un merge par lot.

## Architecture active

- Next.js 15 / React 19 / TypeScript / Tailwind ;
- Supabase PostgreSQL ;
- Vercel ;
- MapLibre GL ;
- Geo Registry canonique ;
- Source Registry v2 ;
- P0.1 operational mass-index gate : Source Registry relu dans harvester + importer, trigger DB fail-closed ;
- Observation/Freshness/quality/dedup pipeline ;
- CI GitHub Actions avec gates DATA, UX, accessibilité et build.

## Gouvernance UX / Search

Les lots UX majeurs utilisent désormais un **Benchmark UX/Search Reviewer indépendant** avant certification et après implémentation. Référence : `docs/BENCHMARK_UX_SEARCH_AGENT.md`.

Principes verrouillés :

- **mobile = expérience de référence** ; desktop enrichit sans ajouter de bruit ;
- aucun lot UX majeur n’est certifié avec un score mobile < **9/10** ;
- `/search` vise `RECHERCHE → FILTRES UTILES → RÉSULTATS` ;
- aucun jargon d’architecture interne n’est exposé au grand public sans nécessité ;
- la SERP doit tendre vers un **flux visuel continu**, même si les priorités commerciales/provenance restent appliquées en interne ;
- les cards convergent vers `IMAGE → PRIX → TITRE → LOCALISATION → 3–4 FACTS → PROVENANCE → ACTION` ;
- le Benchmark Reviewer est consultatif obligatoire et peut rendre `CHANGES_REQUIRED` ;
- aucune pratique concurrente n’est copiée automatiquement : elle doit apporter un gain utilisateur compatible avec AkarFinder.

Première mission : `BENCHMARK-SERP-1`, rapport dans `docs/BENCHMARK_SERP_1_REPORT.md`.

### SEARCH-UX-FAST-1 ✅ PR #390

Premier lot produit issu du benchmark : chemin direct vers la première annonce, sans modifier ranking, prix, ordre commercial, cards, DATA ou logique Map.

Preuves de certification :

- mobile **360×800** : première annonce `1538 px → 450 px`, Search à `69 px`, zéro overflow ;
- mobile **390×844** : première annonce à `450 px`, zéro overflow ;
- desktop **1280×800 / 1440×900** : première annonce à `328 px`, zéro overflow ;
- hero Search, prose de ranking et prompt projet retirés du chemin critique ;
- `SearchPriceExplorerDock` conservé mais déplacé **après** le flux primaire de résultats ;
- Option A des types de biens conservée derrière `Filtres` ;
- gate permanent `SEARCH-UX-FAST-1 Gate` : contrat/types + build + Chromium 4 viewports ;
- **25/25 workflows exact-head verts** avant closeout ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,3/10, desktop 9,2/10** ;
- Reviewer technique : **PASS**.

### SEARCH-WORDING-PURITY-1 ✅ PR #391

Deuxième lot Search : simplification du vocabulaire public sur Search/Home, sans modifier ranking, ordre commercial, récupération de prix, DATA, Registry, structure des cards ou logique Map.

Résultat certifié :

- libellés d’architecture retirés des surfaces transactionnelles : `indexé`, `observé`, `analysé`, `analyse partielle`, `niveau d’information`, `passeport local factuel`, `écart descriptif`, etc. ;
- informations de confiance utiles conservées en langage simple : source externe, informations limitées, détails utiles, résultats proches, quartier en chiffres ;
- prudence dédup conservée : un regroupement peut correspondre au même bien **sans certitude** ;
- `search-truth-tier` conserve exactement les mêmes branches `observed/analyzed/partial`, le même collapse et le même ordre ; seules les chaînes publiques changent ;
- mobile **360×800 / 390×844** : première annonce à **398 px**, visible dans le premier écran, zéro overflow ;
- desktop **1280×800 / 1440×900** : première annonce à **328 px**, zéro overflow ;
- Search et Home : **0 expression retirée détectée** sur les 4 viewports Chromium ;
- gate permanent `SEARCH-WORDING-PURITY-1 Gate` : contrats + TypeScript + build + Chromium ;
- **23/23 workflows exact-head verts** avant closeout documentaire ;
- Benchmark UX/Search Reviewer : **PASS — mobile 9,4/10, desktop 9,3/10** ;
- Reviewer technique : **PASS**.

Prochain lot UX/Search séparé : **SEARCH-CONTINUOUS-FLOW-1**.

## État UX / Carte

- CARTE-QUARTIER-P1A.1 ✅ PR #328 — Geo Canonical Core, **9,5/10** ;
- P1A.2 ✅ PR #334 — `district` structuré dans Search ;
- P1A.3 ✅ PR #349 — Map state/navigation pilotés par URL, **9,3/10** ;
- P1A.4 ✅ PR #350 — Map Design System, cockpit flottant map-first ;
- P1A.5 ✅ PR #365 — Territorial Explorer **Maroc → ville → quartier**, **9,3/10** ;
- P1A.6 ✅ PR #369 — Responsive hardening, **12 captures / 0 finding**, **9,2/10** ;
- P1B.1 ✅ PR #371 — AkarFinder Map Visual Layer, **3 captures / 0 finding**, **9,1/10** ;
- P1B.2 ✅ PR #376 — Sourced Territorial Intelligence `layer=price`, benchmarks quartier exacts, aucune interpolation/fallback ville, **3 captures / 0 finding**, **9,2/10** ;
- P1B.3 ✅ PR #382, merge `dca48b2c` — **Territorial Metric Join Contract** fail-closed, post-merge gate vert ; rapport production initial : **15 399 listings éligibles / 0 résolution quartier / 0 collision / 0 conflit / 0 % coverage**, `metric_layers_activated=false` ;
- P1B.4 ✅ PR #386, merge `5ab84bcf` — **Geo Coverage Recovery pilot** : preuve explicite `property_listings.district` uniquement, alias Geo Registry exact + ville parente exacte, aucune inférence/fuzzy/spatiale. Preflight **69/69**, write transactionnel **69/69**, **14 quartiers / 5 villes**, rollback append-only disponible. Rapport P1B.3 après write : **15 395 listings éligibles / 69 résolus / 0,45 % coverage / 0 collision / 0 conflit / 0 geo canonique manquante**. Post-merge gate `31254967688` vert ; rollback non requis ; `metric_layers_activated=false`.

La couche **Offre par quartier reste interdite** : 0,45 % de couverture ne justifie aucun choroplèthe national. La prochaine étape Carte poursuit la récupération géographique explicite et certifiable ; aucune couverture n’est fabriquée.

## État DATA acquis

### DATA-1 — Census / Registry ✅

- réserve B3 : **37 009 URLs / 7 051 domaines** ;
- Common Crawl : **300/300 Parquet**, **8 727 registered domains** ;
- univers réconcilié : **15 238 domaines** ;
- 230 `PRIMARY_SOURCE_CANDIDATE` ;
- 625 `PORTAL_CANDIDATE` ;
- DATA-1.5 → DATA-1.6B : capability + policy + Registry, **0 activation non autorisée**.

### P0.1 — Mass Index Source Registry Operational Gate — PR #392

P0.1 ne crée pas de nouveau Registry et n’accorde aucune permission. Il ferme le décalage entre le registre structurel historique des URL patterns et la policy production.

Contrat :

- le harvester Common Crawl relit `public.source_policy_registry` avant le premier appel CDX ;
- l’importer relit la policy avant toute écriture afin qu’un artefact ancien ne puisse pas s’auto-autoriser ;
- PostgreSQL protège ensuite `source_offer_seeds` avec un trigger fail-closed ;
- admission seulement sur domaine exact + canal exact `commoncrawl` + no-bypass + policy hash + review/date valides + acquisition/machine/ingestion non bloqués ;
- `next_review_at` réel est vérifié, même si un ancien label `review_status` n’a pas encore été recalculé ;
- identité source/provider immuable pour les seeds Common Crawl ;
- insert Common Crawl = `seed_only` : Common Crawl ne fabrique jamais la fraîcheur ;
- aucune row historique n’est supprimée ou réécrite automatiquement.

Audit live read-only pendant le LOT : **16** candidats structurels, **9** autorisés pour `commoncrawl`, **7** refusés fail-closed (**6 canal non autorisé + 1 policy expirée**). Les 9 domaines admis sont : `1immo.ma`, `agenz.ma`, `avito.ma`, `barnes-marrakech.com`, `kawtarimmobilier.com`, `masaken.ma`, `mouldar.com`, `mubawab.ma`, `soukimmobilier.com`.

Dette historique mesurée : **1 734** rows `commoncrawl_cdx` sur 6 domaines dont la policy actuelle n’autorise plus ce canal. **65** ont été confirmées ensuite par une observation live distincte ; P0.1 ne fait donc aucune blind-quarantine. Il bloque la récidive et expose la dette pour un éventuel LOT séparé.

Migration : `supabase/migrations/20260808150000_p0_1_mass_index_source_registry_operational_gate.sql`. Activation uniquement après merge du head certifié, puis vérification rapport/trigger/advisors. Rollback non destructif : suppression du trigger et des fonctions P0.1 ; aucune row historique n’est mutée par la migration.

### DATA-4 — Reservoir Strategy

- DATA-4.0 ✅ PR #341 : Avito + Mubawab = **35 134 normalized**, **3 588 technical display**, **0 policy-activable** ;
- DATA-4.1A ✅ PR #343 : Avito `unavailable` = 95,06 % bruit/non-immobilier ; seulement **73** core-récupérables ;
- DATA-4.2 ✅ PR #344 : `daragadir.com` = `ADMISSIBLE_GROWTH`, `agenz.ma` = `PARTNERSHIP_UPSIDE` ;
- DATA-4.3A → H ✅ jusqu’à PR #377 : Dar Agadir certifié au cap **500**, TTL 14 jours, Search **500/500**, technical display **500/500**, drift **0 %**, Registry inchangé ;
- DATA-4.3I ✅ PR #367 : ownership fraîcheur multi-canal protégé ;
- DATA-4.3J ✅ PR #368 : ordre du trigger display corrigé ;
- DATA-4.4A ✅ PR #379, merge `43d8086c` : qualification read-only du second réservoir ;
- DATA-4.4B ✅ PR #380, merge `13b6c3c` : Promo Immo revalidé sur signaux publics actuels ; **3 130 URLs sitemap**, **2 935** dans le réservoir, **2 456** lignes conservatrices éligibles ; canary **50/50** préparé pour Search, technical display, quality A/B et rollback ; **0 write** dans le LOT ;
- DATA-4.4C ✅ PR #384, merge `ba65943a` : protection du Thin Index sur les writes freshness-only, migration production appliquée puis canary persistant exact **50/50**. Revalidation publique 4.4B rejouée juste avant write avec cohorte immuable ; post-certification : Search **50/50**, technical display **50/50**, quality A/B **50/50**, projection préservée **50/50**, drift **0 %**, Registry inchangé. Promo Immo = **3 005 total / 59 fresh_confirmed / 2 946 seed_only / 50 public_sitemap_presence** ; rollback disponible mais non requis.

## Décision DATA courante

**DATA-4.4C est fermé et certifié en production. P0.1 doit être fermé jusqu’à son activation post-merge.** P0.1 n’autorise aucune expansion automatique, aucun nouveau scraper direct et aucune évolution de policy. Le prochain LOT mass-index sera défini explicitement après certification production de P0.1.

En parallèle business : **Agenz = priorité partenariat/feed**, sans changement Registry ou produit avant autorisation écrite.

## Règles d’exécution

Un lot n’est terminé que si : scope respecté, revue indépendante, tests/build/gates verts, preuves disponibles, Registry respecté, aucun bypass, PR mergée, post-merge vérifié, production vérifiée si applicable, rollback disponible si mutation, et les 3 MD canoniques alignés.

Pour un lot UX majeur : `Builder → Benchmark UX/Search Reviewer → Reviewer technique → Release Certifier → merge → post-merge`.

## Démarrage local

```bash
npm ci
npm run build
npm test
npm run dev
```

Partir de `.env.local.example`. Ne jamais committer de secret ni utiliser une service-role côté client.