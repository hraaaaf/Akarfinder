# HANDOVER — AkarFinder Data Ingestion

Date: 2026-09-04

## Boussole canonique

Lire dans cet ordre :

1. `data-ingestion/canonical.md` — architecture + roadmap canonique actuelle ;
2. `data-ingestion/HANDOVER.md` — état opérationnel courant ;
3. `data-ingestion/LOT9_STATUS.md` — chantier courant ;
4. `data-ingestion/LOT8_STATUS.md` — closeout Lot 8 ;
5. `data-ingestion/LOT7_STATUS.md` — closeout Lot 7.

## Goal produit actuel

Atteindre puis maintenir **≥ 100 000 annonces canoniques exploitables** dans AkarFinder.

Séquence verrouillée :

```text
Lots 1–8 CLOSED
      ↓
Lot 9  — Mubawab Full Coverage
      ↓
Lot 10 — Massive Dataset Certification
      ↓
Lot 11 — Massive AkarFinder Ingestion
      ↓
Lot 12 — Multi-source jusqu’à ≥100K
```

Le seuil 100K se mesure après normalisation / déduplication. On mesure d'abord le maximum réel de Mubawab avant d'ouvrir un deuxième portail.

## Repo / branche / PR

- Repo : `hraaaaf/Akarfinder`
- Branche : `feat/data-ingestion-canonical`
- PR : `#996`
- état attendu : OPEN / DRAFT / non mergée ;
- aucun merge sans autorisation explicite ;
- aucun déploiement Vercel ;
- aucun write production ;
- ne jamais toucher à `scripts/scrapers/output/akarfinder.db` pendant les preuves.

## Lots

- Lots 1–8 : ✅ CLOSED
- Lot 9 : 🟡 OPEN — Mubawab Full Coverage
- Lot 10 : ⚪ À FAIRE
- Lot 11 : ⚪ À FAIRE
- Lot 12 : ⚪ À FAIRE

## Lot 9 — architecture certifiée

Briques :

- `full-coverage.ts` — planner 132 scopes ;
- `full-coverage-runner.ts` — vague bornée + dedup + checkpoint ;
- `full-coverage-state.ts` — état persistant inter-run ;
- `full-coverage-campaign.ts` — orchestration multi-vagues ;
- `live-campaign-policy.ts` — montée en charge bornée ;
- `scripts/mubawab-full-coverage-live-campaign.ts` — exécution live discovery-only.

Preuves structurantes :

- planner : run `33881976620` ✅ ;
- runner : run `33882260391` ✅ ;
- micro-vague live : run `33882641901` ✅ ;
- orchestration state/campaign : run macOS `33887383769` ✅ ;
- policy de scale : run `33890791066` ✅.

## Lot 9 — progression live canonique

### Campagne persistante initiale

Run `33889776735` ✅ SUCCESS.

- 18 / 18 pages ;
- 573 IDs uniques ;
- 0 blocage ;
- artifact `9943410758` ;
- digest `sha256:50f5bcbf82543f5a6743cdd3b287e137a236773ea1de4ebf131590fe5ddc75d1`.

### Reprise inter-run

Run `33890195931` ✅ SUCCESS.

- artifact précédent restauré ;
- même `run_id` ;
- cumul 32 / 32 pages ;
- 889 IDs uniques ;
- 28 doublons ;
- 3 scopes terminaux ;
- artifact `9943531219` ;
- digest `sha256:911ca23cc63c5b576f2bf3f2aaed791df2fe1a99a183a76820edfb1e423b5d43`.

Un replay concurrent a reproduit le même état 889 depuis l'ancien artifact. Il n'a fait aucun write DB/prod et n'est pas utilisé comme progression canonique.

### Scale-120

Run `33891104950` ✅ SUCCESS, job `101082690570`, HEAD `2709ce27725b2455741550d7ddbc858373d7178e`.

Configuration : 8 vagues × 5 partitions × 3 pages, 120 pages théoriques max, délai 1 750 ms.

Résultat :

- 110 pages réelles réussies ;
- 0 403/429 ;
- 0 kill-switch ;
- +2 964 IDs uniques ;
- **cumul 3 853 IDs uniques** ;
- cumul 4 110 refs découvertes ;
- 257 doublons ;
- 142 / 142 pages réussies ;
- 52 partitions complétées ;
- 14 scopes terminaux ;
- 118 scopes actifs ;
- 80 scopes initiaux encore jamais ouverts ;
- 38 fenêtres profondes déjà préparées.

Artifact :

- id `9943999589` ;
- name `lot9-live-campaign-scale-120-proof` ;
- digest `sha256:dda924a70d25bf29a8c2444719aced51111e0877bed1248ef76500a51bb1b7ba`.

Rendement unique cumulé des villes déjà touchées : Casablanca 793, Rabat 704, Marrakech 923, Tanger 830, Agadir 603.

## Safety live verrouillée

- robots avant requête ;
- User-Agent identifiable ;
- aucun cookie / login / CAPTCHA / contournement d'accès ;
- stop global sur 403 / 429 ;
- détail = 0 ;
- images = 0 ;
- DB = 0 ;
- prod = 0 ;
- délai minimum policy = 1 500 ms ;
- plafond policy = 300 pages théoriques par exécution.

## NEXT EXACT

1. repartir exclusivement de l'artifact `9943999589` / état 3 853 uniques ;
2. poursuivre la matrice initiale des 80 scopes encore jamais ouverts ;
3. conserver une montée progressive et bornée ;
4. une fois les 132 scopes initiaux touchés, parcourir les fenêtres profondes `p4+` jusqu'à `zero_new_unique_ids` ;
5. maintenir dedup + checkpoint + stops sécurité ;
6. fermer Lot 9 uniquement avec manifest Full Coverage final et stock unique réel ;
7. ouvrir Lot 10 seulement après cette mesure ;
8. garder PR #996 OPEN / DRAFT / non mergée, zéro Vercel / zéro prod.

**Lot 9 : OPEN — 3 853 IDs uniques découverts, surface initiale encore incomplète 🟡**
