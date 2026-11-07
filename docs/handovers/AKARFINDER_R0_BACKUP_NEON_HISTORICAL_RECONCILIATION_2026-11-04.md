# Akarfinder — R0 réconciliation Backup × Neon × Historique — 04/11/2026

## Verdict

**Inventaires historiques réconciliés pour Avito et Mubawab seulement.** Les espaces d’identifiants sont validés par la clé source numérique et, lorsque la clé est absente ou incomplète, le dernier token numérique de l’URL. Cette règle reproduit l’identifiant du manifeste historique sur 27 053/27 053 URLs Avito et 5 194/5 195 URLs Mubawab.

Le résultat décrit des **références source historiques distinctes**, jamais des biens physiques distincts, annonces actuellement actives, annonces fraîches, ni annonces autorisées à l’exploitation commerciale.

La branche Neon `recovery-schema-cert-20260924` est une branche de récupération archivée. Elle a été interrogée en lecture seule; aucune restauration, insertion, modification, crawl ou déploiement n’a été réalisé.

## Sources contrôlées

| Inventaire | Avito | Mubawab | Nature |
| --- | ---: | ---: | --- |
| Manifeste GitHub historique | 27 053 | 5 195 | IDs source historiques, SQLite intègre |
| Backup PostgreSQL local | 24 209 candidats | 45 887 candidats | Extraction source key ou suffixe URL validé |
| Neon recovery | 13 996 | 43 624 | Références source candidates dédupliquées localement |
| Canaries V6.4.6 | — | 97 | Trois pages, IDs tous distincts entre pages |

Les candidats issus du backup et Neon ne sont pas ajoutés aux lignes ou aux propriétés sans jointure : les unions ci-dessous effectuent cette déduplication dans l’espace `(source, source_id)` validé.

## Intersections et unions exactes

| Source | Union distincte des inventaires | H ∩ Backup | H ∩ Neon | Backup ∩ Neon | H ∩ Backup ∩ Neon | Exclusivement H | Exclusivement Backup | Exclusivement Neon |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Avito | 64 098 | 185 | 377 | 664 | 66 | 26 557 | 23 426 | 13 021 |
| Mubawab (inclut canary) | 72 618 | 4 936 | 3 380 | 17 171 | 3 349 | 228 | 27 120 | 26 419 |

La somme des deux espaces de clés validés donne **136 716 références historiques distinctes**. Elle reste une somme de références Avito et Mubawab distinctes par source, sans déduplication entre portails au niveau du bien physique.

### Canaries Mubawab V6.4.6

| Ville | IDs | Retrouvés Neon | Retrouvés backup | Retrouvés historique | Absents des trois |
| --- | ---: | ---: | ---: | ---: | ---: |
| Rabat | 32 | 3 | 9 | 0 | 23 |
| Casablanca Maârif | 32 | 6 | 10 | 7 | 19 |
| Agadir Hay Salam | 33 | 8 | 25 | 24 | 8 |
| Total | 97 | 17 | 44 | 31 | 50 |

La jointure Neon donne 17/97 : **7** par `source_offer_key` seul, **17** lorsqu’on ajoute l’identifiant validé extrait de l’URL. Un désaccord clé-versus-URL a été observé sur une ligne Mubawab Neon; les deux identifiants restent séparés et aucun choix arbitraire ni fusion physique n’a été fait.

## Neon recovery : qualité d’archive

- `listing_sources` et `property_listings` : **151 900 lignes** chacun.
- Critère strict titre + prix + ville + quartier + surface : **44 427 lignes**.
- Avito identifié : 13 199 / 13 996 références Neon candidates complètes; dernière observation archivée : 08/09/2026.
- Mubawab identifié : 27 278 / 43 624 références Neon candidates complètes; dernière observation archivée : 08/09/2026.
- Dernière date parmi toutes les sources Neon : **26/09/2026**. Ces champs ne vérifient aucune disponibilité au 04/11/2026.

Les répartitions source et ville agrégées sont conservées dans le JSON. Les sources MarocImmo, Sarout, Domio, Agenz et les autres sont recensées avec leurs volumes, complétude, dates et présence de clés, mais ne sont **pas** intégrées à l’union de 136 716 : aucune validation externe de leurs espaces de clés ne permet encore une jointure entre les trois inventaires.

## Objectif 200K

| Indicateur | Valeur |
| --- | ---: |
| Références historiques distinctes, espaces validés | 136 716 |
| Écart vers 200 000 références historiques | 63 284 |
| Annonces strictement complètes dans Neon recovery | 44 427 lignes |
| Biens physiques uniques prouvés | `UNKNOWN` |
| Activité actuelle vérifiée | `UNKNOWN` |
| Droits commerciaux vérifiés | `UNKNOWN` |
| `fresh_unique_eligible` | `UNKNOWN` |
| Écart vers 200K frais, uniques et autorisés | `UNKNOWN` |

Aucun volume historique ne doit être présenté comme stock commercialisable ou frais.

## Reproduction et contrôles

- Artifact historique GitHub : run [#41322759990](https://github.com/hraaaaf/Akarfinder/actions/runs/41322759990), digest et checksums embarqués vérifiés localement; SQLite `integrity_check=ok`.
- Neon : projet `ancient-violet-43534870`, branche `br-cold-mouse-b2a50yaa`, base `AkarFinder`, requêtes `SELECT`/`COPY TO STDOUT` uniquement.
- Backup : scan local en flux; SQL du dump non exécuté; aucune clé, URL, description ou donnée sensible incluse dans les livrables.
- Les tests couvrent normalisation, suffixe d’URL, collision clé/URL et calcul d’union sans double comptage.

## Next exact

Valider, pour MarocImmo, Sarout, Domio, Agenz et les autres, un espace d’identifiant source documenté avant toute jointure inter-inventaires. Puis obtenir une preuve autorisée d’activité sous 48 h, de droits commerciaux et de déduplication physique avant de calculer `fresh_unique_eligible`.
