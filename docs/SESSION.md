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

- Branche : `data/q2a-candidate-pair-blocking`.
- Run **`34131847974` SUCCESS** ; artifact **`10022400823`**.
- Artifact ZIP digest : `sha256:89a801481683761ff3726b16c5924251c99f3274a2f67e5d703de7514ac9a41b`.
- Baseline non ordonné : **31 511 921 535** paires possibles sur 251 046 rows.
- Candidate pairs retenues : **1 892 724**.
- Cross-source : **779 029** ; same-source : **1 113 695**.
- Réduction : **99,9939936 %**, facteur **16 648,98×**.
- **374 927 blocks**, 261 oversized exclus par cap 250 ; block P99 = 35, max observé = 2 363.
- **91 024 rows blockables**, **58 260 rows** présentes dans au moins une paire retenue.
- SHA256 candidate pairs : `50b3e0ee123f4240478cb0b430740e23db9e6ebfe4af7149fe24623997e6dede`.
- Aucune fusion physique dans Q2A ; aucun write/fetch source/Vercel.

## Q2B — Conservative clustering V1 / probable_unique — ✅ CERTIFIED

- Branche : `data/q2b-conservative-clustering-v1`.
- Run **`34132862250` SUCCESS** ; artifact **`10022797604`**.
- Artifact ZIP digest : `sha256:b9b534a75deb7a96987c6af771e1677f597e84670c81af7bf804a101434d815f`.
- **251 046 representations -> 250 774 probable_unique materializable**.
- Réduction : **272 représentations** seulement, volontairement conservatrice.
- **250 503 singletons**.
- **271 clusters multi-member** portant **543 représentations**.
- Distribution : **270 clusters de 2 + 1 cluster de 3** ; max cluster = **3**.
- 422 edges cross-source avaient passé le gate pair-level ; **272 merge edges** finalement utilisées.
- Aucune paire same-source n’est autorisée à fusionner directement en V1.
- `uniqueSourcePerCluster=true`, max-cluster guard = 8.
- Accept reasons : **417 tight_structured_cross_source + 5 title_supported_cross_source**.
- Cluster constraints ont refusé **148 source-repeat** et **2 price-span**.
- Confidence representations : **464 high + 79 conservative + 250 503 singleton**.
- DATA4.9B `2 326` reste explicitement hors `probable_unique`; aucun chiffre unique n’est revendiqué pour ce lot agrégé.
- SHA256 assignments : `9a4478d45fa5aaaecc309c259aa2b490093291d6c848ab4c43e12debb4b2af34`.
- SHA256 multi-clusters : `504a42a083c3ce7dc4612481217cdb18d1765cae8b3c40cf4f3f17381a921f70`.
- `physicalMergeDestructive=false` ; `missingDataInvented=false` ; `freshnessInferred=false` ; `authorizationInferred=false` ; DB/prod/source fetch/Vercel = 0.

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
6. ✅ Q2B clustering V1 conservateur -> `probable_unique`.
7. 🔵 **Q2C cluster QA / false-merge control**.
8. Puis Q3A/Q3B freshness evidence + `live_confidence`.
9. Puis Q4A/Q4B search eligibility shadow + ranking rehearsal.
10. Q4C production gate séparé uniquement après preuves.

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

**Commencer Q2C depuis artifact Q2B `10022797604` + Q1D `10022063956`.** Auditer tous les 271 clusters multi-member puisque le volume est faible, produire risk flags et échantillon stratifié, et casser tout cluster présentant une contradiction non couverte par les gates V1. Ne promouvoir aucun `probable_unique` au serving pendant Q2C.

**Boussole : 253 372 FROZEN -> 250 774 probable_unique matérialisables V1 -> QA -> live_confidence -> search eligibility shadow.**
