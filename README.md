# AkarFinder

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- Produit public : <https://akarfinder.vercel.app>
- Cœur produit : [`/search`](https://akarfinder.vercel.app/search)
- Branche de référence : `main`
- État vérifié le 3 août 2026 : commit `fa983a3`, déploiement Vercel Production `dpl_8XqdkUnMvVRgKVTCU2bNVnXbYg5f`, statut `READY`

## Doctrine

AkarFinder suit le pipeline :

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

Principes non négociables :

- aucune donnée absente n’est inventée ;
- la provenance et la source originale restent visibles ;
- aucun bypass de CAPTCHA, login, rate limit, robots ou restriction d’accès ;
- un sitemap ou un `robots.txt` permissif n’est jamais traité comme une licence de réutilisation ;
- le volume brut n’est jamais présenté comme un inventaire publiable ;
- toute bascule DATA/Search suit `Shadow → Canary → validation → activation bornée`.

## Lire avant toute mission

1. [`docs/START.md`](docs/START.md) — état opérationnel et mission active ;
2. [`docs/ROADMAP.md`](docs/ROADMAP.md) — priorités et gates ;
3. [`docs/PRODUCT.md`](docs/PRODUCT.md) — définition produit ;
4. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture réelle ;
5. [`docs/SCRAPING.md`](docs/SCRAPING.md) — acquisition et gouvernance des sources ;
6. [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — procédure de livraison ;
7. [`docs/VISUAL_SYSTEM.md`](docs/VISUAL_SYSTEM.md) — règles visuelles ;
8. [`docs/DOCUMENTATION_AUDIT_2026-08-03.md`](docs/DOCUMENTATION_AUDIT_2026-08-03.md) — état des 181 fichiers Markdown.

Les fichiers de LOT, audits, activations et rapports sont des **preuves historiques**. En cas de contradiction, `START.md`, `ROADMAP.md`, les règles de Source Registry et le code mergé dans `main` priment.
