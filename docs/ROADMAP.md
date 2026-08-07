# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-07**  
**Statut : UX P1A.4 ✅ / P1A.5 prochain ; DATA-4.3D ✅ PR #353 / DATA-4.3E prochain**

`README.md` définit l’identité/doctrine. `docs/SESSION.md` porte le handover court. Ce fichier est l’unique roadmap.

# 1. Cap produit

AkarFinder = **moteur de recherche immobilier + index national + couche d’intelligence** pour le Maroc.

- cœur produit : `/search` ;
- `/map` : complément spatial ;
- objectif long terme : **Property Graph du marché immobilier marocain** ;
- North Star DATA : `COVERAGE × FRESHNESS × QUALITY × DEDUP × RELEVANCE` ;
- paliers : **5K → 20K → 50K → 100K+** observations utiles, jamais du volume artificiel.

Pipeline canonique :

`DISCOVERY → INGESTION/OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION/CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION/SERP`

# 2. Doctrine non négociable

- no-bypass absolu ;
- robots/sitemap/capability ≠ permission ;
- Source Registry obligatoire avant activation ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- aucune donnée/image/géométrie/coordonnée/proximité/partenariat inventé ;
- Search reste canonique ; Map partage son identité géographique ;
- migrations séparées du code applicatif ;
- une responsabilité / une branche / une PR / un merge ;
- tests + preuves avant merge ;
- mutation DATA : rollback avant activation.

# 3. Lane UX

Acquis :

- P1A.0 ✅ PR #327 ;
- P1A.1 ✅ PR #328 — Geo Canonical Core, **9,5/10** ;
- P1A.2 ✅ PR #334 — Search Geo Contract ;
- P1A.3 ✅ PR #349 — Map State & Navigation, **9,3/10** ;
- P1A.4 ✅ PR #350 — Map Design System, **9,3/10**, audit final **30 captures / 0 finding**.

## P1A.5 — Territorial Explorer 🔴

Objectif : transformer la carte map-first certifiée en explorateur territorial réellement utile sans casser les contrats P1A.1→P1A.4.

Scope attendu :

1. hiérarchie nationale → ville → quartier explicite ;
2. navigation/zoom cohérents avec l’URL canonique ;
3. filtres spatiaux visibles uniquement s’ils reposent sur une donnée réellement disponible ;
4. aucune géométrie ou proximité inventée ;
5. continuité Map ↔ Search ↔ Quartier ↔ Mon Projet ;
6. performance et lisibilité clusters/repères à l’échelle nationale ;
7. audit 390 / 768 / 1280 ;
8. score UX/UI ≥ **9,0/10**, sinon reprise.

Puis : P1A.6 Responsive → P1B intelligence cartographique.

# 4. Fondation DATA acquise

- Observation Ledger / Freshness / normalization / quality tiers ;
- Source Registry v2 / display eligibility ;
- Market Index / Property Graph foundation ;
- dedup conservant les observations ;
- Partner Feed ;
- OpenSERP / public sitemaps / Common Crawl ;
- 53 villes/pôles.

# 5. DATA-1 — Moroccan Real Estate Web Census ✅

- DATA-1.1 → 1.6B terminés ;
- B3 : **37 009 URLs / 7 051 domaines** ;
- Common Crawl : **300/300 Parquet**, **8 727 registered domains** ;
- univers : **15 238 domaines** ;
- 230 primary-source candidates ;
- 625 portal candidates ;
- Registry initial : 19 rows, **0 activation non autorisée**.

# 6. DATA-4 — Reservoir Strategy

## DATA-4.0 ✅ PR #341
Avito + Mubawab : **35 134 normalized**, **3 588 technical display**, **0 policy-activable**.

## DATA-4.1A ✅ PR #343
Avito `unavailable` : **21 129 / 22 227 = 95,06 % bruit/non-immobilier** ; seulement **73** core-récupérables ; 0 policy-activable.

