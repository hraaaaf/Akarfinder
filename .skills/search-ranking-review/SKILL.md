# Search & Ranking Review

## Purpose
Certifier que Search reste exact, stable, explicable et incapable de fabriquer ou masquer des représentations.

## When it applies
`app/api/search*`, `lib/search/**`, `lib/search-gateway/**`, SearchQuery, ranking, pagination/cursors, Typesense/DB search, déduplication ou tout changement de résultats publics.

## Required inspection
Contrats Search actuels, gateway/fallback/canary, filtres structurés, `q`, display eligibility, source attribution, pagination, dedupe, migrations liées et tests/runs Search existants.

## Mandatory evidence
Requêtes avant/après pertinentes ; parité Search/API ; stabilité pagination ; éligibilité ; absence de précision fabriquée ; impact réel sur résultats ; vrais gates exact-head dont ceux découverts dans `.github/workflows/`.

## Blockers
`q` absorbant city/district ; bypass Gateway ; ranking rendant publiable une ligne inéligible ; faux count/freshness/score ; curseur instable ; dedupe masquant collision ; changement Search non mesuré.

## PASS / FAIL criteria
PASS si tous invariants Search touchés sont prouvés sur le SHA exact et aucune régression bloquante. Sinon `CHANGES_REQUIRED`.

## Forbidden shortcuts
Pas de score manuel non sourcé ; pas de “Search amélioré” depuis une mutation DATA seule ; pas de fallback présenté comme vérité plus précise ; pas de check inventé.

## Required final report
SHA, surfaces Search touchées, scénarios avant/après, pagination/dedupe, gates exact-head, findings par sévérité, verdict PASS/CHANGES_REQUIRED.
