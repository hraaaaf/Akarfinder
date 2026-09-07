# Q1A Candidate Lake — exact recovery status

Snapshot verified on 2026-09-07 UTC from branch `data/q1a-candidate-lake-freeze`.

## Goal

Materialize the frozen 253,372 L0/L1 source representations without inventing an identity, freshness, activity, authorization, or physical-property uniqueness.

## Verified exact recoveries

| Cohort | Exact rows | Evidence |
|---|---:|---|
| DB-backed B3 strict Morocco | 5,797 | run `34059828610`, artifact `9997114366`, SHA-256 `777fa91d1112da49fa12ab79c8de9b17f24a8c5f6176ec3b30788e4851450a18` |
| DB-backed canonical-link v2 | 6,270 | same artifact, SHA-256 `3e68f4c864be5fdcde4bd2815cb6d496649eddf68a7ca8555996eaddaad66223` |
| DB-backed current seed lanes | 2,920 | same artifact, SHA-256 `ab2c1a1bed8de9872657303492c56e72f32f01dbe0e70245b49c242663b2e2f3` |
| DB-backed union | 14,987 | same artifact, SHA-256 `65547898797f040b86daa4eec3411fe9ea7cbd99ad86732b8b3b2dfcef08ba48` |
| 1immo freeze-time net-new | 3,471 | run `34062181098`, artifact `9997824477`, manifest SHA-256 `5fb5d141957b8b4c79736d0cf9518b797b1000f714af292be8cfe2b8711be0e1` |
| MASS-X2 Jibril / SW / Loco | 73 | run `34063582288`, artifact `9998233478`, manifest SHA-256 `69beb8c12c29cc70c84091780df486aefc894699f5522abe0b5603cf40b30f7b` |

The 1immo replay reproduces `5,219 discovery distinct -> 3,661 detail distinct -> 190 seed overlap -> 3,471 exact net-new` at `created_at <= 2026-09-06T11:37:31Z`. It excludes the two post-freeze identities by temporal evidence, not by arbitrary removal.

MASS-X2 reproduces 40 Jibril, 27 SW Immobilier, and 6 Loco identities. The SW set records the historical detector mismatch explicitly: 15 root paths plus 12 independently eligible localized `/fr|ar/propriete/<slug>` paths.

## Irrecoverable row-level gap at this snapshot

DATA4.9B remains a historically proven aggregate of 2,326 structural L0 representations:

- ValFoncier 709;
- Christie's Morocco 602;
- Immo-Maroc 276;
- AgadirImmobilier.ma 37;
- ProImmobilier 99;
- Capital Properties 603.

Artifact `8609457925` is expired. The branch contains bounded metadata/archive recovery attempts through commit `5b95ea6e`; their successful runs did not reconstruct one unique exact 2,326-row manifest. No direct source recrawl and no placeholder identities are allowed.

Therefore the honest current boundary is:

- frozen accounting total: **253,372**;
- maximum row-level materializable total: **251,046**;
- separately preserved historical aggregate proof: **2,326**;
- fabricated rows: **0**.

Q1A cannot be certified as a complete 253,372-row manifest unless an exact DATA4.9B derivative/copy is recovered. Downstream provenance, dedupe, fingerprints, clustering, freshness and eligibility may proceed on the 251,046 materializable rows, while the 2,326 gap remains quarantined as aggregate-only evidence.

## Live and policy baseline

`search_public_representations_v2(p_limit => 1)` reported **2,065** servable representations on 2026-09-07 UTC. The old V1 view contains a much larger pre-policy surface and is not the live baseline.

The active non-expired external lane is minimal canonical-link display only. It does not grant rich-content reuse. `permission_required`, `prohibited`, `internal_signal_only`, `hidden`, and expired policies remain fail-closed. In particular, Mubawab remains prohibited for content/detail reuse even where a separate minimal external-link gate exists.

## Security observation

`source_public_index_owner_override_v1` and `mubawab_public_minimal_index_v1` have RLS disabled, but `anon` currently has no SELECT/INSERT/UPDATE/DELETE table privileges. This remains a separate remediation lot: enabling RLS without matching access-policy tests could break existing server paths.

No Vercel deployment was performed. No Candidate Lake row was published or activated by this verification.
