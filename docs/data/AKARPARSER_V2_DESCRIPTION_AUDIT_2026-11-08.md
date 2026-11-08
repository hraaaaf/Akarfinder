# Q1E — diagnostic des descriptions et revue qualité

**Exécution locale : 08/11/2026.** Source privée Neon Recovery en lecture seule ; aucune écriture Supabase/Neon, aucun import ni publication.

## Conclusion vérifiée

Le canary a extrait zéro description parce que l’export local ne contient aucun champ de description reconnu. La même absence a été mesurée dans les 151 900 lignes de l’export complet, dans les 1 000 lignes canary et dans les 1 000 sorties du parseur. L’échantillonnage n’explique donc pas le résultat, et aucun défaut du parseur n’est démontré.

Le contrôle de schéma des 76 pages et 151 900 lignes a trouvé un schéma uniforme de 19 clés de premier niveau, sans clé de description ni objet imbriqué de description. L’exporteur local conserve les objets de lignes qu’il reçoit et ajoute uniquement la clé de relation `property_listing_id`. Cette transformation n’explique pas l’absence : le champ n’était déjà pas présent dans les objets exportés.

Un `SELECT` agrégé distinct, exécuté en lecture seule directement sur Neon Recovery, compte 14 950 valeurs non vides sur 151 900 dans `public.property_listings.description_snippet`. Le texte SQL exact ayant produit l’export paginé n’a pas été conservé. La cause la mieux étayée est donc une omission de projection en amont de l’export local ; la clause SQL exacte reste inconnue. Le rapport d’audit renvoie `NO_RECOGNIZED_DESCRIPTIONS_IN_EXPORT`, avec 0/151 900 dans l’export, 0/1 000 dans le canary et 0/1 000 dans les sorties.

Le parseur comporte déjà les alias `description_snippet`, `description`, `short_description`, `snippet`, `body`, `text` et `adDescription`. Comme aucune de ces clés n’est présente en entrée, ajouter un alias ou modifier le parseur serait sans preuve et n’a pas été fait. Aucun nouveau canary n’a été lancé.

## Canary existant — résultats récapitulés

Le canary réel existant a traité 1 000/1 000 lignes :

| Statut | Nombre |
|---|---:|
| `ready_internal` | 133 |
| `complete_candidate` | 349 |
| `partial` | 485 |
| `candidate_url` | 0 |
| `quarantine` | 33 |
| Erreurs de parsing | 0 |
| Doublons exacts | 0 |

`ready_internal` n’autorise ni import Neon ni publication.

| Source | Traitées | ready_internal | complete_candidate | partial | quarantine |
|---|---:|---:|---:|---:|---:|
| Mubawab | 200 | 32 | 100 | 50 | 18 |
| Avito | 200 | 0 | 151 | 49 | 0 |
| Agenz | 200 | 1 | 48 | 136 | 15 |
| Domio | 200 | 50 | 1 | 149 | 0 |
| Autres | 200 | 50 | 49 | 101 | 0 |

Couverture en sortie du parseur : titre 1 000/1 000 ; description 0/1 000 ; ville 1 000/1 000 ; quartier 600/1 000 ; type 1 000/1 000 ; transaction 1 000/1 000 ; prix MAD 547/1 000 ; surface 574/1 000 ; chambres 65/1 000. La couverture mesure la présence, pas l’exactitude. Les valeurs source avaient prix 545/1 000 et surface 560/1 000 ; le parseur peut dériver des valeurs supplémentaires, ce qui demande une revue indépendante avant de conclure sur leur précision.

## Revue indépendante des 100 dossiers

Le script `akarparser_v2_review_scorecard.py` a préparé 100 modèles d’annotation rattachés au canary par jointure URL exacte. Les modèles sont en attente ; aucune preuve de capture originale indépendante n’a été fournie aux évaluateurs.

| Champ | Prédictions présentes dans la file | Indépendamment adjudiquées | Précision mesurée |
|---|---:|---:|---|
| Prix | 66/100 | 0 | NON VÉRIFIÉE |
| Surface | 76/100 | 0 | NON VÉRIFIÉE |
| Type de bien | 100/100 | 0 | NON VÉRIFIÉE |

Les 100 dossiers restent non résolus pour chacun des trois champs. Les comparaisons automatiques antérieures aux champs structurés du même export (prix 65/65, surface 72/72 et type 100/100 concordants parmi les valeurs disponibles) ne constituent pas une validation humaine indépendante et ne sont pas des précisions certifiées. La file contient 79 identifiants source explicites, mais l’identité doit encore être confrontée à une preuve originale indépendante. Le seuil de 98 % n’est pas évalué. Certification : **NON CERTIFIÉE**. Nouveaux enregistrements détaillés certifiés : **0**.

Blocage précis : les captures originales contemporaines ou archivées, avec métadonnées d’authenticité indépendantes, ne sont pas disponibles dans les éléments fournis à la procédure de revue. Les dossiers préparés et leur scorecard agrégé restent dans le stockage privé local.

## Intégrité, tests et emplacement des preuves

- SHA-256 de l’export avant et après l’audit : `c3d8a8c9476602baa7663d1e9903e6015cb7300d6e7539183bf48b735cb76b08`; 151 900 lignes. Aucune copie ou modification de l’original.
- Le manifeste privé `Q1E_DESCRIPTION_REVIEW_RESULT.manifest.json` (dans le répertoire canary privé) consigne le schéma agrégé, les preuves, les comptages, les empreintes et les contrôles d’absence d’écriture. Son SHA-256 : `5ca506245490a7f496d7cbb454389de8322ce68a27f283dfcea54a6926eb09e1`.
- Les rapports `description_coverage_aggregate.json`, `aggregate_report.json`, la file privée gzip, les 100 modèles et la scorecard restent sous `AkarFinder-DataMass-2026-11-07\Q1E_CANARY_20261107_233845`; aucun contenu brut ni donnée personnelle n’est commité.
- Suite Python AkarParser V2 : 62 tests réussis sur l’arbre de code du HEAD `4613fc1dfbc508d7e25565d7ea45bd8b6fdc5d9b`. La CI de ce HEAD avait 4/4 workflows terminés avec succès : AkarParser V2 Offline Regression, Required PR Gate, CI Workflow Efficiency Policy et Canonical Baseline Compile Validation.

## Suite exacte

1. Produire un nouvel export privé versionné depuis Neon Recovery, en lecture seule, avec `description_snippet` explicitement projeté ; garder l’export actuel intact et vérifier volumes, pagination, schéma, SHA-256 et absence de valeurs sensibles dans les rapports publics.
2. Vérifier que les descriptions récupérées proviennent bien du champ Neon autorisé, puis relancer un canary dans un nouveau répertoire privé. Ne modifier le parseur que si une perte est reproduite entre l’entrée et la sortie.
3. Obtenir les captures originales nécessaires à la revue des 100 dossiers, faire compléter les annotations indépendantes, puis recalculer la scorecard avec ses dénominateurs exacts.
4. Maintenir le lot non certifié et sans import/publication tant que les preuves indépendantes et les droits applicables ne sont pas établis.
