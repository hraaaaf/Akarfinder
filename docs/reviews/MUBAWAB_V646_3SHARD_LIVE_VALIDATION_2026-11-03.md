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
