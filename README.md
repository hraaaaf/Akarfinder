# AkarFinder

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- Produit public : <https://akarfinder.vercel.app>
- Cœur produit : [`/search`](https://akarfinder.vercel.app/search)
- Branche canonique livrée : `main`
- Objectif long terme : **Property Graph du marché immobilier marocain**

## Documentation canonique

Le projet possède exactement **trois documents de pilotage** :

1. [`README.md`](README.md) — identité, doctrine, architecture et démarrage ;
2. [`docs/ROADMAP.md`](docs/ROADMAP.md) — priorités, lots, dépendances et ordre d’exécution ;
3. [`docs/SESSION.md`](docs/SESSION.md) — état opérationnel courant et prochaine action exacte.

Tout autre fichier Markdown est une **spécification technique**, une **politique**, une **preuve historique** ou une **archive**. Il ne peut jamais redéfinir l’état courant, la priorité active ou la vision du projet.

En cas de contradiction :

`code réellement mergé dans main → README.md → ROADMAP.md → SESSION.md → spécifications techniques → preuves historiques`.

Aucun nouveau document de roadmap, session, handover, statut ou contexte ne doit être créé sans décision explicite du propriétaire du projet.

## Doctrine produit

AkarFinder est **search-first** et **intelligence-first**. `/search` reste le cœur du produit.

Pipeline canonique :

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

Principes non négociables :

- aucune donnée absente n’est inventée ;
- une annonce est une observation de source, pas automatiquement une propriété unique ;
- plusieurs observations peuvent représenter une même propriété potentielle ;
- provenance, canonical URL et divergences restent explicables ;
- le volume brut n’est jamais présenté comme un inventaire publiable ;
- les scores de qualité, fiabilité, prix et complétude restent distincts ;
- aucune source n’est qualifiée de partenaire sans relation ou autorisation explicite ;
- aucune image, galerie, coordonnée ou donnée de contact n’est réutilisée sans droit établi ;
- tout changement DATA/Search important suit `Shadow → Canary → certification → activation bornée`.

## Doctrine d’acquisition

AkarFinder applique une doctrine **no-bypass** :

- aucun proxy furtif, stealth, faux Googlebot ou contournement de CAPTCHA ;
- aucun bypass de login, rate limit, restriction d’accès ou contrôle technique ;
- `robots.txt` et sitemap sont des signaux techniques, jamais une licence ;
- Source Registry obligatoire avant toute activation ;
- distinction stricte entre contenu partenaire/autorisé, résultat public indexé et signal marché interne.

## Architecture active

- Next.js 15 App Router ;
- React 19 et TypeScript ;
- Tailwind CSS ;
- Supabase PostgreSQL comme base canonique ;
- Vercel pour build et exécution ;
- MapLibre GL pour la cartographie ;
- migrations SQL versionnées ;
- CI GitHub Actions avec tests, build, contrats DATA, accessibilité et preuves ciblées.

Les spécifications détaillées sous `docs/` restent consultables lorsqu’un lot les concerne, mais ne sont pas des documents de pilotage.

## Règles d’exécution

Chaque lot doit respecter :

- une responsabilité claire ;
- une branche ;
- une PR ;
- un merge ;
- migrations séparées du code applicatif ;
- tests et preuves avant validation ;
- aucune décision UX/UI structurante prise sans discussion préalable ;
- aucun contournement temporaire présenté comme solution finale.

## Démarrage local

```bash
npm ci
npm run build
npm test
npm run dev
```

Variables d’environnement : partir de `.env.local.example`. Ne jamais committer de secret ni utiliser une clé service-role côté client.
