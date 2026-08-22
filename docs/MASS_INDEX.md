# AkarFinder — DATA MASS-INDEX

**Issue canonique : #854**  
**Statut : M0 ACTIVE**  
**Branche initiale : `data/mass-index-m0`**

## Goal

Construire l'index le plus large possible de l'immobilier marocain dans AkarFinder, en séparant découverte, index externe minimal, enrichissement factuel et contenu partenaire complet.

## Baseline certifiée à revalider en M0

- MASS-6 : 209 109 discovery rows lues.
- 104 584 URL representations distinctes.
- 90 190 net-new vs Thin Index.
- 52 591 probablement immobilier Maroc.
- 24 505 probablement pages détail.
- Ces unités sont des URL representations, pas des propriétés uniques.
- Baseline publique historique : 7 483 LISTING éligibles au read model.

## Doctrine d'indexation

Quatre états distincts :

1. `DISCOVERED` — URL candidate connue.
2. `INDEXED_EXTERNAL` — représentation minimale, provenance + canonical URL, aucune confusion avec un partenariat.
3. `ENRICHED` — faits normalisés obtenus par un canal admissible.
4. `PARTNER_FULL` — contenu riche réutilisable explicitement autorisé.

Aucun contournement de login, CAPTCHA, paywall, anti-bot ou autre contrôle technique. Aucun texte long/photo source copié par défaut.

## Pipeline

`DISCOVERY -> canonicalization -> LISTING classification -> adapter/fetch admissible -> factual extraction -> normalization -> geo resolution -> dedup/cluster -> freshness -> external index -> Search`

## Sources prioritaires

Historique : agenz.ma, mubawab.ma, mouldar.com, masaken.ma, avito.ma.

Réservoir MASS : marocannonces.com, yakeey.com, domio.ma, 2p.ma, sakane.ma, 1000-annonces.com, housing.place, expat.com, milkiya.ma, portail-immobilier.ma.

Extension ensuite aux 107 domaines de la Source Factory.

## Lots

### M0 — Current-main audit + baseline fraîche

Goal : mesurer l'état réel current-main + Supabase avant modification.

Succès : baseline reproductible par canal/source/ville, delta exact vs MASS-6, inventaire des writers/read-models déjà présents.

Preuve : rapport read-only + tests ciblés + commit exact.

### M1 — Universal candidate promotion

Goal : transformer le réservoir de pages détail en file de travail déterministe.

Succès : candidates canonicalisées, dédupliquées au niveau URL, classifiées et comptabilisées exactement.

Preuve : manifest déterministe + accounting exact.

### M2 — External Index model

Goal : rendre une annonce externe minimale recherchable sans la présenter comme contenu partenaire.

Succès : modèle séparé, provenance visible, canonical URL, aucun contenu riche non autorisé.

Preuve : migrations dry-run si nécessaires + contrats Search.

### M3 — Source Factory adapters

Goal : industrialiser les sources prioritaires.

Succès : rendement `candidate -> valid listing` par domaine avec rate limits, budgets et circuit breakers.

Preuve : canaries bornées + rapport de rendement.

### M4 — National MASS ingest

Goal : ingérer à l'échelle nationale toutes les sources dont le pipeline est techniquement fiable.

Succès : hausse vérifiée des URL listing indexées et des clusters propriétés recherchables.

Preuve : before/after DB, villes/quartiers, fraîcheur, clusters uniques.

### M5 — Dedup + freshness hardening

Goal : empêcher les multi-portails de gonfler artificiellement le stock et retirer les annonces mortes.

Succès : dédup mesurée, lifecycle idempotent, freshness reproductible.

Preuve : golden duplicate set + replay freshness.

### M6 — Search activation + SEO

Goal : exposer proprement l'index et obtenir une acquisition organique utile sans thin/spam SEO.

Succès : résultats Search réels, provenance claire, canonicals/noindex/sitemaps corrects.

Preuve : contrats Search + audit crawl/SEO.

### M7 — Conversion partenaires

Goal : transformer les sources les plus importantes en feeds/partenariats après preuve de couverture/usage.

Succès : conversion progressive `INDEXED_EXTERNAL -> PARTNER_FULL` fondée sur accords réels.

Preuve : accords/feeds réels, jamais supposés.

## KPI

- `unique_listing_urls_indexed`
- `unique_property_clusters_searchable`
- couverture villes/quartiers
- fraîcheur <= 7/30 jours
- rendement par source
- taux doublons
- taux prix/surface/localisation

## Next exact

M0 sur `main@a44ed88db1cc6c0b556fa7af9cda6f43fc1faf30` : audit current-main + Supabase read-only, inventorier les composants MASS encore présents, recalculer la baseline fraîche, puis ouvrir M1 sur preuve réelle.

## Interdits permanents

- aucun déploiement Vercel sans autorisation explicite ;
- aucun contournement de contrôles techniques ;
- aucune métrique de propriétés uniques calculée avant dédup ;
- aucune donnée inventée ;
- aucune copie implicite de contenu riche d'une source externe.
