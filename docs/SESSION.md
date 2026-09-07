# AkarFinder — Session courante

**Mise à jour : 2026-09-07**

> `docs/ROADMAP.md` reste la vérité canonique globale. Ce fichier est un handover opérationnel court.

## État global

**M250K est CLOSED + FROZEN à 253 372 représentations candidates L0/L1.**

- Mubawab : **76 816 IDs source exacts** ;
- Avito : **46 904 IDs source exacts** ;
- `253 372 != biens physiques uniques` ;
- historique/public-dataset reste L0 tant qu’aucune preuve récente ne justifie `fresh`/`active` ;
- DATA4.9B reste **2 326 aggregate-only**, non matérialisé row-level et sans placeholder.

## Q1A — Candidate Lake materializable — ✅ CERTIFIED

- Run corrigé : `34125731609` ; artifact `10020001261`.
- **251 046 rows / 251 046 unique representation keys / 0 cross-lane duplicate**.
- SHA256 manifest : `28d55d66a14e7d398db85183a65e07dcd019ef947dfbda2d4c10a6dc7cfadc1c`.
- `akaar.fr` restauré depuis la preuve artifact ; faux `source_domain='mixed'` supprimés sans changer le compteur.

## Q1B — Provenance + temporal cohort — ✅ CERTIFIED

- Branche : `data/q1b-provenance-temporal-cohort`.
- Run `34126402435` SUCCESS ; artifact `10020251605`.
- **251 046 -> 251 046** ; identités et representation keys préservées.
- DB-backed row-level : **14 987 / 14 987**.
- Temporal coverage : **14 987 exact_observed_at + 98 606 evidence_timestamp + 137 453 cohort_only = 251 046** ; unknown = 0.
- SHA256 manifest : `a11fa40efc083e1538d7df6485557c1a612957fc3f7a0f5bb91fa4da7e6a9fc5`.
- `freshnessInferred=false` ; `authorizationInferred=false`.

## Q1C — Exact identity dedupe / canonical keys — ✅ CERTIFIED

- Branche : `data/q1c-exact-identity-dedupe`.
- Run `34126920547` SUCCESS ; artifact `10020459850`.
- **251 046 input -> 251 046 output**.
- Exact duplicate groups : **0** ; exact rows removed : **0**.
- 15 068 URL normalization variants observées mais **0 collision** ; elles restent diagnostiques et ne réécrivent pas l’identité gelée.
- SHA256 manifest : `a819c1f464e2e8eeb29c9747800ac71fc0d5727e5f85e4f2baab2762f9b80a36`.

## Q1D — Normalized property features + fingerprints — ✅ CERTIFIED

- Branche : `data/q1d-normalized-features-fingerprints`.
- Public structured feature export : run `34130789679` SUCCESS ; artifact `10021998663`.
- Public dataset feature pool : **75 440 exact source IDs** = **51 899 Mubawab + 23 541 Avito**, depuis 8 datasets GitHub publics pinés par commit ; `phoneFieldsExported=false`.
- Final assembly : run `34130980612` SUCCESS ; artifact **`10022063956`** ; artifact ZIP digest `sha256:786cba78a8cde4313a275bffb9dbb1fbfb55b1593bc15971ed9fd3128107895f`.
- Manifest Q1D : **251 046 input -> 251 046 output**.
- **101 349 représentations enrichies**, **149 697 sparse/unmatched**.
- Coverage : city **98 984** ; district **67 371** ; property_type **81 033** ; transaction **75 089** ; price **76 439** ; surface **82 778** ; bedrooms **69 678** ; bathrooms **64 626** ; rooms **37 769** ; title **47 271** ; lat/lon **22 673**.
- Fingerprints : **95 717 rows** avec au moins une empreinte ; location/type `79 972`, numeric `71 253`, title `43 787`, geo `22 673`.
- Match bases exactes seulement : URL canonique DB, source ID dataset public, ou source ID extrait d’URL DB ; ambiguous keys exclues séparément.
- `missingDataInvented=false` ; `freshnessInferred=false` ; `authorizationInferred=false` ; `physicalPropertyMergePerformed=false`.
- `databaseWrites=0` ; `productionWrites=0` ; `sourceSiteFetches=0` ; `vercelDeployments=0`.
- SHA256 manifest : `36a4a0b153403d4989cacc416e2a441740cc160dc89e51b734d1b26247a7056a`.
- Le ref de branche a été remis en fast-forward sur le commit de certification `551543168cbc970deaafc40a1ce714b3b975732a` après un recul accidentel d’un commit ; aucun force push.

## État live / policy — lecture seule

- `search_public_representations_v2` servait **2 153** représentations lors du contrôle du 2026-09-07.
- Le gateway live exige encore notamment `freshness_status='fresh_confirmed'` + gate strict `source_policy_registry`.
- `source_policy_registry` : RLS ON.
- `source_public_index_owner_override_v1` et `mubawab_public_minimal_index_v1` : RLS OFF, risque encore ouvert ; aucune mutation faite.
- Aucune policy `permission_required` / `prohibited` n’a été transformée en autorisée.

## Séquence active

1. ✅ Q1A Candidate Lake manifest.
2. ✅ Q1B provenance/cohorte.
3. ✅ Q1C exact dedupe/canonical keys.
4. ✅ Q1D normalized features/fingerprints.
5. 🔵 **Q2A candidate-pair blocking**.
6. Puis Q2B clustering V1 conservateur -> `probable_unique`.
7. Puis Q2C cluster QA / false-merge control.
8. Puis Q3A/Q3B freshness evidence + `live_confidence`.
9. Puis Q4A/Q4B search eligibility shadow + ranking rehearsal.
10. Q4C production gate séparé uniquement après preuves.

## Invariants

- `candidate != active` ;
- `URL != property unique` ;
- pas de suppression destructive pendant clustering ;
- aucune donnée absente inventée ;
- aucune preuve de pipeline transformée en fraîcheur listing ;
- respect robots / surfaces publiques ;
- aucun bypass login/CAPTCHA/paywall/anti-bot/API privée ;
- aucune écriture Supabase/prod ou policy registry sans gate humain explicite ;
- aucun Vercel sans autorisation explicite ;
- CI pending n’arrête pas les lots indépendants.

## Reprise immédiate

**Commencer Q2A à partir de l’artifact Q1D `10022063956`.** Construire des blocks conservateurs à partir des seules features présentes, publier nombre de blocks/paires, distribution et réduction versus `251046²`, et garder les lignes trop sparse en singleton/no-block au lieu d’inventer des features. Aucun merge physique ni écriture prod dans Q2A.

**Boussole : 253 372 FROZEN -> Candidate Lake -> probable_unique -> live_confidence -> search eligibility shadow.**
