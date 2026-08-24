# AkarFinder — Session courante

**Mise à jour : 2026-08-24**

`docs/ROADMAP.md` reste l’unique vérité canonique globale.

## Chantier — DATA MASS-INDEX ✅ CLOSED
Issue : `#854`.

Progression stricte : **8/8 lots CLOSED = 100 %**.

### Lots fermés
- M0 baseline ;
- M1 Universal candidate promotion ; run `32577296107` SUCCESS ;
- M2 External Index ; run `32580352867` SUCCESS ;
- M3 Source Factory ; PR #863 ; run `32594176513` SUCCESS ;
- M4 National MASS ingest ; PR #871 ; run `32610621902` SUCCESS ;
- M5 Dedup + freshness ; PR #874 + #876 ;
- M6 Search activation + SEO ; production runtime certifiée ;
- M7 Conversion partenaires + droits ; certification finale live validée.

## M6 — production runtime certified
- deployment : `dpl_GHqzoTyvJpsTo1R5D8yELfbrbtq6` ;
- alias : `akarfinder.vercel.app` ;
- SHA runtime certifié : `6ade8c35dcaad013cef28422137dbad83ea1dbdf` ;
- ODM 100 % sur requêtes compatibles, fallback legacy contrôlé ;
- `fresh_confirmed` uniquement, `seed_only` non public ;
- `/search` : `noindex, follow`, canonical `/search`, absent du sitemap ;
- aucun nouveau Vercel effectué pendant M7.

## M7 — CLOSED — partner conversion / provenance

### M7-A
`saved_alerts` hardening appliqué live. `anon` et `authenticated` refusés ; `service_role` fonctionnel. PR #890, run `32702512105` SUCCESS.

### M7-B
`external_source_claims_v1` appliqué live. RLS active ; direct client access refusé ; `content_enrichment_authorized=false` verrouillé. Un claim prouve un contrôle, jamais un droit de réutilisation de contenu.

### M7-C/D
`PARTNER_FULL` reste réservé aux droits explicites. Snapshot de certification : 0 organisation partenaire active, 0 source `authorized_partner`, 0 batch partenaire, 0 contact envoyé, 0 autorisation écrite, 0 activation partenaire.

### M7-E
Défaut découvert : la RPC publique pouvait retourner des champs riches de sources externes non autorisées.

Correctif sécurité :
- PR #893 ; HEAD `6b94100e871ebb4a994655b86f767c8c9a47d11b` ;
- run `32705238465` SUCCESS ;
- migration `m7_public_search_policy_guard` appliquée live.

Régression ensuite détectée : le garde était trop strict et faisait tomber Rabat à 0 résultat.

Récupération canonical-link-only :
- PR #895 ; HEAD `abc5e2e8e5d04c934599c893114851ce89c091be` ;
- run `32706329238` SUCCESS ;
- merge `baf8baf8fe61ee9b6de975ebeaf04bb3c344c20d` ;
- migration `m7_public_search_link_only_recovery` appliquée live.

### Preuve finale live
Rabat via `search_public_representations_v2` :
- 101 résultats ;
- 101 `fresh_confirmed` ;
- 0 `seed_only` ;
- 101 `external_minimal_index` ;
- 4 domaines ;
- 0 snippet ;
- 0 prix ;
- 0 surface ;
- 0 price/m² ;
- 0 source `authorization_status=prohibited` ;
- 0 source `content_reuse_policy=prohibited` ;
- `anon EXECUTE=false` ;
- `authenticated EXECUTE=false` ;
- `service_role EXECUTE=true`.

## Vérité quantitative
Snapshot M7-E : `source_offer_seeds` = 57 843 URL canoniques distinctes. Ce chiffre ne représente pas 57 843 biens immobiliers uniques.

## Next exact
Closeout Git canonique M7, puis aucun travail MASS-INDEX restant dans ce chantier.

## Invariants
- aucun Vercel sans autorisation explicite ;
- aucun bypass technique ;
- aucune donnée de contact inventée ;
- provenance et droits obligatoires ;
- pas de métrique “biens uniques” sans preuve dédiée.
