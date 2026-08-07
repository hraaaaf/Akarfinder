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

AkarFinder est **search-first** et **intelligence-first**. `/search` reste le cœur du produit et le moteur canonique des requêtes immobilières.

`/map` est son complément spatial : **moteur d’exploration géographique et d’intelligence**, pas un second moteur de recherche parallèle. Map, Search, pages SEO et Mon Projet doivent partager la même identité géographique canonique de bout en bout.

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
- tout changement DATA/Search important suit `Shadow → Canary → certification → activation bornée` ;
- aucune frontière de ville/quartier, position exacte, bâtiment, landmark ou proximité n’est fabriqué ;
- une illustration cartographique peut enrichir un landmark réel, mais ne remplace jamais sa géométrie ni sa provenance ;
- sur la carte, **une couleur possède une seule signification active à la fois**.

## Doctrine d’acquisition

AkarFinder applique une doctrine **no-bypass** :

- aucun proxy furtif, stealth, faux Googlebot ou contournement de CAPTCHA ;
- aucun bypass de login, rate limit, restriction d’accès ou contrôle technique ;
- `robots.txt` et sitemap sont des signaux techniques, jamais une licence ;
- une capacité technique détectée (`Houzez`, `RealHomes`, WordPress REST, sitemap, JSON-LD, feed) ne vaut jamais permission d’ingestion ou de réutilisation ;
- une page de confidentialité seule ne vaut pas CGU ni autorisation de réutilisation ;
- une URL « légale » qui redirige vers une page non légale ne vaut pas preuve de CGU ;
- **Source Registry obligatoire avant toute activation** ;
- `DISCOVERED ≠ AUDITED ≠ AUTHORIZED ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- distinction stricte entre contenu partenaire/autorisé, résultat public indexé et signal marché interne.

## Architecture active

- Next.js 15 App Router ;
- React 19 et TypeScript ;
- Tailwind CSS ;
- Supabase PostgreSQL comme base canonique ;
- Vercel pour build et exécution ;
- MapLibre GL comme moteur de rendu cartographique ;
- Geo Registry comme autorité d’identité ville/quartier ;
- `/map` consomme les quartiers via `lib/map/canonical-neighborhood-data.ts` ;
- **CARTE-QUARTIER-P1A.1 / PR #328** : Geo Canonical Core certifié, score **9,5/10** ;
- **CARTE-QUARTIER-P1A.2 / PR #334** : `district` est désormais un filtre Search structuré, indépendant de `q`, avec routing fail-closed par capacité ;
- migrations SQL versionnées ;
- CI GitHub Actions avec tests, build, contrats DATA, accessibilité et preuves ciblées ;
- **DATA-1.5 / PR #331** : Technical Capability Audit, 20 domaines P0, 19 review-ready, score **9,4/10** ;
- **DATA-1.6A / PR #333** : Source Policy Evidence Review, 19 sources, score **9,5/10**, zéro write/policy/auth/bypass/WARC ;
- **DATA-1.6B / PR #338 + hotfix #339** : 19 sources enregistrées dans `source_policy_registry` en gouvernance conservatrice, **0 source activée**, score final **9,6/10**.

### DATA-1.6B — état production certifié

La migration `data_1_6b_source_registry_assignment` est appliquée et enregistrée dans Supabase.

Résultat :

- **19/19** nouvelles lignes de gouvernance ;
- authorization : **1 prohibited / 3 permission_required / 15 unverified** ;
- acquisition : **1 blocked / 18 public_index_internal_only** ;
- detail fetch : **1 prohibited / 3 permission_required / 11 legal_review_required / 4 paused** ;
- display : **1 blocked / 18 internal_signal_only** ;
- `display_gate=hidden` : **19/19** ;
- états activants : **0** ;
- direct fetch : **0** ;
- partner assignment : **0**.

`prestigeimmo.ma` est explicitement hard-blocked : `prohibited / blocked / hidden / no-bypass`.

La première tentative d’application a échoué **atomiquement avant tout insert** parce que `execution_score` est une colonne PostgreSQL `GENERATED ALWAYS`. PR #339 a retiré cette colonne de l’INSERT et ajouté un test de non-régression. Aucun état partiel n’a existé ; la seconde application a réussi et PostgreSQL calcule désormais `execution_score` automatiquement.

## Règles d’exécution

Chaque lot doit respecter :

- une responsabilité claire ;
- une branche ;
- une PR ;
- un merge ;
- migrations séparées du code applicatif ;
- tests et preuves avant validation ;
- aucune décision UX/UI structurante prise sans discussion préalable ;
- aucun contournement temporaire présenté comme solution finale ;
- **double-check obligatoire après chaque étape UX/UI** ;
- **score UX/UI documenté : minimum 9,0/10 pour avancer** ;
- certification mobile et desktop adaptée au périmètre ;
- en fin de lot, `README.md`, `docs/ROADMAP.md` et `docs/SESSION.md` sont relus et alignés avec l’état réellement livré.

## Démarrage local

```bash
npm ci
npm run build
npm test
npm run dev
```

Variables d’environnement : partir de `.env.local.example`. Ne jamais committer de secret ni utiliser une clé service-role côté client.
