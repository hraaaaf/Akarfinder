# DATA MASS-X4 — Common Crawl Deep Reservoir Shadow

Objectif : mesurer un réservoir plus profond de représentations URL d'annonces à partir des index Common Crawl, sans toucher aux pages sources ni à la production.

Le lot rejoue le harvester canonique `commoncrawl-reservoir-harvest.ts` sur 14 index déjà utilisés/validés dans le repo : 6 index 2026 et 8 index 2025. Il utilise uniquement l'API d'index CDX et les `listing_url_patterns` des domaines `approved_discovery` du registre de domaine local.

Frontière : metadata-only ; 0 WARC ; 0 source-page fetch ; 0 secret Supabase ; 0 DB access/write ; 0 Registry write ; 0 Search activation ; 0 permission inférée. Un résultat Common Crawl est une capacité de découverte, jamais une autorisation.

Sorties attendues : liste dédupliquée d'URL canoniques compatibles avec les patterns de listing + log de synthèse par domaine, publiés uniquement comme artefact CI.