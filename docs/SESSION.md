# AkarFinder — Session courante

**Mise à jour : 2026-08-23**

`docs/ROADMAP.md` reste l’unique vérité canonique globale.

## Chantier courant — DATA MASS-INDEX

Issue : `#854`.

Progression stricte : **5/8 lots CLOSED = 62,5 %**.

### CLOSED
- M0 : baseline current-main/Supabase certifiée.
- M1 : Universal candidate promotion ; run `32577296107` SUCCESS.
- M2 : External Index natif OpenSERP/Serper MASS ; run `32580352867` SUCCESS.
- M3 : Source Factory ; PR #863 ; run `32594176513` SUCCESS.
- M4 : National MASS ingest ; PR #871 ; merge `206672c8a24b7aa95271f2f7d32dbc733dba08b5`.

## M4 — résultat final vérifié
- cohorte : **965 URLs** ;
- M4-B canary : 10 inserts, Thin Index `+0`, Search OFF ;
- M4-C write run `32610430027` SUCCESS : **955 inserts + 10 préservés** ;
- `source_offer_seeds` : **56 881 -> 57 836** ;
- `thin_index_search_documents` : **56 866 -> 56 866** ;
- certification idempotente finale `32610621902` SUCCESS : **0 insert + 965 préservés** ;
- artifact `9485403997` ; digest `sha256:e64364b4ada0bb2545e4aa722834e72c575affc56b689d31f4beffff70f3f7af` ;
- `metadata:null`, `seed_only`, aucun provider relabel, aucune activation Search ;
- aucun Vercel.

## M5 — ACTIVE

Goal : durcir déduplication + fraîcheur avant M6 Search.

Succès :
1. baseline read-only exacte des doublons/clusters potentiels et états de fraîcheur ;
2. contrat déterministe de dédup sans métrique “propriété unique” prématurée ;
3. règles de fraîcheur/expiration vérifiables ;
4. aucune activation Search ;
5. tests + preuves proportionnels au risque.

## Next exact
1. auditer current-main pour schémas, vues, triggers et scripts dedup/freshness existants ;
2. mesurer read-only la distribution doublons/fraîcheur ;
3. écrire le contrat M5 + critères ;
4. implémenter uniquement après baseline prouvée.

## Invariants
- aucun Vercel sans autorisation explicite ;
- aucun bypass technique ;
- aucune métrique propriété unique avant dédup certifiée ;
- provenance réelle et rollback obligatoires.
