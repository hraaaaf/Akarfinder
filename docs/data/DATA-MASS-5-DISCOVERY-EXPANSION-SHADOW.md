# DATA MASS-5 — Discovery Expansion Shadow

## Objectif

Mesurer le delta de découverte apparu après le réservoir certifié MASS-1, sans acquérir de contenu source et sans modifier la production.

## Méthode

1. rejouer le classifieur de réservoir MASS-1 sur `discovery_candidates` en lecture seule ;
2. retirer les URLs déjà présentes dans le Thin Index ;
3. conserver les domaines actuellement classés `SOURCE_FACTORY` ;
4. soustraire la cohorte certifiée de 101 domaines `MASS_2A_CERTIFIED_COHORT_V1` ;
5. produire le delta post-baseline et ses volumes en **URL representations**, jamais en biens uniques.

## Boundary

- découverte/capacité/structure ≠ permission ;
- Source Registry reste autoritaire ;
- nouveau domaine candidat ≠ autorisation ;
- `publicActivableNow=false` ;
- 0 source/detail fetch ;
- 0 DB/Registry/Search write ;
- 0 permission inférée.

Tout domaine ajouté par MASS-5 doit repasser par une revue Source Factory/Registry séparée avant toute décision d'acquisition, ingestion ou affichage.
