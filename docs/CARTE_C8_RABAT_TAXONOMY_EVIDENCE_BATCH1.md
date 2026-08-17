# C8 — Rabat Taxonomy Evidence Batch 1

## Goal

Identifier un premier sous-ensemble des 18 candidates C8B dont l'identité comme `product_locality` est explicitement défendue par une source first-party, sans modifier le registre canonique, la DB ou la surface publique.

## Critère

Une candidate n'entre dans ce batch que si une source institutionnelle first-party la qualifie explicitement de **quartier**, et pas seulement si son nom apparaît dans une adresse, un plan d'arrondissement, un index cartographique ou une source secondaire.

## Décisions

### Akkari — READY FOR TAXONOMY CERTIFICATION

L'Agence Urbaine de Rabat-Salé décrit son opération comme la « rénovation urbaine des quartiers Océan et Akkari — Arrondissement Hassan, Ville Rabat ». Cette formulation distingue explicitement Akkari comme quartier de Rabat.

Source : https://aurs.org.ma/fr/savoir-faire/grands-projets-urbains/

### Al Boustane — READY FOR TAXONOMY CERTIFICATION

L'AURS publie « Al Boustane : un quartier novateur de l'approche environnementale de l'urbanisme » et décrit le « nouveau quartier Al Boustane » à Rabat. La sémantique quartier est explicite.

Source : https://aurs.org.ma/fr/attributions_attributions/etudes-generales/

## Ce que ce lot ne fait pas

- il ne change pas `taxonomy_status` ;
- il ne crée aucune `geo_entity` ;
- il ne modifie aucun alias production ;
- il ne crée aucune géométrie ;
- il n'active ni SEO ni carte ;
- il n'écrit rien en DB.

Les 16 autres candidates ne sont pas rejetées : elles restent simplement hors de ce premier batch tant qu'une preuve sémantique équivalente n'est pas verrouillée.

## Next exact

Après certification exact-head de cette matrice, promouvoir Akkari et Al Boustane en taxonomie C8 via un lot séparé, en conservant `market_map_eligible=false`, `geometry_status=unresolved`, `activation_status=blocked` et sans mutation DB. Ensuite reprendre la preuve géométrique uniquement pour les localités taxonomiquement certifiées.
