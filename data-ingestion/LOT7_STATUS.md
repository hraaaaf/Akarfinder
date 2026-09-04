# Lot 7 Status

**Status: ✅ CLOSED — functional + browser visual proof complete**

## Goal

Prouver que les données canoniques peuvent alimenter AkarFinder dans un environnement strictement isolé, sans toucher à la production ni à la base SQLite historique.

## Safety boundary

Interdictions inchangées :

- jamais écrire dans `scripts/scrapers/output/akarfinder.db` ;
- jamais utiliser Supabase production ;
- aucun déploiement Vercel ;
- aucun write production ;
- aucun merge automatique.

Toutes les DB Lot 7 sont créées dans un répertoire temporaire et supprimables sans effet collatéral.

## Functional proof status — GREEN

Les gates Lot 7 fonctionnels sont validés sur la branche :

- sandbox 20 / 100 / 1 000 ;
- real SQLite read path ;
- ranking ;
- lifecycle ;
- API routing ;
- Search page contract / SSR Search ;
- idempotence ;
- deactivation ;
- purge source ;
- survie `agency_direct` / `partner_feed`.

La purge source est explicite via `source_type='portal'` et ne repose plus sur `origin_type='unknown'`. Les sources directes et partenaires restent distinctes et protégées.

## Final browser visual proof — GREEN

Workflow : `Data Ingestion Lot 7 Visual Proof`

- run : `33877438332` ✅ SUCCESS ;
- HEAD produit prouvé : `10ecf3b36afdcbf68b84857ddc8f153cd3ab2610` ;
- job `visual-proof` : ✅ SUCCESS ;
- step `Seed isolated Lot 7 indexed visual SQLite` : ✅ ;
- step `Capture and assert real indexed Search artwork` : ✅ ;
- artifact : `9938461473` ;
- size : `1,176,379 bytes` ;
- digest : `sha256:08b2c8f3679c22e4c3c02075b29d1f26276b460664aac7c0832ccd7da9746ee9`.

Captures inspectées :

- `lot7-search-property-types-desktop-1440.png` ;
- `lot7-search-property-types-mobile-390.png` ;
- `lot7-search-apartment-desktop-1440.png` ;
- `lot7-search-apartment-mobile-390.png`.

## Inspection visuelle finale — CONFORME

Comparaison effectuée avec `AKARFINDER_SEARCH_PROPERTY_TYPE_VISUALS_CANONICAL.md`.

Constats :

- Appartement : bleu azur ✅ ;
- Villa : vert émeraude ✅ ;
- Terrain : orange terre ✅ ;
- Bureau : violet ✅ ;
- Local commercial : turquoise ✅ ;
- Riad : or chaleureux ✅ ;
- la Villa utilise bien le langage premium vert du système par type, pas le fallback générique/contextuel ✅ ;
- vraie surface Search / lane `public_indexed` ✅ ;
- hiérarchie badge → artwork → prix → titre → facts → provenance conservée ✅ ;
- aucun overflow ou collision bloquante observé sur 390 px ;
- rendu desktop cohérent avec le canonique.

## Cleanup proof

Le trigger `push` temporaire utilisé pendant le debugging du visual proof a été retiré de `.github/workflows/data-ingestion-lot7-visual-proof.yml`.

Commit cleanup : `4910066e7760354692d2a331b8bbdccca17f8d02`.

Le workflow conserve uniquement :

- `pull_request` ;
- `workflow_dispatch`.

## Closure rule — SATISFIED

- preuve fonctionnelle GREEN ✅ ;
- vrai Chromium contre `/search` ✅ ;
- SQLite isolée ✅ ;
- artifact récupéré ✅ ;
- captures 1440 + 390 inspectées ✅ ;
- conformité au canonique visuel ✅ ;
- aucun write production / historique ✅ ;
- trigger push temporaire nettoyé ✅.

**Verdict : Lot 7 CLOSED.**

PR `#996` reste OPEN / DRAFT / non mergée. Aucun déploiement Vercel n'est autorisé ou requis pour ce closeout.
