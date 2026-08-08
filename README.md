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
- Observation/Freshness/quality/dedup pipeline ;
- CI GitHub Actions avec gates DATA, UX, accessibilité et build.

## État UX / Carte

- CARTE-QUARTIER-P1A.1 ✅ PR #328 — Geo Canonical Core, **9,5/10** ;
- P1A.2 ✅ PR #334 — `district` structuré dans Search ;
- P1A.3 ✅ PR #349 — Map state/navigation pilotés par URL, **9,3/10** ;
- P1A.4 ✅ PR #350 — Map Design System, cockpit flottant map-first ;
- P1A.5 ✅ PR #365 — Territorial Explorer **Maroc → ville → quartier**, **9,3/10** ;
- P1A.6 ✅ PR #369 — Responsive hardening, **12 captures / 0 finding**, **9,2/10** ;
- P1B.1 ✅ PR #371 — AkarFinder Map Visual Layer, **3 captures / 0 finding**, **9,1/10** ;
- P1B.2 ✅ PR #376 — Sourced Territorial Intelligence `layer=price`, benchmarks quartier exacts, aucune interpolation/fallback ville, **3 captures / 0 finding**, **9,2/10** ;
- P1B.3 🔴 PR #382 — **Territorial Metric Join Contract** : pont fail-closed `LISTING public/displayable → résolution géographique explicite → quartier canonique validé`, couverture/collisions sur un dénominateur unique, aucune inférence et `metric_layers_activated=false`. Gate PostgreSQL spécialisé vert sur le head revu ; merge, post-merge et rapport production read-only encore requis avant certification.

Le futur mode **Offre** quartier n’est autorisé que si le rapport production P1B.3 montre une couverture suffisante et aucune collision latest. Sinon le prochain lot corrige d’abord la couverture géographique.

## État DATA acquis

### DATA-1 — Census / Registry ✅

- réserve B3 : **37 009 URLs / 7 051 domaines** ;
- Common Crawl : **300/300 Parquet**, **8 727 registered domains** ;
- univers réconcilié : **15 238 domaines** ;
- 230 `PRIMARY_SOURCE_CANDIDATE` ;
- 625 `PORTAL_CANDIDATE` ;
- DATA-1.5 → DATA-1.6B : capability + policy + Registry, **0 activation non autorisée**.

### DATA-4 — Reservoir Strategy

- DATA-4.0 ✅ PR #341 : Avito + Mubawab = **35 134 normalized**, **3 588 technical display**, **0 policy-activable** ;
- DATA-4.1A ✅ PR #343 : Avito `unavailable` = 95,06 % bruit/non-immobilier ; seulement **73** core-récupérables ;
- DATA-4.2 ✅ PR #344 : `daragadir.com` = `ADMISSIBLE_GROWTH`, `agenz.ma` = `PARTNERSHIP_UPSIDE` ;
- DATA-4.3A → H ✅ jusqu’à PR #377 : Dar Agadir certifié au cap **500**, TTL 14 jours, Search **500/500**, technical display **500/500**, drift **0 %**, Registry inchangé ;
- DATA-4.3I ✅ PR #367 : ownership fraîcheur multi-canal protégé ;
- DATA-4.3J ✅ PR #368 : ordre du trigger display corrigé ;
- DATA-4.4A ✅ PR #379, merge `43d8086c` : qualification read-only du second réservoir ;
- DATA-4.4B ✅ PR #380, merge `13b6c3c` : Promo Immo revalidé sur signaux publics actuels ; **3 130 URLs sitemap**, **2 935** dans le réservoir, **2 456** lignes conservatrices éligibles ; canary **50/50** préparé pour Search, technical display, quality A/B et rollback ; **0 write** dans le LOT.

## Décision DATA courante

**DATA-4.4B est fermé. Prochain lot : DATA-4.4C — Persistent Canary 50**, écriture transactionnelle réelle des 50 lignes, puis re-certification production avec drift ≤1 % et rollback immédiat sur anomalie.

En parallèle business : **Agenz = priorité partenariat/feed**, sans changement Registry ou produit avant autorisation écrite.

## Règles d’exécution

Un lot n’est terminé que si : scope respecté, revue indépendante, tests/build/gates verts, preuves disponibles, Registry respecté, aucun bypass, PR mergée, post-merge vérifié, production vérifiée si applicable, rollback disponible si mutation, et les 3 MD canoniques alignés.

## Démarrage local

```bash
npm ci
npm run build
npm test
npm run dev
```

Partir de `.env.local.example`. Ne jamais committer de secret ni utiliser une service-role côté client.
