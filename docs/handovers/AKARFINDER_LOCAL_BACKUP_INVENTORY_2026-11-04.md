# Inventaire local vérifiable du backup — 04/11/2026

## Verdict R0

**R0 — inventaire d’archive local effectué; stock actuel, fraîcheur commerciale et faisabilité 200K restent non démontrés.** `fresh_unique_eligible = UNKNOWN`. Il n’y a eu ni restauration PostgreSQL, ni exécution du SQL du dump, ni requête réseau, ni accès/écriture de base de production.

## Provenance et traitement

Le candidat local a été identifié comme une archive gzip contenant du SQL PostgreSQL en clair. Les métadonnées exactes du fichier (nom, octets, SHA-256) sont consignées dans `backup_inventory_safe.json` local uniquement. Elles sont omises de cette copie publique. Le nom du fichier indique une date d’octobre, mais l’en-tête SQL ne fournit pas de date de création et l’en-tête gzip porte un timestamp nul : **la date exacte du snapshot n’est pas démontrée par ces métadonnées**. Les horodatages de lignes retenus ci-dessous plafonnent au 7 septembre 2026.

Le script parcourt le flux gzip en lecture seule, ne lance aucune commande SQL et ne crée aucune base. Il n’émet que des comptages, distributions et drapeaux de présence. Les données personnelles et tables sans rapport avec l’inventaire immobilier ne contribuent pas aux mesures publiées; aucune valeur de ligne n’est incluse.

## Comptages observés par table

| Table | Lignes |
| --- | ---: |
| `public.discovery_candidates` | 321 173 |
| `public.source_offer_seeds` | 78 110 |
| `public.listing_sources` | 19 621 |
| `public.source_offer_observations` | 19 908 |
| `public.property_listings` | 19 616 |
| `public.mubawab_listing_corpus_v1` | 37 420 |
| `public.property_clusters` | 7 796 |
| `public.property_cluster_members` | 7 802 |

Les mêmes annonces peuvent apparaître dans plusieurs tables; ces lignes **ne doivent pas être additionnées comme biens uniques**.

## Identifiants, URLs et complétude

- `source_offer_seeds` : 78 110 identifiants internes non nuls distincts et 78 110 URLs canoniques distinctes.
- `listing_sources` : 19 621 URLs distinctes; 13 784 clés `source_offer_key` non nulles distinctes. Les clés manquantes ne sont pas complétées artificiellement.
- `mubawab_listing_corpus_v1` : 37 420 identifiants source distincts et 17 702 URLs canoniques distinctes.
- `property_listings` : 4 666 / 19 616 satisfont le critère strict présence de titre, prix, ville, quartier et surface. 5 832 ont un extrait de description; 134 indiquent au moins une photo.
- Les tables de clusters contiennent 7 796 lignes de cluster et 7 802 lignes d’appartenance. Cela décrit la sortie du système, **pas une preuve indépendante de 7 796 biens physiques uniques**.

## Fraîcheur, activité et droits

- La table d’observations porte 18 713 assertions `active` et 1 195 assertions `inactive`. Ce sont des états enregistrés dans l’archive, pas des validations actuelles.
- `listing_sources.is_active` vaut vrai pour 18 432 lignes et faux pour 1 189.
- Statuts de conformité enregistrés : `link_only_index` pour 13 784 lignes, `NULL` pour 5 837. **Aucun de ces statuts ne constitue une autorisation commerciale vérifiée.** Droits commerciaux confirmés : `UNKNOWN`.
- Les labels de fraîcheur indiquent 4 302 `fresh_confirmed`, 2 460 `aging` et 71 348 `seed_only` dans les seeds; le corpus Mubawab contient 18 445 `fresh_confirmed` et 18 975 `uncertain`. Ce sont des labels historiques.
- Le plus récent horodatage observé dans les tables d’inventaire date du **7 septembre 2026**. Zéro ligne porte un horodatage sous la fenêtre de 48 h calculée le 4 novembre 2026. **Activité vérifiée sous 48 h : 0; disponibilité actuelle : UNKNOWN.**

## Réconciliation avec les références historiques

Les références précédentes — 32 460 clés historiques `(source, source_id)` et 97 IDs-source de canaries — ne sont **pas additionnées** aux lignes du backup. Le dump expose des espaces d’identifiants et des tables différents (par exemple 24 518 seeds Avito, 26 496 seeds Mubawab, 680 lignes Avito dans `listing_sources`, 12 968 lignes Mubawab dans cette table et 37 420 lignes du corpus Mubawab). Sans jointure validée par `(source, source_id)` entre les manifestes, ces valeurs ne prouvent ni recouvrement ni croissance nette. Les 97 IDs de canary ne valent pas 97 biens physiques.

## Mesures exigées

| Mesure | Résultat | Interprétation |
| --- | ---: | --- |
| Lignes brutes | Par table ci-dessus | Plusieurs représentations d’une même annonce possibles |
| IDs source uniques | 13 784 clés non nulles `source_offer_key` dans `listing_sources` | Clés du dump, couverture incomplète; distinctes des IDs internes de seeds |
| URLs canoniques uniques | 78 110 dans `source_offer_seeds` | Uniquement ce namespace/table; pas d’union inter-tables |
| Groupes physiques uniques prouvés | `UNKNOWN` | Compteurs de clusters non certifiés comme biens physiques |
| Activité vérifiée ≤48 h | 0 dans les horodatages de l’archive | Dernier timestamp observé au 07/09/2026; aucune vérification live |
| Droits commerciaux vérifiés | `UNKNOWN` | Aucun justificatif/licence identifié dans les champs agrégés |
| `fresh_unique_eligible` | `UNKNOWN` | Pas de preuve conjointe d’activité, fraîcheur, droits, qualité et unicité physique |

## Artefacts

- JSON local complet (incluant métadonnées fichier) : `backup_inventory_safe.json`, gardé hors du dépôt.
- JSON agrégé : `docs/handovers/backup_inventory_aggregates_2026-11-04.json`.
- Script hors ligne : `scripts/audits/backup_inventory_safe.py`.
- Rapport canonique R0 lié : [AKARFINDER 200K R0 read-only audit](https://github.com/hraaaaf/Akarfinder/blob/sandbox/akar-chrome-probe-20261101/docs/handovers/AKARFINDER_200K_R0_READONLY_AUDIT_2026-11-04.md).

## Next exact

Garder ces compteurs comme baseline d’archive. Pour mesurer le stock réel, obtenir une source autorisée et accessible, définir la jointure validée entre les clés historiques et le backup, puis compter en lecture seule les preuves d’activité sous 48 h, droits, complétude et groupes physiques. Aucun merge, import production ou déploiement n’est justifié par cet inventaire.
