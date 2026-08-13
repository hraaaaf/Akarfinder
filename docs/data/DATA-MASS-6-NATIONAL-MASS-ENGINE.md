# DATA MASS-6 — National Mass Engine

Objectif : composer les frontières certifiées MASS-1→5 en un pipeline national déterministe et fail-closed.

Ordre verrouillé : `DISCOVER → CLASSIFY → POLICY → INDEX → FRESHNESS → DEDUP → RANK`.

Règles :
- Source Registry autoritaire ;
- aucun stage aval ne peut contourner un stage amont bloqué ;
- qualité, volume, crawlabilité ou découverte ne créent jamais une permission ;
- le lot démarre strictement `shadow_read_only` ;
- 0 DB/Registry/Search write ; 0 source/detail fetch ; 0 permission inférée.

État attendu actuel : si `policyAdmissibleRegistryRows = 0`, le moteur doit s'arrêter à `POLICY`, avec `rankEligible=false`. Toute activation future exige un lot séparé et un gate humain explicite.