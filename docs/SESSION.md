# AkarFinder — Session courante

**Mise à jour : 2026-08-22**

## Autorité
- `docs/ROADMAP.md` = vérité canonique globale.
- issue `#854` = scope DATA MASS-INDEX.
- `docs/MASS_INDEX.md` = plan M0→M7.
- `docs/MASS_INDEX_M0_AUDIT.md` = preuve baseline M0.
- aucun déploiement Vercel sans autorisation explicite.

## Chantier courant — DATA MASS-INDEX

**Progression : 1/8 lots CLOSED = 12,5 %.**

### Goal
Construire l’index le plus large possible de l’immobilier marocain dans AkarFinder.

### Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`.

Les anciennes PR/Source Policy ne bloquent plus toute discovery/index externe minimale. Aucun contournement de login, CAPTCHA, paywall, anti-bot ou autre contrôle technique ; aucun contenu riche externe copié par défaut.

### M0 — CLOSED
Preuve : `docs/MASS_INDEX_M0_AUDIT.md`.

Baseline live :
- 272 437 discovery rows ;
- 135 754 canonical URLs distinctes ;
- 56 861 Thin Index docs ;
- 15 546 LISTING immobilières ;
- 15 425 représentations réellement recherchables ;
- 5 700 property listings ;
- 5 561 property clusters.

Diagnostic : le goulot est la promotion/classification/display eligibility, pas la découverte.

### M1 — ACTIVE
Goal : produire une promotion universelle déterministe du réservoir discovery vers l’index externe minimal.

Succès : manifest exact candidate/accepted/rejected par raison+domaine, canonicalisation/dédup, classification, aucune exigence de richesse, idempotence prouvée avant write.

Preuve attendue : tests + dry-run manifest + accounting exact ; micro-write borné ensuite seulement si safe.

### Next exact
1. réutiliser les classifieurs/normaliseurs existants ;
2. réécrire la décision de `candidate-promotion.ts` pour distinguer index externe minimal et contenu riche ;
3. tests de non-régression ;
4. construire le runner read-only M1 ;
5. produire le manifest live.

## Chantier suspendu
Homepage Visual Reconciliation #849 : HVR-1 et HVR-2 CLOSED ; progression conservée 2/6 = 33,3 % ; HVR-3 suspendu par pivot produit.

## Git
- repo : `hraaaaf/Akarfinder`
- issue : `#854`
- branche : `data/mass-index-m0-current`
- PR : `#857` draft
- base initiale : `f0293bb446e2e5779fb67181cd504d71dd1d0138`
- M0 audit commit : `f9f0540b8a6b20b9734474de13e4873dad43747e`
