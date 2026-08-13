# DATA MASS-X1 — Candidate Promotion Shadow

Objectif : convertir le réservoir certifié de pages détail immobilières Maroc en une file de promotion déterministe sans contourner la Source Registry.

## Contrat

- unité : `URL_REPRESENTATION`, jamais bien unique ;
- source : classification MASS-1 existante, sans deuxième classifieur concurrent ;
- `POLICY_COMPATIBLE_TAIL` → `POLICY_ADMISSIBLE` pour préparation d'un canary séparé uniquement ;
- toute autre queue → `POLICY_BLOCKED` ;
- candidate ≠ autorisation ; qualité ≠ éligibilité ≠ permission ;
- Source Registry autoritaire ;
- 0 DB/Registry/Search write ; 0 source/detail fetch ; 0 permission inférée ;
- aucune activation publique dans MASS-X1.

## Baseline certifiée

MASS-6 : 24 505 représentations URL probablement `Morocco listing-detail`, issues du réservoir net-new. Ce nombre ne représente pas 24 505 biens uniques.

## État live au lancement

Source Registry : 35 rows, 0 policy-admissible. L'état attendu de MASS-X1 est donc 0 promotable / 24 505 policy-blocked jusqu'à changement explicite et vérifié de policy.

Toute écriture ou activation future nécessite un lot canary séparé et un feu vert humain explicite.
