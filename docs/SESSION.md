# AkarFinder — Session courante

**Mise à jour : 2026-09-07**

> `docs/ROADMAP.md` reste la vérité canonique globale. Ce fichier est un handover opérationnel court.

## État global

**M250K est CLOSED + FROZEN à 253 372 représentations candidates L0/L1.**

- Mubawab : **76 816 IDs source exacts** ;
- Avito : **46 904 IDs source exacts** ;
- `253 372 != biens physiques uniques` ;
- DATA4.9B reste **2 326 aggregate-only**, non matérialisé row-level et sans placeholder ;
- aucun lot Q1/Q2 n’infère `fresh`, `active` ou autorisation.

## Q1A — Candidate Lake materializable — ✅ CERTIFIED

- Run `34125731609` ; artifact `10020001261`.
- **251 046 rows / 251 046 unique representation keys / 0 cross-lane duplicate**.
- SHA256 manifest : `28d55d66a14e7d398db85183a65e07dcd019ef947dfbda2d4c10a6dc7cfadc1c`.

## Q1B — Provenance + temporal cohort — ✅ CERTIFIED

- Run `34126402435` ; artifact `10020251605`.
- **251 046 -> 251 046**, identities/keys preserved.
- Temporal coverage : **14 987 exact_observed_at + 98 606 evidence_timestamp + 137 453 cohort_only** ; unknown = 0.
- SHA256 manifest : `a11fa40efc083e1538d7df6485557c1a612957fc3f7a0f5bb91fa4da7e6a9fc5`.

## Q1C — Exact identity dedupe / canonical keys — ✅ CERTIFIED

- Run `34126920547` ; artifact `10020459850`.
- **251 046 -> 251 046** ; exact duplicate groups = **0**, rows removed = **0**.
- 15 068 URL normalization variants mais **0 collision**.
- SHA256 manifest : `a819c1f464e2e8eeb29c9747800ac71fc0d5727e5f85e4f2baab2762f9b80a36`.

## Q1D — Normalized property features + fingerprints — ✅ CERTIFIED

- Public structured feature export : run `34130789679` ; artifact `10021998663`.
- Final assembly : run `34130980612` ; artifact `10022063956`.
- **251 046 input -> 251 046 output**.
- **101 349 enrichies**, **149 697 sparse/unmatched**.
- Coverage : city **98 984** ; district **67 371** ; property_type **81 033** ; transaction **75 089** ; price **76 439** ; surface **82 778** ; bedrooms **69 678** ; bathrooms **64 626** ; title **47 271** ; lat/lon **22 673**.
- Fingerprint rows : **95 717**.
- SHA256 manifest : `36a4a0b153403d4989cacc416e2a441740cc160dc89e51b734d1b26247a7056a`.
- `missingDataInvented=false` ; `freshnessInferred=false` ; `authorizationInferred=false` ; `physicalPropertyMergePerformed=false`.

## Q2A — Candidate-pair blocking — ✅ CERTIFIED

- Run `34131847974` SUCCESS ; artifact `10022400823`.
- **31 511 921 535** paires possibles -> **1 892 724** candidates.
- Cross-source **779 029** ; same-source **1 113 695**.
- Réduction **99,9939936 %**, facteur **16 648,98×**.
- **374 927 blocks**, 261 oversized exclus par cap 250.
- SHA256 candidate pairs : `50b3e0ee123f4240478cb0b430740e23db9e6ebfe4af7149fe24623997e6dede`.

## Q2B — Conservative clustering V1 / probable_unique — ✅ CERTIFIED

- Run `34132862250` SUCCESS ; artifact `10022797604`.
- **251 046 representations -> 250 774 probable_unique materializable**.
- Réduction : **272 représentations**.
- **250 503 singletons** ; **271 clusters multi-member / 543 représentations**.
- Distribution : **270 clusters de 2 + 1 cluster de 3**, max cluster = 3.
- Aucune paire same-source fusionnée directement ; `uniqueSourcePerCluster=true`.
- SHA256 assignments : `9a4478d45fa5aaaecc309c259aa2b490093291d6c848ab4c43e12debb4b2af34`.

