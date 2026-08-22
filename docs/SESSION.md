# AkarFinder — Session courante

**Mise à jour : 2026-08-22**

## Autorité
- `docs/ROADMAP.md` = vérité canonique globale.
- issue `#854` = scope DATA MASS-INDEX.
- `docs/MASS_INDEX.md` = plan M0→M7.
- aucun déploiement Vercel sans autorisation explicite.

## Chantier courant — DATA MASS-INDEX

**Progression : 0/8 lots CLOSED = 0 %.**

### Goal
Construire l’index le plus large possible de l’immobilier marocain dans AkarFinder.

### Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`.

Les anciennes PR/Source Policy ne bloquent plus toute discovery/index externe minimale. Aucun contournement de login, CAPTCHA, paywall, anti-bot ou autre contrôle technique ; aucun contenu riche externe copié par défaut.

### Baseline historique à revalider
- 209 109 discovery rows ;
- 104 584 URL representations distinctes ;
- 90 190 net-new vs Thin Index ;
- 52 591 probablement immobilier Maroc ;
- 24 505 probablement pages détail ;
- unité = URL representation, pas propriété unique ;
- baseline publique historique : 7 483 LISTING.

### M0 — ACTIVE
Goal : mesurer l’état réel current-main + Supabase avant mutation.

Succès : baseline fraîche par source/canal/ville/fraîcheur + inventaire pipeline + delta exact vs MASS-6.

Preuve : rapport read-only + tests ciblés + commit exact.

### Next exact
1. audit `main@f0293bb446e2e5779fb67181cd504d71dd1d0138` ;
2. inventorier discovery/classifier/writers/read-model/dedup/freshness ;
3. Supabase read-only ;
4. recalculer baseline ;
5. M1 Universal candidate promotion.

## Chantier suspendu
Homepage Visual Reconciliation #849 : HVR-1 et HVR-2 CLOSED ; progression conservée 2/6 = 33,3 % ; HVR-3 suspendu par pivot produit.

## Git
- repo : `hraaaaf/Akarfinder`
- issue : `#854`
- branche : `data/mass-index-m0-current`
- base : `f0293bb446e2e5779fb67181cd504d71dd1d0138`
