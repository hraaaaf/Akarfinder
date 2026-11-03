# Akarfinder — V6.4.6 : validation réelle bornée des 3 shards — 2026-11-03

## Goal / Succès / Preuve
- **Goal** : vérifier les correctifs P0/P1 de Claude sur le chemin navigateur V6.4.6 en condition réelle, sur les **trois URL déjà approuvées** du manifeste, sans modification du schéma public ni DB de production.
- **Succès par shard** : `robots` fraîchement vérifié, `fetch_status=ok`, HTTP 200, `canary_status=parsed_quality_pass`, un seul accès page et un rapport JSON avec identifiants, SHA et compteurs.
- **Preuve** : logs de GitHub Actions + artefact JSON de chaque shard + CI offline sur le HEAD. Un workflow vert seul ne vaut pas une extraction réussie.
- **Arrêt** : en cas de 403/429, robots refusé, challenge, absence de page exploitable ou seuil de qualité rejeté, arrêter la séquence sans nouvelle tentative ni contournement ; ne pas continuer le shard suivant.

## Périmètre
1. Rabat : `https://www.mubawab.ma/fr/st/rabat/appartements-a-vendre`
2. Casablanca Maârif : `https://www.mubawab.ma/fr/sd/casablanca/ma%C3%A2rif/appartements-a-vendre` (seulement si Rabat passe)
3. Agadir Hay Salam : `https://www.mubawab.ma/fr/sd/agadir/hay-salam/appartements-a-vendre` (seulement si Casablanca passe)

Chaque invocation de `live_canary.py` ne cible **qu'une page**, sélectionnée exclusivement parmi les 3 lignes du manifeste local `pilot-urls.txt`. La vérification de robots est répétée par shard. Pas de détail d'annonce, pas de pagination, pas de collecte de photos, pas de bypass, pas de proxy, pas de SQLite.

