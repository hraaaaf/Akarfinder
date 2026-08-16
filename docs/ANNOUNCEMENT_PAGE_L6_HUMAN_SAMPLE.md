# ANNOUNCEMENT-PAGE-ULTRA-PREMIUM — ANN-L6 Human Sample

**Lot : ANN-L6 — Vivre ici**  
**Date : 2026-08-16**  
**Statut : revue humaine de preuve live réutilisée, sans extrapolation production**

## Source de vérité

Cette revue réutilise exclusivement l'artefact live ANN-L5 déjà certifié :

- run : `31943502557` — SUCCESS ;
- artefact : `9262665086` ;
- digest : `sha256:72268cfebb277208ff8ec7b5789ff1d9ac3df297b32a1630f929a788586cfd94` ;
- schéma : `ANNOUNCEMENT_PAGE_L5_GEO_BAKEOFF_V3` ;
- 32/32 POI réels ;
- 224/224 paires OSRM routables.

Les endpoints Nominatim/Overpass/OSRM de cet artefact restent **benchmark-only**. Cette revue ne les transforme pas en providers production ANN-L6 et ne prétend pas certifier un endpoint Valhalla non configuré.

## Échantillon humain POI

| Ville | POI réel observé | Catégorie source | Taxonomie ANN-L6 attendue | Revue |
|---|---|---|---|---|
| Rabat | Paul Cézanne | `school` | Écoles & crèches (`education`) | cohérent |
| Rabat | Pharmacie Ibn Sina صيدلية ابن سينا | `pharmacy` | Santé (`health`) | cohérent |
| Casablanca | Ecole Madania | `school` | Écoles & crèches (`education`) | cohérent |
| Casablanca | Clinique Badr مصحة بدر | `clinic` | Santé (`health`) | cohérent |
| Marrakech | HEEC | `school` | Écoles & crèches (`education`) | cohérent |
| Marrakech | Yochkad Supermarché | `supermarket` | Courses & marchés (`groceries`) | cohérent |
| Tanger | Pharmacie Anegay صيدلية أنغاي | `pharmacy` | Santé (`health`) | cohérent |
| Tanger | Attijariwafa bank | `bank` | Banques (`banking`) | cohérent |

Les noms sont repris de l'artefact live tel quel. Aucun nom manquant ou libellé ambigu n'est « amélioré » manuellement.

## Échantillon humain routage

L'artefact L5 ne conserve pas des minutes individuelles par POI ; il conserve la connectivité des matrices. ANN-L6 ne doit donc **pas** en déduire des minutes historiques.

| Ville | Paires routées | Paires attendues | Ratio | Revue |
|---|---:|---:|---:|---|
| Rabat | 56 | 56 | 100 % | connectivité complète |
| Casablanca | 56 | 56 | 100 % | connectivité complète |
| Marrakech | 56 | 56 | 100 % | connectivité complète |
| Tanger | 56 | 56 | 100 % | connectivité complète |

Les minutes publiques ANN-L6 restent soumises au contrat actuel : `ExactGeoTruth` + destination POI cohérente + mesure de route fraîche + preuve provider attribuable. La connectivité L5 n'est jamais convertie en durée affichable.

## Contrôles ANN-L6 complémentaires

La revue humaine est complétée par les tests exacts du lot :

- anti-dup même catégorie / même nom / proximité ≤80 m ;
- POI malformés ou hors plage rejetés ;
- route rejetée si `poiId` ou destination ne correspond pas au POI ;
- route expirée, durée nulle ou distance négative rejetée ;
- `canShowPreciseRouteTimes=false` sans route mesurée même avec geo exacte ;
- neighborhood centroid : POI contextuels autorisés, minutes et isochrones interdits ;
- city centroid : module précis masqué ;
- isochrones uniquement 5/10/15 et uniquement avec preuve fraîche ;
- adapters Overpass/Valhalla testés avec réponses déterministes, endpoints explicites et absence de fallback public implicite.

## Conclusion de la revue

L'échantillon humain est **cohérent avec la taxonomie ANN-L6** et la preuve live historique confirme une connectivité routable sur les quatre villes. La certification finale ANN-L6 doit encore dépendre du gate exact-head, du navigateur ciblé et du merge runtime. Aucun crédit de roadmap n'est accordé par ce document seul.