## Q2C — Cluster QA / false-merge control — ✅ CERTIFIED

- Branche : `data/q2c-cluster-qa`.
- Run **`34135667715` SUCCESS** ; artifact **`10023858578`**.
- Artifact ZIP digest : `sha256:e01171a1fdcbe4d5901df3649e55c24e23b7e0fe50e2a202a9f69384c07f011c`.
- **271 / 271 clusters multi-member audités exhaustivement**, soit **543 représentations** et **273 comparaisons pairwise**.
- **0 hard-break cluster** ; compteur QA ajusté reste **250 774 probable_unique**.
- QA : **14 accepted_clean + 257 accepted_with_risk_flags**.
- Risk principal : **257 bathroom_count_conflict_nonblocking** ; **256/257** conflits proviennent de paires de schémas publics Hicham/RealEstateBuddy, donc le champ salle de bain n’est pas utilisé comme hard gate V1.
- **1 title_surface_number_mismatch_nonblocking**.
- Comparabilité : title pairwise disponible sur seulement **3** paires ; géo comparable pairwise **0**.
- Échantillon manuel déterministe : **54 clusters**.
- `allMultiClustersExhaustivelyAudited=true` ; `physicalMergeDestructive=false` ; `missingDataInvented=false` ; `freshnessInferred=false` ; `authorizationInferred=false`.
- DB/prod/source fetch/Vercel = **0**.
- SHA256 assignments QA : `083878e578edc64575adcbb27d1309a03b64dd49c6a85ea1112eb4163ad6a9e8`.

## État live / policy — lecture seule

- `search_public_representations_v2` servait **2 153** représentations lors du contrôle du 2026-09-07.
- Le gateway live exige encore `freshness_status='fresh_confirmed'` + gate strict `source_policy_registry`.
- `source_policy_registry` : RLS ON.
- `source_public_index_owner_override_v1` et `mubawab_public_minimal_index_v1` : RLS OFF, risque ouvert ; aucune mutation faite.
- Aucune policy `permission_required` / `prohibited` n’a été transformée en autorisée.

## Séquence active

1. ✅ Q1A Candidate Lake manifest.
2. ✅ Q1B provenance/cohorte.
3. ✅ Q1C exact dedupe/canonical keys.
4. ✅ Q1D normalized features/fingerprints.
5. ✅ Q2A candidate-pair blocking.
6. ✅ Q2B clustering V1 conservateur.
7. ✅ Q2C cluster QA -> **250 774 probable_unique QA-clean V1**.
8. 🔵 **Q3A freshness evidence**.
9. Puis Q3B `live_confidence`.
10. Puis Q4A/Q4B search eligibility shadow + ranking rehearsal.
11. Q4C production gate séparé uniquement après preuves.

## Invariants

- `candidate != active` ;
- `URL != property unique` ;
- clustering shadow et non destructif ;
- aucune donnée absente inventée ;
- aucune preuve de pipeline transformée en fraîcheur listing ;
- respect robots / surfaces publiques ;
- aucun bypass login/CAPTCHA/paywall/anti-bot/API privée ;
- aucune écriture Supabase/prod ou policy registry sans gate humain explicite ;
- aucun Vercel sans autorisation explicite ;
- CI pending n’arrête pas les lots indépendants.

## Reprise immédiate

**Commencer Q3A à partir de Q2C `10023858578` + Q1D `10022063956`.** Joindre uniquement des observations fraîches exactes et datées : `source_offer_seeds` (`freshness_status`, `fresh_last_seen_at`, `last_observed_at`) et `listing_sources` (`is_active`, `last_seen_at`) via URL/ID exact. Les timestamps d’artifact/cohorte restent du contexte, jamais une preuve `fresh`. Produire une matrice de couverture/âge sans écrire en DB.

**Boussole : 253 372 FROZEN -> 250 774 probable_unique QA-clean V1 -> freshness -> live_confidence -> search eligibility shadow.**
