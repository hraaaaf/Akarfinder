# AkarFinder

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- Produit public : <https://akarfinder.vercel.app>
- Cœur produit : `/search`
- Branche canonique : `main`
- Objectif long terme : **Property Graph du marché immobilier marocain**

## Documentation canonique

1. `README.md` — identité, doctrine et architecture ;
2. `docs/ROADMAP.md` — **roadmap unique de toutes les fenêtres/lane** ;
3. `docs/SESSION.md` — handover opérationnel court ;
4. fichiers spécialisés (ex. `docs/CARTE_ROADMAP.md`) — détail historique uniquement, jamais priorité concurrente.

Ordre de vérité :

`code mergé dans main → README.md → ROADMAP.md → SESSION.md → docs spécialisées → preuves historiques`.

## Doctrine

Pipeline :

`DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION/CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP`

Principes non négociables :

- **MASS FIRST → QUALITY LATER → PARTNER REPLACEMENT OVER TIME** ;
- aucune donnée absente n’est inventée ;
- provenance et canonical URL restent explicables ;
- volume brut ≠ inventaire publiable ;
- robots/sitemap/capability ≠ permission ;
- Source Registry obligatoire et fail-closed avant activation ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- qualité = signal de ranking/enrichissement ; elle ne doit pas, seule, effacer une annonce structurellement et juridiquement admissible ;
- `Shadow → Canary → certification → activation bornée` pour les changements sensibles ;
- une responsabilité = une branche = une PR = une certification.

## Gate universel de qualité

Toute étape significative suit :

`IMPLEMENTATION → DOUBLE CHECK → NOTE /10 → CORRECTIONS → RE-TEST → RE-NOTE → CERTIFICATION`

**Aucun lot n’est CLOSED sous 9,0/10.** Si le score est inférieur, les findings sont ajoutés à `docs/ROADMAP.md` et le lot reste ouvert. Pour UX/UI, mobile reste la référence et doit être ≥9/10 ; pour DATA/Search/Backend, le score inclut correctness, fail-closed/security, tests, performance, observabilité, rollback et cohérence architecture.

## Architecture active

- Next.js 15 / React 19 / TypeScript / Tailwind ;
- Supabase PostgreSQL ;
- Vercel ;
- MapLibre GL ;
- Geo Registry canonique ;
- Source Registry v2 ;
- Observation/Freshness/quality/dedup pipeline ;
- CI GitHub Actions avec gates DATA, Search, UX, accessibilité et build.

## État macro — 2026-08-10

- Search = cœur produit ; mobile 2 colonnes déjà certifié ; desktop doit converger vers une densité 4/3/2 après stabilisation du ranking.
- DATA : DATA-4.9A fermé ; DATA-4.9B a qualifié **2 326 représentations URL détail** sur 10 128 identités net-new, sans les appeler biens uniques ; prochain lot = DATA-4.9C Source Policy Decision.
- Carte : P1C.4A est `DESIGNED_NOT_PROVEN`; Offre quartier publique reste OFF ; preuve DATA exact-scope requise avant tout canary.
- MASS-FIRST Search/Quality : PR #474 en certification. 5 lots codés ; double check provisoire **8,8/10**, donc merge interdit jusqu’à correction/validation ≥9/10.

Pour l’ordre exact et toutes les étapes restantes, lire **`docs/ROADMAP.md`**.