## DATA-4.2 ✅ PR #344
- `ADMISSIBLE_GROWTH` : **daragadir.com** ;
- `PARTNERSHIP_UPSIDE` : **agenz.ma**.

## DATA-4.3A ✅ PR #347
Dar Agadir : **5 ELIGIBLE_SHADOW**, **6 425 SEED_ONLY_REVALIDATION_REQUIRED**.

## DATA-4.3B ✅ PR #348
Public sitemap : **5 905 URLs**, **5 749** overlaps, **5 673 seed-only** encore présentes ; 10 requêtes robots/sitemaps ; 0 détail/content reuse/write/activation.

## DATA-4.3C ✅ PR #351
Freshness shadow : **5 566 SHADOW_READY**, dont **5 564 seed-only** ; 0 duplicate ; 0 policy blocked ; 0 write/activation.

## DATA-4.3D ✅ PR #353
Freshness Evidence Canary Design certifié :

- canary déterministe : **100 URLs** ;
- eligible seed-only pool : **5 564** ;
- canal proposé : `public_sitemap_presence` ;
- TTL : **14 jours** ;
- `freshness_status` proposé : `fresh_confirmed` ;
- `before/proposed/rollback` : **100/100** ;
- seed-state reads : **100** ;
- source requests : **10** ;
- 0 DB write ; 0 freshness write ; 0 policy change ; 0 activation ;
- **20/20 workflows verts** ;
- merge `019253c`.

Le matcher OpenSERP/Yandex existant reste inchangé : le canal sitemap demeure explicitement distinct.

## DATA-4.3E — First Bounded Freshness Write Canary 🔴 PROCHAIN DATA

Objectif : effectuer le **premier write freshness borné et réversible**, sans activation SERP.

Contraintes :

1. petit canary déterministe, strictement inférieur au dry-run 100 rows ;
2. Source Registry doit toujours autoriser `public_sitemap` et rester current/due-soon ;
3. revalidation sitemap live immédiatement avant write ;
4. snapshot `before` immuable ;
5. write uniquement `freshness_status`, `fresh_last_seen_at`, `fresh_channels`, evidence metadata et `updated_at` ;
6. canal = `public_sitemap_presence` ;
7. TTL = 14 jours ;
8. aucune page détail, aucun content reuse ;
9. aucune modification de display/publication policy ;
10. vérification production post-write ;
11. rollback rehearsal exact ;
12. activation SERP interdite dans ce lot.

Gate de sortie : écrire peu, vérifier tout, prouver rollback et maintenir **0 changement public**.

# 7. Lane business parallèle

**Agenz = priorité partenariat/feed** : 4 490 normalized, 1 227 fresh, 1 146 decision-structured, mais hidden/internal-only. Aucun changement Registry/produit avant autorisation écrite.

# 8. Suite DATA après 4.3E

Si 4.3E est certifié :

1. DATA-4.3F — canary display eligibility shadow sur les lignes fraîchement écrites ;
2. activation canonical-link éventuelle dans un lot séparé ;
3. généralisation aux autres sources canonical-link admissibles ;
4. DATA-3 Universal Site Connector pour sources éligibles ;
5. DATA-5/6/7 feeds + claim + workspace ;
6. atteindre **20K observations exploitables**, puis 50K/100K+.

Si 4.3E échoue : rollback immédiat et passage au réservoir admissible suivant.

# 9. Définition de terminé

Un lot est terminé uniquement si : scope respecté, tests/build/gates verts, preuves disponibles, Registry respecté, aucun bypass, aucun workflow temporaire, PR mergée, production vérifiée si write, rollback vérifié si mutation, et les 3 MD canoniques alignés.

# 10. Prochaine action exacte

## DATA — DATA-4.3E

Construire puis certifier le premier **bounded freshness write canary** Dar Agadir, sans aucune activation publique.

## UX — P1A.5

Construire le **Territorial Explorer** au-dessus du Map Design System certifié, sans modifier l’identité Geo, le contrat URL ni la vérité des données.
