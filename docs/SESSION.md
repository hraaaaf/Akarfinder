# AkarFinder — Session courante

**Mise à jour : 2026-08-22**

## Autorité

- `docs/ROADMAP.md` = vérité canonique globale.
- issue `#854` = contrat DATA MASS-INDEX.
- `docs/MASS_INDEX.md` = plan d’exécution détaillé.
- aucun déploiement Vercel sans autorisation explicite.

## Chantier courant — DATA MASS-INDEX

**Progression : 0/8 lots CLOSED = 0 %.**

### Goal

Construire l’index le plus large possible de l’immobilier marocain dans AkarFinder.

### Décision produit

Le chantier ne laisse plus les anciennes PR/Source Registry bloquer toute la discovery et l’index externe. Il sépare :

`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`.

Aucun contournement de login, CAPTCHA, paywall, anti-bot ou autre contrôle technique ; aucun contenu riche externe copié par défaut.

### Baseline historique à revalider

- 209 109 discovery rows ;
- 104 584 URL representations distinctes ;
- 90 190 net-new vs Thin Index ;
- 52 591 probablement immobilier Maroc ;
- 24 505 probablement pages détail ;
- unité = URL representation, pas propriété unique ;
- baseline publique historique : 7 483 LISTING.

### M0 — ACTIVE

Goal : mesurer l’état réel current-main + Supabase avant toute mutation.

Succès : baseline fraîche par source/canal/ville/fraîcheur + inventaire du pipeline existant + delta exact vs MASS-6.

Preuve : rapport read-only, tests ciblés, commit exact.

### Next exact

1. audit `main@a44ed88db1cc6c0b556fa7af9cda6f43fc1faf30` ;
2. inventorier discovery/classifier/writers/read-model/dedup/freshness existants ;
3. lire Supabase en read-only ;
4. recalculer la baseline ;
5. ouvrir M1 Universal candidate promotion sur les faits observés.

## Repères Git

- repo : `hraaaaf/Akarfinder`
- issue : `#854`
- branche : `data/mass-index-m0`
- commit plan : `d9f439ddec387275f308bf3d07277db5187ad4b0`
- commit roadmap : `22193a38b6f0869d53d14ad417f617868784ff5f`
- HVR : suspendu par pivot produit ; aucun ancien lot HVR n’est déclaré fermé artificiellement.
