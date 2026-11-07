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

Le manifeste `akar-200k-isolated-inventory` du run [41322759990](https://github.com/hraaaaf/Akarfinder/actions/runs/41322759990) a été téléchargé localement; SHA-256 de l’archive conforme au digest GitHub, SHA-256 embarqués conformes pour ses deux membres, SQLite `PRAGMA integrity_check=ok`. Il contient 32 460 clés source-scoped : 32 248 IDs historiques (Avito 27 053; Mubawab 5 195) et un échantillon distinct de 410 IDs, dont 212 absents de l’historique (Avito 53; Mubawab 159). Cette tranche `recent_sample` **n’est pas** le canary Mubawab V6.4.6.

Jointure locale `(source, source_id)` : IDs explicites des champs source et dernier token numérique de l’URL quand sa longueur correspond au format de la source. Cette règle d’URL reproduit l’ID sur 27 053/27 053 URLs historiques Avito et 5 194/5 195 Mubawab. Dans l’union des trois tables de jointure sélectionnées (`source_offer_seeds`, `listing_sources`, `mubawab_listing_corpus_v1`), on trouve **185/27 053 IDs historiques Avito** et **4 936/5 195 Mubawab**; 26 868 Avito et 259 Mubawab ne sont pas retrouvés dans ces tables sélectionnées. Ce sont des recouvrements d’identifiants source, jamais de biens actifs ou physiques uniques.

Dans l’échantillon `recent_sample` du même manifeste, le backup recoupe 0/97 IDs Avito et 166/313 Mubawab; parmi ceux absents de l’historique, 0/53 Avito et 13/159 Mubawab apparaissent dans les tables sélectionnées.

**Canary V6.4.6 distinct :** 97 IDs Mubawab agrégés sur trois pages. La [preuve JSON publiée](https://github.com/hraaaaf/Akarfinder/blob/test/akar-v646-direct-canary-cli-20261104/scripts/pilots/mubawab-v646/artifacts/v646-post-p1-first-live/post-p1-verification.json) conserve les comptes et SHA-256 par page, pas les 97 valeurs. Il n’existe donc pas de jointure vérifiable avec le backup : résultat `UNKNOWN`, pas zéro. Ne pas additionner ces 97 au manifeste historique.

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
- Script hors ligne d’inventaire : `scripts/audits/backup_inventory_safe.py`.
- JSON de jointure agrégée local : `backup_inventory_reconciliation_safe.json`, conservé dans le dossier temporaire.
- Script de réconciliation hors ligne : `scripts/audits/reconcile_backup_inventory.py`; il lit le SQLite historique en mode read-only et garde IDs/URLs en mémoire uniquement.
- Script local de réconciliation : `scripts/audits/reconcile_backup_inventory.py` (nouveau livrable PR).
- Rapport canonique R0 lié : [AKARFINDER 200K R0 read-only audit](https://github.com/hraaaaf/Akarfinder/blob/sandbox/akar-chrome-probe-20261101/docs/handovers/AKARFINDER_200K_R0_READONLY_AUDIT_2026-11-04.md).

## Next exact

Garder ces intersections comme baseline d’archive, sans les interpréter comme du stock actif. Pour joindre spécifiquement les 97 IDs du canary V6.4.6, il faut le manifeste des IDs bruts déjà émis par la qualification; les preuves actuellement publiées ne contiennent que les empreintes par ville. Pour mesurer le stock live, il faudra une source autorisée et accessible ainsi que des preuves d’activité, droits et dédup physique. Aucun merge, import production ou déploiement n’est justifié par cet inventaire.
