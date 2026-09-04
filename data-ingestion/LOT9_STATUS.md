# Lot 9 Status — Mubawab Full Coverage

**Status: 🟡 OPEN — architecture Full Coverage certifiée ; collecte progressive live à 3 853 IDs uniques**

## Goal

Parcourir exhaustivement le périmètre Mubawab accessible et autorisé afin de mesurer le stock réel d'annonces uniques disponible avant d'ouvrir une deuxième source.

Le Lot 9 mesure des `source_id` uniques de discovery. Le passage complet en objets canoniques et la certification du dataset massif relèvent du Lot 10.

## Safety boundary

- aucun write production ;
- aucun déploiement Vercel ;
- aucun merge automatique ;
- aucun contournement CAPTCHA / authentification / contrôle d'accès ;
- contrôle robots avant toute requête live ;
- arrêt global sur 403 / 429 explicite ;
- aucune page détail dans les campagnes de discovery ;
- aucun téléchargement d'image ;
- ne jamais toucher à `scripts/scrapers/output/akarfinder.db` pendant les preuves.

## Périmètre initial

- 12 villes ;
- 11 catégories activées ;
- 132 scopes initiaux `ville × catégorie` ;
- familles : appartement, terrain, villa, maison, commercial, riad ;
- bureaux désactivés tant que leurs routes distinctes ne sont pas vérifiées.

## Étape 1 — Full Coverage planner ✅ CERTIFIED

Fichier : `data-ingestion/sources/mubawab/full-coverage.ts`.

Preuve : run `33881976620` ✅ SUCCESS, job `101052543906`, HEAD produit `1f9f0ae095fd28b9821008dd33dfb83e120ff5b4`.

## Étape 2 — bounded runner ✅ CERTIFIED

Fichier : `data-ingestion/sources/mubawab/full-coverage-runner.ts`.

Preuve : run `33882260391` ✅ SUCCESS, job `101053487441`.

Garanties : dédup globale, checkpoint page par page, fenêtre suivante uniquement après `window_exhausted`, stop sécurité robots / 403 / 429, kill-switch reprenable, aucun write DB.

## Étape 3 — première micro-vague live ✅ GREEN

Run `33882641901` ✅ SUCCESS.

- 4 / 4 pages ;
- 126 annonces découvertes ;
- 126 uniques ;
- 0 doublon ;
- 0 blocage source.

Artifact `9940542354`, digest `sha256:ca1b1a6b45cf0ff178e818145ef82d4189b96239b1082a65751845816a72ce5e`.

## Étape 4 — état persistant + campaign runner ✅ CERTIFIED

Fichiers :

- `data-ingestion/sources/mubawab/full-coverage-state.ts` ;
- `data-ingestion/sources/mubawab/full-coverage-campaign.ts` ;
- tests associés.

Garanties :

- `state.json` sérialisable entre runs ;
- `seen_source_ids` persistant ;
- métriques cumulées et historique des vagues ;
- checkpoint après chaque vague ;
- détection de vague dupliquée ;
- interdiction de perte d'IDs déjà vus ;
- kill-switch = pause reprenable, jamais faux `completed` ;
- un blocage source stoppe globalement sans consommer le scope suivant.

Preuve GitHub complète : run isolé macOS `33887383769` ✅ SUCCESS.

## Étape 5 — première campagne persistante ✅ GREEN

Run `33889776735` ✅ SUCCESS, job `101078344166`.

Limite : 2 vagues × 3 partitions × 3 pages = 18 pages max, délai 1 500 ms.

Résultat :

- 18 / 18 pages réussies ;
- 573 découvertes ;
- 573 IDs uniques ;
- 0 doublon ;
- 0 blocage source ;
- 6 scopes avancés ;
- 132 scopes encore actifs à ce stade.

Artifact `9943410758`, digest `sha256:50f5bcbf82543f5a6743cdd3b287e137a236773ea1de4ebf131590fe5ddc75d1`.

## Étape 6 — reprise inter-run ✅ GREEN

Run `33890195931` ✅ SUCCESS, job `101079713566`.

Le run restaure l'artifact précédent, vérifie `state.json`, puis reprend le même `run_id` sans reset.

