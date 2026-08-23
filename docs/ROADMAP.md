# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-23**  
**Statut : ACTIVE — DATA MASS-INDEX / M6 production runtime gate**

Ce fichier est l’unique vérité canonique globale pour l’ordre des chantiers, leur état et leur progression.

## 1. Chantier actif P0 — DATA MASS-INDEX

**Issue canonique : #854**  
**Plan : `docs/MASS_INDEX.md`**

### Goal
Construire l’index le plus large possible de l’immobilier marocain dans AkarFinder, avec provenance réelle, déduplication, fraîcheur et séparation stricte entre index externe minimal et contenu partenaire riche.

### Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`

Aucun contournement login/CAPTCHA/paywall/anti-bot. Aucun contenu riche externe copié par défaut. Aucun provider relabel. Aucun Vercel sans autorisation explicite.

### Progression stricte

**6/8 lots CLOSED = 75 %.**

| Lot | Scope | État | Preuve principale |
|---|---|---|---|
| M0 | Current-main audit + baseline fraîche | ✅ CLOSED | `docs/MASS_INDEX_M0_AUDIT.md` |
| M1 | Universal candidate promotion | ✅ CLOSED | run `32577296107` SUCCESS |
| M2 | External Index model | ✅ CLOSED | run `32580352867` SUCCESS |
| M3 | Source Factory adapters | ✅ CLOSED | PR #863 ; run `32594176513` SUCCESS |
| M4 | National MASS ingest | ✅ CLOSED | PR #871 ; run `32610621902` SUCCESS ; 965/965 preserved |
| M5 | Dedup + freshness hardening | ✅ CLOSED | PR #874 + #876 ; runs `32611464377` + `32631787333` SUCCESS |
| M6 | Search activation + SEO | 🟡 ACTIVE — runtime gate | PR #879 + #881 + #882 ; code/DB contract certified ; production still old commit |
| M7 | Conversion partenaires | ⏳ PENDING | — |

### M4 — closeout certifié
- 965 URLs Wave 1 sur 7 sources ;
- M4-B : run `32609756948` SUCCESS ; 10 inserts ; Thin Index `+0` ;
- M4-C : run `32610430027` SUCCESS ; 955 inserts + 10 préservés ;
- certification idempotente : run `32610621902` SUCCESS ; 0 insert + 965 préservés ;
- `metadata:null`, `seed_only`, Search OFF ; aucun Vercel.

### M5 — closeout certifié
- M5-A shadow dedup : PR #874 ; run `32611464377` SUCCESS ; collision = candidat uniquement ; 0 auto-merge ;
- M5-B freshness : PR #876 ; run `32631787333` SUCCESS ; migration `mass_index_m5_public_freshness_gate` appliquée ;
- les RPC `search_public_representations_v2` et `search_thin_index_v3` servent `fresh_confirmed` uniquement ;
- réservoir `seed_only` conservé ; aucun Vercel.

### M6 — état vérifié
M6-A baseline :
- PR #879 ; merge `bd514a8f8797a77096bf11d52875dec431342367` ;
- run `32636262489` SUCCESS ; artifact `9492399522` ; digest `sha256:3a19cec4b90f050dc1a5251ca535787a829121269cdddeaa0f867cbf5731d07b` ;
- RPC public observé : 3 049 résultats admissibles ; l’écart 3 054 -> 3 049 = 5 lignes `openserp` exclues par whitelist provider.

M6-B cutover contract :
- PR #881 ; merge `4fa80e5e1e512666fe81c973de268f13e207cd43` ;
- run `32647288760` SUCCESS ; artifact `9495238964` ; digest `sha256:afe8914b543a92f81e8e0915e679902100909ffa3a9e632fab5608ea74d9f68b` ;
- contrat certifié : enabled + approved + 100 % + stop=false => ODM sur requêtes compatibles ; emergency stop / défaut d’approbation => legacy_primary ; erreur ODM => legacy_fallback ; district reste legacy tant que le read model ODM n’a pas de district autoritatif.

M6-C freshness defense :
- PR #882 ; merge `c49c31fa90f27bf6d48ac15146b9191464ecbd14` ;
- run `32647718215` SUCCESS ;
- serving policy Node alignée sur SQL : `fresh_confirmed` uniquement ; `seed_only` rejeté ;
- 0 DB write, 0 activation Search, 0 changement env, 0 Vercel.

### Pourquoi M6 reste ACTIVE
Dernier déploiement production READY vérifié :
- deployment `dpl_CNKvqYuRXVrHRkAo1hrWei12sjah` ;
- commit déployé `10420b4c0e0622122aa86608e7f257080e6b3c44`.

Le runtime production n’embarque donc pas encore les merges M6. Le contrat est certifié sur current-main/DB, mais l’activation réelle et sa validation production ne sont pas prouvées. M6 ne peut pas être déclaré CLOSED avant ce human gate.

### Next exact
Autorisation explicite Vercel -> déployer le HEAD M6 -> configurer le cutover contrôlé -> vérifier logs/runtime Search et SEO -> rollback testable -> closeout M6 à 7/8 = 87,5 % -> M7.

---

## 2. Homepage Visual Reconciliation ✅ CLOSED
Issue #849 : 6/6 CLOSED = 100 %. Preuve finale : PR #861 ; merge `78079f179ffbbf6285e23bf86ba18c609563f661` ; run `32595444588` SUCCESS ; artifact `9481435261` ; score 9,4/10 ; human gate APPROVED ; aucun Vercel.

## 3. Règles permanentes
- provenance + canonical URL obligatoires ;
- aucune métrique propriété unique avant dédup certifiée ;
- writer idempotent, budgets, rollback et circuit breakers ;
- aucune donnée inventée ;
- aucune copie implicite de contenu riche externe ;
- CI pending n’arrête pas le travail indépendant ;
- **aucun déploiement Vercel sans autorisation explicite**.
