# AkarFinder — Session courante

**Mise à jour : 2026-08-23**

`docs/ROADMAP.md` reste l’unique vérité canonique globale.

## Chantier courant — DATA MASS-INDEX

Issue : `#854`.

Progression stricte : **6/8 lots CLOSED = 75 %**.

### CLOSED
- M0 : baseline current-main/Supabase certifiée.
- M1 : Universal candidate promotion ; run `32577296107` SUCCESS.
- M2 : External Index natif OpenSERP/Serper MASS ; run `32580352867` SUCCESS.
- M3 : Source Factory ; PR #863 ; run `32594176513` SUCCESS.
- M4 : National MASS ingest ; PR #871 ; merge `206672c8a24b7aa95271f2f7d32dbc733dba08b5`.
- M5 : Dedup + freshness hardening ; PR #874 + #876.

## M5 — résultat final vérifié

### Dedup conservatrice
- PR #874 ; merge `e1a6328b12dada4a21672f68c824f3f4368e65a9` ;
- run `32611464377` SUCCESS ;
- artifact `9485645948` ;
- digest `sha256:4e98e033682c2bb13315f7a1798dbf37e24315b0cc15a79ae4c5107d4e60fa20` ;
- baseline : 15 551 LISTING `real_estate_likely`, 818 lignes complètes, 8 groupes de collision / 16 représentations, 1 groupe cross-source / 2 représentations ;
- collision = candidat uniquement, jamais preuve de doublon ni métrique de propriété unique ;
- 0 write DB, 0 cluster mutation, 0 activation Search.

### Freshness public
- PR #876 ; merge `25397654f9200bbee9a9736c96b1b93af49e44f7` ;
- run `32631787333` SUCCESS ;
- artifact `9491244621` ;
- digest `sha256:f5204395fdc18892e393988fb385859528b3a8b1f70e07fd67ddbc61c2ae2c6a` ;
- audit avant migration : 12 263 LISTING `seed_only` display-eligible, 3 054 `fresh_confirmed` ;
- migration prod `mass_index_m5_public_freshness_gate` : SUCCESS ;
- les 2 RPC publics `search_public_representations_v2` et `search_thin_index_v3` servent maintenant `fresh_confirmed` uniquement ;
- preuve live : 500 résultats inspectés par RPC, 0 statut autre que `fresh_confirmed` ;
- les réservoirs n’ont pas été supprimés ou réécrits ;
- aucun Vercel.

## M6 — ACTIVE

Goal : activer Search + SEO à partir de représentations autorisées et fraîchement confirmées, sans fuite `seed_only` ni contenu non autorisé.

Succès :
1. audit exact des routes Search, RPC, sitemap et read models ;
2. activation contrôlée des seules représentations admissibles ;
3. pagination/ranking/SEO canonique vérifiés ;
4. aucune fuite `seed_only`, contenu riche non autorisé ou doublon non prouvé ;
5. tests + preuve live proportionnels au risque ;
6. aucun Vercel sans autorisation explicite.

## Next exact
1. auditer current-main Search + SEO ;
2. établir la baseline publique actuelle ;
3. figer le contrat M6 ;
4. implémenter et certifier uniquement le delta nécessaire.

## Invariants
- aucun Vercel sans autorisation explicite ;
- aucun bypass technique ;
- aucune métrique propriété unique avant preuve ;
- provenance réelle, fraîcheur et rollback obligatoires.
