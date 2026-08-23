# DATA MASS-INDEX — M4 National MASS ingest

**Issue : #854**  
**Lot : M4**  
**Statut : 🟡 ACTIVE — plan national read-only avant canary**

## Goal
Matérialiser nationalement les fiches réellement validées des 7 sources M3 positives dans `source_offer_seeds`, en net-new seulement, sans écraser l’existant et sans activer Search.

## Réconciliation M3 obligatoire
Le delta M3 sépare désormais strictement index externe minimal et ingestion/réutilisation de contenu.

Pour M4, la représentation persistable par défaut est donc limitée à :
- URL canonique ;
- domaine source ;
- provenance/provider + fenêtre d’observation technique.

Le payload M4 persistant met `metadata: null`. Les `title`, `snippet`, `discovery_query`, texte source, photos ou contenu éditorial peuvent être utilisés en mémoire pour classification mais ne sont pas recopiés dans le seed M4 par défaut.

## Wave 1
- marocannonces.com
- domio.ma
- sakane.ma
- 1000-annonces.com
- housing.place
- expat.com
- milkiya.ma

## Étape M4-A — plan read-only
Succès :
- M1 `EXTERNAL_INDEX_CANDIDATE` + garde structurel M3 ;
- URL sensible/contact rejetée ;
- providers natifs uniquement : `openserp` / `serper_mass_harvest` ;
- accounting exact `INSERT_NATIVE` / `PRESERVE_EXISTING` ;
- canary round-robin <= 10 préparée mais non écrite ;
- `metadata: null` pour tous les inserts proposés ;
- 0 write DB ; 0 source fetch ; 0 provider relabel ; 0 activation publique.

Preuve attendue : workflow `MASS-INDEX M4 Minimal Plan Certification` + artifact `m4-national-ingest-plan.json`.

## Étape M4-B — canary
Uniquement après certification M4-A : recheck de conflits, insertion bornée, vérification Thin Index/Search OFF, rollback sur échec.

## Étape M4-C — batches
Uniquement après canary : batches bornés, accounting before/after, idempotence, circuit breakers et rollback.

## Invariants
- aucun contournement login/CAPTCHA/anti-bot/paywall ;
- aucune donnée riche source réutilisée implicitement ;
- aucun écrasement de seed existant ;
- aucune métrique de propriétés uniques avant M5 dedup ;
- aucun déploiement Vercel sans autorisation explicite.
