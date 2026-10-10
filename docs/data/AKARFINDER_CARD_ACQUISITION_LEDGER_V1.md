# AkarFinder — Card-first multi-source ledger V1

Date : 2026-10-10. Statut : **reconsolidation offline validée localement**, CI GitHub exacte en attente / à confirmer. Aucun merge, aucune DB, aucun Vercel.

## Goal

Réconcilier cinq artifacts indépendants et immuables de scraping de cartes immobilières publiques en un registre unique par `source_domain + listing_identity`. Refuser prix ou superficie contradictoires, distinguer **présence de cinq champs** de **fraîcheur commerciale**, et détecter des candidats doublons physiques sans aucune fusion automatique.

## Preuve calculée localement, artifacts exacts

| Artifact | Run source | Observations | 5 champs isolés |
|---|---:|---:|---:|
| Mubawab 50 catégories | `38014920725` | 1 316 | 1 140 |
| Mubawab Frontier 100 | `38043182237` | 1 321 | 1 134 |
| Mubawab quartiers 120 | `38043539778` | 2 541 | 2 338 |
| Domio pagination 70 | `38043204045` | 1 663 | 745 |
| Domio reprise > page 12 | `38043986522` | 927 | 489 |

Total **7 768 observations** ; **6 107 identifiants uniques par source** : Mubawab **3 517**, Domio **2 590**. **4 385 IDs** disposent de 5 champs réellement présents ensemble dans une carte, sans contradiction entre runs. Quatre contradictions multi-runs (3 prix, 1 superficie) sont rétrogradées en `review_conflicting_card_evidence`. **165 groupes de signatures identiques** ville/quartier/prix/surface parmi **361 IDs** candidats doublons ; **19 groupes inter-portails**. Ces signatures ne sont **pas** des preuves de mêmes biens, et aucun ID n'est fusionné.

**Ne pas prétendre** que 6 107 = biens physiquement uniques, que 4 385 = annonces fraîches, ou que le goal 200K a progressé de 4 385 annonces publiables. Tous les `freshness_certified`, `active_sale_verified`, `cross_source_deduplicated` restent `false`. Dates publiées par portail et HTTP200 ne prouvent pas une offre commerciale toujours active.

## Contrats

- Entrées immuables téléchargées par `actions/download-artifact@v4`, avec SHA256 JSONL épinglés, pour exclure substitution involontaire de benchmark.
- Garde-fous : hôte HTTPS attendu, IDs source stricts, pas de mélange des champs d'observations distinctes, pas de récupération d'informations privées, pas d'endpoint non public, rejet des valeurs absurdes, non-promotion de toute valeur contradictoire, répétitions de signatures = **suspects**, pas fusion.
- Sorties : `acquisition-ledger-v1.json` métriques ; `acquisition-ledger-v1.jsonl` lignes normalisées, provenance, contradictions, marqueurs de suspects, statut `review` et 0 écriture DB.
- Validations offline : `node --test scripts/data/__tests__/card-acquisition-ledger-v1.test.mjs`. Workflow `.github/workflows/card-acquisition-ledger-v1.yml` read-only et assertions de totaux exacts.

## Prochaine action (chemin critique)

1. Certifier le workflow ledger exact HEAD et son artifact, puis recalculer suite aux nouveaux lots **sans compter deux fois le même ID**.
2. Réparer la pagination Domio `after page12` et classifier son rendement marginal net-new ; abandonner immédiatement si nouveau lot ne produit que des IDs déjà connus.
3. Étendre les catégories Mubawab à la demande à partir de **liens et titres réellement observés** (pas URL inventée ni pagination disallow), en mesurant `net-new IDs / requête` et 5/5.
4. Échantillonner régulièrement les pages de détail pour évaluer la conservation de l'identité, date publiée, statut de l'offre et cohérence des champs. Ajouter dédup physique inter-sites par preuves fortes (images autorisées, contact agence et références seulement si traitement conforme), jamais par quatre champs simples.
5. **No-go production** : aucune mise en DB, fusion, déploiement Vercel ou affirmation 200K sans vraie certification de fraîcheur / disponibilité / droit de réutilisation / unicité.

Fichier canonique : `docs/handovers/2026-10-05-200k-fresh-listings-parser-v2-handover.md`.


## Actualisation 6 artifacts — 10 octobre 2026

Le run GitHub cinq artifacts `38044450856` est **vert** ; son artifact `11666931539` confirme 6 107 IDs par source, 4 385 cinq champs cohérents et 4 conflits. L'ajout du **sixième artifact** `11667246884` (run `38044090021`, **217 catégories Mubawab**, 189 pages valides, 3 082 annonces, 2 790 cartes 5 champs) porte la réconciliation **validée offline** à :

