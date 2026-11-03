# Akarfinder — Mubawab V6.4.6, lot P1 qualité (03/11/2026)

## Goal / Success / Evidence
**Goal** : détecter les pages de résultats anormalement courtes et les dérives de quartiers, et mesurer le type de bien **observé dans le titre** sans l'inférer de la recherche d'appartements.

**Succès observable :**
1. Les 3 derniers `expectedFailure` synthétiques de Claude deviennent des tests normaux qui réussissent.
2. Les pages à 17 cartes/32 échouent explicitement `below_shard_baseline_provisional`; une double dérive des classes localité échoue en mode strict.
3. Les titres sont classés `apartment|apartment_probable|villa|land|office|shop|mixed_ambiguous|unknown`, conservés dans SQLite avec migration, et comptés séparément dans les rapports. Une villa n'est **pas** une annonce appartement confirmée.
4. Aucune URL sans baseline explicitement approuvée ne passe le préflight, aucune écriture DB en cas de refus.
5. Les tests offline du HEAD passent, et les rapports certifient uniquement les éléments effectivement mesurés.

## Référence et calibration
- [Canary réel V646 #41730963403](https://github.com/hraaaaf/Akarfinder/actions/runs/41730963403), code `9ce27756ff19f9d91b586ca93c53d86ce641c40d`, 3 pages de liste, 97 IDs-source.
- Éligibles mesurés : Rabat **32**, Casablanca Maârif **32**, Agadir Hay Salam **33** ; source exacte dans `quality_baselines_v646_20261103.json`.
- Seuil **provisoire 70 %** de l'unique observation, inspiré de la revue contradictoire Claude. Ce seuil **n'est pas calibré statistiquement** : un vrai changement du marché peut provoquer une fausse alerte et une page partiellement rendue à 80 % peut encore passer. Il s'agit d'un garde-fou de révision humaine, jamais d'une preuve d'exhaustivité.
- Validation du type : **signal de titre uniquement**, jamais corroboration avec la description, le propriétaire ni les photos. `apartment_confirmed_from_title_only` signifie « mot-clé fort dans le titre », pas « bien physiquement vérifié ».
- Le parseur de compatibilité conserve un mode permissif pour les anciennes fixtures ; **le canary live et le chemin d'import `main` activent explicitement les contrôles stricts**.
- Les 4 tests qui utilisent le DOM épuré du 01/11 restent ignorés en CI : cette fixture **n'est pas incluse** dans les sources autorisées.
- Aucun nouveau canary réseau dans ce lot P1 : pas de visites supplémentaires les mêmes 24 h, et aucune prétention de certification live post-patch.

## Preuves attendues
- Code : `scripts/pilots/mubawab-v646/akarfinder_scraper.py`, `live_canary.py`, `benchmark_evidence.py`.
- Tests : `tests/test_v646_review_adversarial.py`, `tests/test_v646_p1_quality_gates.py`.
- `python -m unittest discover -s tests -v` avec 0 échecs inattendus / 0 expectedFailure pour les tests synthétiques.
- En cas d'erreur CI : diagnostiquer, corriger et relancer sans toucher aux quotas ou au site.

## Portée / NO-GO
Pas de pagination, pas de scraping massif, pas de détails ou photos, pas de nouveau déploiement. `publication_eligible_proven=0` ; activité/fraîcheur, unicité physique et droits non établis. L'objectif de 200 000 annonces reste NO-GO.

## Suite
CI sur commit final → revue critique et correctifs si nécessaire → Notion mis à jour → PR Draft dédiée sans merge → prochaine calibration sur plusieurs observations indépendantes et représentatives (autorisation séparée si navigations supplémentaires).