## État initial vérifié
- Branche source corrigée : `fix/akar-v646-claude-hardening-20261103`, commit code `272ec809fee806ea134b622de5264a10b445793c` ; PR Draft #1149, non mergée.
- CI offline corrigée [#41728390623](https://github.com/hraaaaf/Akarfinder/actions/runs/41728390623) : success, 66 tests (59 pass, 4 skipped, 3 expectedFailure), historiquement V645 97 IDs / 97 noyaux complets.
- Ancien canary V646 sur Rabat [#41611908342](https://github.com/hraaaaf/Akarfinder/actions/runs/41611908342), **avant correctifs** : 32 ID-source, 29 prix numériques / 3 sur demande, qualité pass, HTTP 200. Ce résultat ne certifie pas le nouveau code.
- Nouvelle branche de validation : `test/akar-v646-3shard-live-20261103`. Paramétrage URL et tests offline en préparation.
- **200 000 annonces fraîches, physiquement uniques, publiables : non prouvé.** Ne pas extrapoler une page.

## Gate / Séquence restante
1. Valider offline le paramétrage du canary et les refus de source (`test_live_canary.py`).
2. Exécuter **une fois** le job borné Rabat, puis Casablanca et Agadir conditionnellement. Un échec empêche toute tentative du shard suivant.
3. Lire logs + artefacts JSON ; calculer identifiants distincts observés, complétude stricte, taux de refus et latences **par page**.
4. Contrôler l'absence de merge/déploiement/écriture DB, publier un verdict **GO canary unitaire / NO-GO 200k** et mettre à jour Notion.
5. Fermer ou retirer la capacité de déclenchement du workflow one-shot sans déclencher une deuxième collecte. La PR #1149 reste Draft.

## Limites
- `unique_source_ids` n'est pas une déduplication physique ; `complete_core_with_district` compte des champs parsés, non vérifiés indépendamment.
- `publication_eligible_proven=0`. Pas de droits d'usage confirmés.
- Le seuil de détection de pages tronquées, le typage des appartements et le contrôle de dérive des quartiers restent ouverts : le canary peut déclarer qualité pass malgré ces limites.

## Exécution autorisée démarrée (état au premier contrôle)
- CI de préparation : [run #41730718069](https://github.com/hraaaaf/Akarfinder/actions/runs/41730718069) sur HEAD tests `96b8144b4d13cce500f93886677eac86586a78c1`, **SUCCESS**, **69 tests**, dont 4 skipped et 3 expectedFailure.
- One-shot live [#41730963403](https://github.com/hraaaaf/Akarfinder/actions/runs/41730963403), commit exact `9ce27756ff19f9d91b586ca93c53d86ce641c40d`, **in_progress au premier contrôle**. Aucun chiffre live publié avant les rapports.
- Le workflow one-shot commence par exécuter les tests offline, puis installe Chromium normal, puis une navigation par shard avec vérification robots préalable. Chaque step stoppe en cas de code de retour non zéro du canary. Résultats JSON archivés avec `if: always()`.
- Déclencheur one-shot : la modification d'un seul fichier de workflow et une condition sur le marqueur explicite du commit autorisé. La suppression du workflow après résultat empêchera toute relance future par push.
- Aucune requête de détail, pas de crawl massif, pas de déploiement, pas de changement DB produit, PR #1149 intacte.

## Résultat réel et preuve — 03/11/2026, run #41730963403

**Statut : SUCCESS**, HEAD de code `9ce27756ff19f9d91b586ca93c53d86ce641c40d`, `GITHUB_SHA` identique dans les trois JSON de canary. [Workflow](https://github.com/hraaaaf/Akarfinder/actions/runs/41730963403) ; [artefact des trois JSON #13277225359](https://github.com/hraaaaf/Akarfinder/actions/runs/41730963403/artifacts/13277225359), SHA256 de l'archive `9a01c57a3f2fd6dd9833daa0ce59f6520409790183d5ec2ab53bb804551a953f` (CRC OK).

| Shard | HTTP / statut | Cartes totales | Ignorées | IDs distincts | Core avec quartier | Prix numériques | Sur demande | IDs déjà dans V645 | IDs absents V645 | Durée sonde |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Rabat | 200 / `parsed_quality_pass` | 34 | 2 | 32 | 32 | 28 | 4 | 16 | 16 | 4,049 s |
| Casablanca Maârif | 200 / `parsed_quality_pass` | 34 | 2 | 32 | 32 | 32 | 0 | 21 | 11 | 4,544 s |
| Agadir Hay Salam | 200 / `parsed_quality_pass` | 34 | 1 | 33 | 33 | 30 | 3 | 32 | 1 | 3,782 s |
| **Total** | **3/3 pass** | **102** | **5** | **97** | **97** | **90** | **7** | **69** | **28** | **12,375 s cumulé** |

**Méthode de comparaison :** extraction du `akarfinder.db` historique (ZIP artifact V645 `13091518100`) en lecture seule ; comparaison ensembliste des `observed_source_ids` du nouvel artefact V646 à l'ensemble de 97 IDs déjà présents dans ce SQLite. **0 doublon d'ID entre les trois shards V646**, et 28 IDs historiques **non visibles dans la première page** des shards actuels. Les 28 absents du snapshot ne prouvent pas de nouvelles publications et les 28 manquants ne prouvent pas de suppressions.

**Contrôles :** chaque shard a fait exactement une navigation de la page de liste, une tentative, HTTP 200, vérification robots `checked`, `quality_accepted=true`, motifs de rejet vides. Les analyses JSON contiennent SHA HTML, SHA de la liste d'IDs et SHA des scripts.

**GO** : fiabilité du canary actuel pour **ces trois premières pages**, valeurs et comptage de 97 IDs distincts par source avec noyau de champs parsés. **NO-GO** : pagination, exhaustivité des shards, droit de publication, fraîcheur des annonces, unicité physique des biens, classification vérifiée appartement, taux de rotation du site, débit durable, et stock national de 200 000 fiches. Les 3 expectedFailure qualité restent ouverts (localité, troncature, typage).

**Sécurité** : aucun détail ou image téléchargé séparément, aucun accès paginé, aucune écriture dans une base, aucun merge ni déploiement. Résultat d'un seul instant T, non benchmark longitudinal.

## Post-run : garde one-shot refermée, preuve pérennisée
- Workflow one-shot supprimé du HEAD par commit [`82e3a395`](https://github.com/hraaaaf/Akarfinder/commit/82e3a395d1f0516eb963e8c618eca6cdce4276bd) après la conclusion du run. Les logs et JSON historiques restent disponibles sous #41730963403.
- Rapport agrégé machine-readable permanent : [`docs/evidence/MUBAWAB_V646_3SHARD_20261103.json`](https://github.com/hraaaaf/Akarfinder/blob/test/akar-v646-3shard-live-20261103/docs/evidence/MUBAWAB_V646_3SHARD_20261103.json), commit `b224b88a39aa1c7ecb035c1d851a0ce52bc5b7d4`.
- Contrôle des 3 JSON de l'artefact téléchargé : ZIP CRC OK ; historique V645 SQLite `PRAGMA integrity_check=ok`, 97 IDs. Intersection identifiée 69 ; nouveaux **par rapport à la liste historique** 28 ; anciennes entrées **non visibles sur la première page actuelle** 28.
- **Clôture du test borné = GO** pour les 3 canarys unitaire V646, et **NO-GO** pour un système de collecte national. Le PR de correction #1149 reste Draft ; `main` intact.