- **10 850 observations**, **8 993 IDs source distincts** (Mubawab 6 403, Domio 2 590).
- **6 995 cartes 5 champs présentes dans un même bloc et sans contradiction inter-lots** : Mubawab 5 761, Domio 1 234.
- **5 contradictions** entre observations (4 prix, 1 superficie) rétrogradées en `review`.
- **249 groupes de signatures** ville/quartier/prix/surface identiques, **543 IDs candidats doublons**, dont **21 groupes inter-portails**. Aucun doublon physique fusionné ni certifié.

Workflow Ledger élargi aux **six artifacts et SHA256 JSONL épinglés**. **Gate : attendre sa CI exact-HEAD** avant de déclarer cette version certifiée GitHub. **0 annonce certifiée fraîche/active/publiable, 0 écriture DB**, aucun merge ni déploiement Vercel. Next exact : lire la CI Ledger six lots et l'artifact ; comparer nouveau stock au goal 200K, prioriser extension source vérifiable et vraie fraîcheur.


## CI exacte six artifacts validée — 2026-10-10

Run `38044964671` ✅ sur HEAD `bf4804ab9e4e87f0345e843fac06feb86eb120d7`, artifact `11667367558` vérifié par lecture du JSON et vérification des SHA d'entrées : 10 850 observations, 8 993 IDs source uniques, 6 995 champs complets et cohérents, 5 contradictions, 249 groupes de signatures potentiellement liés dont 21 groupes inter-portails. **0 annonce fraîche/active/physiquement dédupliquée/publiée certifiée.** Le gate CI est clos pour le ledger six inputs. Le prochain lot introduit Sarouty sans l'ajouter au registre avant un vrai artifact cinq champs fiable.


## Certification ledger sept artifacts — 2026-10-10

- **Run 38046725132 ✅ / artifact 11668090501** : 10 913 observations, 9 056 IDs source distincts (Mubawab 6 466, Domio 2 590), **7 042 cartes 5 champs cohérentes**, 5 conflits bloqués, 249 groupes de signatures identiques dont 21 groupes inter-portails suspects ; 0 certifié fraîcheur/activité/disponibilité/physiquement unique/publié.
- Septième source artifact ajouté sans contradiction : Mubawab deux nouvelles villes Meknès/Oujda, run `38046549259`, artifact `11666594461`, SHA256 JSONL `475deddb0c54c3c26441c709b34d558e78bf1d42c1c4d05e6260951f966b6d4f`, **63 IDs nouveaux** et **47 avec 5 champs** face au registre six-inputs.
- Le ledger de sept inputs est testé et épinglé ; ses nouveaux chiffres remplacent ceux de six inputs pour ce chantier.
- Next : petit lot de huit pages régionales publiques (Fès/Kénitra/Tétouan/Nador × vente/location), n'ajouter ses résultats qu'après rapport exact source. Ne pas appeler les URLs « annonces fraîches » sans contrôle vendeur/date/doublons/droits.


## Huitième artifact — expansion Fès / Kénitra / Tétouan / Nador (2026-10-10)

**Source indépendante vérifiée** : workflow Mubawab régions [38046976281](https://github.com/hraaaaf/Akarfinder/actions/runs/38046976281) ✅, artifact `11666629941`, SHA256 du JSONL `87f527e036bb2428b70e7092582e083b461c639f2c7af6dede50aaf22bb27742`.
- **8/8 pages catégorie HTTP200**, vente/location pour les quatre villes ; **226 IDs nouveaux relativement au registre sept-inputs**, **196 cinq champs présents**, aucun fetch détail, robots vérifié et respecté.
- Les huit pages affichaient correctement les villes accentuées Fès/Kénitra/Tétouan grâce aux routes officielles encodées ; zéro conflit inter-catégories observé dans ce lot.
- Réconciliation **huit inputs calculée offline** sur les fichiers immuables : **11 139 cartes source**, **9 282 IDs propres aux sources** (Mubawab 6 692, Domio 2 590), **7 238 cinq champs cohérents sans contradictions**, **5 conflits multi-lots**, 254 groupes de signatures possibles et 21 groupes inter-portails ; 0 doublon physique fusionné, 0 disponibilité/fraîcheur certifiée.
- Workflow du ledger mis à jour pour télécharger le huitième artifact avec SHA256 épinglé et **assertions exactes 11 139 / 9 282 / 7 238 / 5 conflits**. **La valeur est recalculée offline ; attendre le run CI GitHub exact avant déclaration de certification GitHub huit lots**.
- Sarouty : le canari six villes `38046267620` a vu six pages mais uniquement **1 carte correctement isolée, 0 cinq champs** ; le diagnostic DOM `38047091171` s'est arrêté **sans accès catégories** parce que robots.txt n'était pas disponible. Pas de bypass ni nouvelle tentative identique.

**Next exact** : lire CI huit artifacts, puis prioriser la découverte de nouveaux types de biens et villes via les liens publics existants. En parallèle, définir la preuve de disponibilité commerciale, fraîcheur et dédup physique avant publication. **Les 200K actifs et uniques ne sont pas atteints.**
