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

## État UX

- CARTE-QUARTIER-P1A.1 ✅ PR #328 — Geo Canonical Core, **9,5/10** ;
- P1A.2 ✅ PR #334 — `district` structuré dans Search ;
- P1A.3 ✅ PR #349 — Map state/navigation pilotés par URL, **9,3/10** ;
- P1A.4 ✅ PR #350 — Map Design System, cockpit flottant map-first, **9,3/10**, audit **30 captures / 0 finding** ;
- prochain UX : **P1A.5 — Territorial Explorer**.

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
- DATA-4.1A ✅ PR #343 : Avito `unavailable` = 95,06 % bruit/non-immobilier ; seulement **73** core-récupérables, **0 policy-activable** ;
- DATA-4.2 ✅ PR #344 : `daragadir.com` gagne `ADMISSIBLE_GROWTH`, `agenz.ma` gagne `PARTNERSHIP_UPSIDE` ;
- DATA-4.3A→D ✅ : reservoir Dar Agadir audité, sitemap revalidation, freshness shadow et canary dry-run ;
- DATA-4.3E ✅ PR #355 : **10-row production rehearsal**, apply/verify/rollback 10/10 ;
- DATA-4.3F ✅ PR #358 : promotion contrôlée — batch initial 50, hard cap 100/run, **500 avant re-certification**, TTL 14 jours ;
- DATA-4.3G ✅ PR #362 : **premier batch persistant de 50** certifié. Avant → après : Public Search **50→50**, technical display **50→50**, `seed_only 6431→6381`, `fresh_confirmed 102→152`, canal `public_sitemap_presence` 50/50, Registry inchangé, drift 0 %.

## Décision DATA courante

**DATA-4.3H — Controlled Expansion to 500**.

Objectif : étendre la freshness sitemap de façon bornée jusqu’à **500 lignes cumulées maximum avant re-certification**, avec batches ≤100/run, snapshot/rollback, observation Search/display avant-après, TTL 14 jours et arrêt fail-closed au moindre drift >1 % ou changement Registry.

Cela ne modifie pas la display/publication policy et ne constitue pas une autorisation de bulk-promotion des ~5,5K lignes restantes.

En parallèle business : **Agenz = priorité partenariat/feed**, sans changement Registry ou produit avant autorisation écrite.

## Règles d’exécution

Un lot n’est terminé que si : scope respecté, tests/build/gates verts, preuves disponibles, Registry respecté, aucun bypass, PR mergée, production vérifiée si write, rollback disponible si mutation, et les 3 MD canoniques alignés.

## Démarrage local

```bash
npm ci
npm run build
npm test
npm run dev
```

Partir de `.env.local.example`. Ne jamais committer de secret ni utiliser une service-role côté client.