Cumul après reprise :

- 32 / 32 pages réussies ;
- 917 refs découvertes ;
- 889 IDs uniques ;
- 28 doublons ;
- 3 scopes terminaux ;
- 129 scopes encore actifs.

Artifact `9943531219`, digest `sha256:911ca23cc63c5b576f2bf3f2aaed791df2fe1a99a183a76820edfb1e423b5d43`.

Un replay concurrent depuis l'ancien checkpoint a reproduit le même état 889 sans corruption DB ni prod ; il n'est pas utilisé comme progression canonique.

## Étape 7 — policy de montée en charge ✅ CERTIFIED

Fichier : `data-ingestion/sources/mubawab/live-campaign-policy.ts`.

- défaut : 18 pages théoriques max ;
- délai minimum : 1 500 ms ;
- overrides bornés par variables d'environnement ;
- plafond dur : 300 pages théoriques par exécution ;
- configurations invalides rejetées avant réseau.

Preuve : run macOS `33890791066` ✅ SUCCESS, incluant Discovery + planner + runner + state + campaign + policy.

## Étape 8 — scale-120 ✅ GREEN

Run `33891104950` ✅ SUCCESS, job `101082690570`, HEAD `2709ce27725b2455741550d7ddbc858373d7178e`.

Configuration :

- 8 vagues ;
- 5 partitions par vague ;
- 3 pages par partition ;
- plafond théorique 120 pages ;
- délai 1 750 ms ;
- reprise depuis le checkpoint 889 ;
- 0 détail / 0 image / 0 DB / 0 prod.

Résultat de cette campagne :

- 110 pages effectivement demandées ;
- 110 pages réussies ;
- 0 blocage source ;
- 0 kill-switch ;
- 2 964 nouveaux IDs uniques ajoutés.

Cumul Full Coverage :

- **142 pages demandées / 142 réussies** ;
- **4 110 refs découvertes** ;
- **3 853 IDs d'annonces uniques** ;
- **257 doublons** (~6,3 % des refs découvertes) ;
- **52 partitions complétées** ;
- **14 scopes terminaux** ;
- **118 scopes actifs** ;
- **80 scopes initiaux encore jamais ouverts** ;
- **38 fenêtres profondes `p4+` déjà préparées**.

Rendement unique cumulé par ville déjà touchée :

- Casablanca : 793 ;
- Rabat : 704 ;
- Marrakech : 923 ;
- Tanger : 830 ;
- Agadir : 603.

Scopes déjà terminés naturellement (`zero_new_unique_ids`) :

- Casablanca : maison location, riad vente, riad location ;
- Rabat : maison vente, maison location, riad vente, riad location ;
- Marrakech : maison location, riad location ;
- Tanger : maison location, riad vente, riad location ;
- Agadir : villa location, maison location.

Artifact `9943999589`, digest `sha256:dda924a70d25bf29a8c2444719aced51111e0877bed1248ef76500a51bb1b7ba`.

## Lecture opérationnelle

L'architecture de collecte est maintenant prouvée jusqu'à une campagne live de 110 pages et une reprise inter-run réelle. Le scheduler sait continuer les gros scopes et éteindre les petits sans perdre le checkpoint.

Les 3 853 éléments actuels sont des IDs uniques de discovery, pas encore le stock canonique final du Lot 10. Le Lot 9 reste OPEN car 80 scopes initiaux n'ont pas encore été ouverts et les scopes volumineux possèdent déjà des fenêtres profondes à parcourir.

## Closure rule

Lot 9 ne sera CLOSED qu'après extinction ou stop sécurité documenté de tous les scopes autorisés, avec manifest final contenant couverture, erreurs, doublons, checkpoints et nombre unique final.

## Next exact

1. reprendre depuis l'artifact scale-120 `9943999589` ;
2. poursuivre progressivement les 80 scopes initiaux restants avant de privilégier la pagination profonde ;
3. maintenir le plafond dur et le délai poli ;
4. continuer jusqu'à extinction de la matrice initiale puis des fenêtres profondes ;
5. produire le manifest Full Coverage final ;
6. seulement ensuite ouvrir Lot 10.
