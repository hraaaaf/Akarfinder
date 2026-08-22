# AkarFinder — DATA MASS-INDEX

**Issue canonique : #854**  
**Statut : M0 ACTIVE**  
**Branche : `data/mass-index-m0-current`**

## Goal
Construire l'index le plus large possible de l'immobilier marocain dans AkarFinder, en séparant découverte, index externe minimal, enrichissement factuel et contenu partenaire complet.

## Baseline historique à revalider en M0
- MASS-6 : 209 109 discovery rows.
- 104 584 URL representations distinctes.
- 90 190 net-new vs Thin Index.
- 52 591 probablement immobilier Maroc.
- 24 505 probablement pages détail.
- unité = URL representation, pas propriété unique.
- baseline publique historique : 7 483 LISTING.

## Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`

Aucun contournement de login, CAPTCHA, paywall, anti-bot ou autre contrôle technique. Aucun texte long/photo source copié par défaut.

## Pipeline
`DISCOVERY -> canonicalization -> LISTING classification -> adapter/fetch admissible -> factual extraction -> normalization -> geo resolution -> dedup/cluster -> freshness -> external index -> Search`

## Sources prioritaires
Historiques : agenz.ma, mubawab.ma, mouldar.com, masaken.ma, avito.ma.

Réservoir MASS : marocannonces.com, yakeey.com, domio.ma, 2p.ma, sakane.ma, 1000-annonces.com, housing.place, expat.com, milkiya.ma, portail-immobilier.ma.

Extension ensuite aux 107 domaines de la Source Factory.

## Lots
- M0 — current-main audit + baseline fraîche.
- M1 — Universal candidate promotion.
- M2 — External Index model.
- M3 — Source Factory adapters.
- M4 — National MASS ingest.
- M5 — Dedup + freshness hardening.
- M6 — Search activation + SEO.
- M7 — Conversion partenaires.

## KPI
- unique listing URLs indexed ;
- unique property clusters searchable ;
- couverture villes/quartiers ;
- fraîcheur <= 7/30 jours ;
- rendement par source ;
- taux doublons ;
- taux prix/surface/localisation.

## Next exact
M0 sur `main@f0293bb446e2e5779fb67181cd504d71dd1d0138` : audit current-main + Supabase read-only, inventaire des composants MASS encore présents, baseline fraîche, delta exact vs MASS-6, puis M1 sur preuve réelle.

## Interdits permanents
- aucun déploiement Vercel sans autorisation explicite ;
- aucun contournement de contrôles techniques ;
- aucune métrique propriété unique avant dédup ;
- aucune donnée inventée ;
- aucune copie implicite de contenu riche externe.
