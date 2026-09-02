# AkarFinder — Mon Projet Personalization Canonical

Status: ACTIVE  
Canonical branch: `feat/mon-projet-personalization`  
Base: `main` @ `31174a4527c6034a08943d25a9de9811a90480c1`  
Deployment: none — production deployment requires explicit authorization.

## Goal final

Faire de **Mon Projet** le moteur canonique de personnalisation AkarFinder : comprendre le besoin immobilier et le quotidien de l’utilisateur en **3 étapes visibles maximum**, produire un profil structuré persistant, puis l’utiliser pour lancer et affiner la recherche sans repartir de zéro.

### Succès observable

- `/mon-projet` reste l’unique destination canonique.
- Onboarding initial : **3 étapes visibles maximum**.
- Le parcours collecte au minimum : objectif, usage, zone, budget, type de bien, contraintes essentielles, contexte quotidien et priorités.
- Les données riches déjà supportées par `DynamicSearchProfileV2` ne sont pas perdues.
- Le hand-off vers `/search` reste déterministe et rétrocompatible.
- Les données personnelles/contextuelles riches ne transitent pas dans l’URL.
- Un projet authentifié peut être persisté et repris dans `/mon-projet/espace`.
- Les compromis deviennent contextuels/dynamiques au lieu d’être une étape fixe obligatoire.
- Aucun déploiement Vercel sans autorisation explicite.

## Baseline vérifiée — 2026-09-02

### Produit / routes

- `/mon-projet` rend `MonProjetWizardP1A`.
- `/compagnon` effectue un `permanentRedirect("/mon-projet")`.
- `/profil-recherche` redirige vers `/mon-projet` et déclare explicitement Mon Projet comme destination canonique unique.
- `/mon-projet/espace` existe et expose la continuité des projets enregistrés.

### Funnel actuel

`MonProjetWizardP1A` expose 8 étapes visibles :

1. Votre projet
2. Zone et budget
3. Le bien
4. Votre quotidien
5. Priorités
6. Compromis
7. Récapitulatif
8. Recherche

### Modèle V2 disponible

`DynamicSearchProfileV2` version `2.0` couvre : objectif/usages, localisation, anchors + temps maximum, budget, contraintes du bien, préférences quartier, priorités, tolérances et contexte utile (`children_count`, accessibilité, MRE, étudiant, corporate, `remote_work`, faits libres), avec provenance/confiance du signal.

### Écarts UI encore ouverts après P1

- `surfaceLocation` est collecté par le wizard mais n’est jamais écrit dans le profil.
- `centralityCalm` est converti en `tourism_intensity_max`, ce qui est une erreur sémantique : centralité/calme et intensité touristique ne sont pas équivalents.
- le wizard expose toujours 8 étapes visibles alors que le contrat cible en exige 3 maximum.

## Décision produit verrouillée

**Ne pas créer une nouvelle surface “Profil”.**

`Mon Projet` reste le nom, le point d’entrée et la destination canonique. Le chantier consiste à faire évoluer le wizard actuel d’un formulaire de critères vers un moteur de compréhension du besoin.

## Décision confidentialité P1

Ne jamais sérialiser dans l’URL :

- `personal_context` ;
- anchors / lieux importants ;
- tolérances riches pouvant révéler le contexte du projet.

Transport retenu :

- anonyme : `sessionStorage` sous `akarfinder-pending-project-v2` ;
- authentifié : profil V2 complet persisté via `/api/me/continuity`, avec `project_id` dans l’URL ;
- consommation active du profil complet par Search : **P3**.

## Architecture cible du funnel

### Étape 1 — Mon besoin

- objectif : acheter / louer / investir / neuf / explorer ;
- usage ;
- ville / zone ;
- budget ;
- type de bien ;
- contraintes absolues essentielles.

### Étape 2 — Mon quotidien

Selon pertinence :
- enfants / vie familiale ;
- télétravail ;
- voiture / mobilité ;
- écoles ;
- transports ;
- commerces ;
- marche ;
- calme / animation ;
- mer / espaces verts ;
- anchors importants + temps maximum.

### Étape 3 — Mes priorités

- 3 à 5 priorités principales ;
- compromis uniquement lorsqu’ils sont nécessaires ;
- résumé compact modifiable ;
- CTA principal : **Voir les biens faits pour mon projet**.

### Après onboarding

- Récapitulatif = état de projet, pas étape obligatoire.
- Recherche = action/résultat, pas étape d’onboarding.
- Compromis = interaction contextuelle, jamais un faux mapping vers une donnée différente.

## Mapping existant → cible

| Existant | Cible | Décision |
|---|---|---|
| Votre projet | Étape 1 — Mon besoin | CONSERVER / regrouper |
| Zone et budget | Étape 1 — Mon besoin | FUSIONNER |
| Le bien | Étape 1 — Mon besoin | FUSIONNER |
| Votre quotidien | Étape 2 — Mon quotidien | CONSERVER / enrichir |
| Priorités | Étape 3 — Mes priorités | CONSERVER / simplifier |
| Compromis | Contextuel | SORTIR du funnel fixe |
| Récapitulatif | État final modifiable | SORTIR du compteur |
| Recherche | CTA / résultat | SORTIR du compteur |

## Matrice champ-par-champ P0/P1

| Signal | Wizard actuel | Profile V2 / engine | Companion | Transport | Continuity | Décision |
|---|---|---|---|---|---|---|
| objectif | oui | oui | oui | URL canonique | profil complet | KEEP |
| usage | oui | oui | oui | `profile_intended_uses` | profil complet | KEEP |
| ville | oui | oui | oui | URL canonique | profil complet | KEEP |
| budget | oui | oui | oui | URL canonique | profil complet | KEEP |
| type de bien | oui | oui | oui | URL canonique | profil complet | KEEP |
| surface min | oui | oui | oui | URL canonique | profil complet | KEEP |
| chambres min | oui | oui | oui | URL canonique | profil complet | KEEP |
| parking / ascenseur | oui | `required_features` | oui | paramètres riches existants | profil complet | KEEP |
| préférences quartier | oui | oui | oui | paramètres riches existants | profil complet | KEEP |
| priorités | oui | oui | oui | paramètres riches existants | profil complet | KEEP |
| anchors / temps max | non | oui | **P1 : oui** | **sessionStorage / continuity, jamais URL** | profil complet | P2 UI |
| enfants | non explicite | **P1 : oui** | **P1 : oui** | **sessionStorage / continuity, jamais URL** | profil complet | P2 UI |
| télétravail | non | **P1 : oui** | **P1 : oui** | **sessionStorage / continuity, jamais URL** | profil complet | P2 UI |
| accessibilité | non | **P1 : oui** | **P1 : oui** | **sessionStorage / continuity, jamais URL** | profil complet | P2 UI conditionnelle |
| voiture / mobilité | partiel | `car_accessibility` + anchors | préférences + anchors | privé si anchor | profil complet | P2 UI |
| surface vs localisation | oui | aucun signal dédié | perdu | non | non | supprimer/repenser P2 |
| centralité vs calme | oui | `centrality` / `calmness` | mal mappé vers tourisme | indirect | profil complet | corriger P2 |
| tolérance tourisme | indirecte/mal utilisée | oui | oui | privé hors URL | profil complet | ne plus détourner P2 |

## Roadmap

### P0 — Contract + funnel architecture — CLOSED

**Goal**  
Verrouiller le contrat produit/data du nouveau Mon Projet sans modifier le comportement production.

**Preuve**
- architecture 3 étapes documentée ;
- mapping ancien → nouveau documenté ;
- matrice champ-par-champ documentée ;
- revue du wizard, profile V2, profile engine, Companion, Search et continuity.

### P1 — Profile core enrichment — CLOSED

**Goal**  
Rendre le contexte quotidien et les anchors réellement écrivables, transportables de façon sûre et testés, sans casser les profils V2 existants ni modifier encore le funnel visuel.

**Réalisé**
1. `personal_context` écrit via le profile engine avec validation runtime ;
2. `answer_context` et `answer_anchors` ajoutés au Companion sans nouvelle étape visible ;
3. mises à jour partielles du contexte sans effacer les signaux absents ;
4. validation runtime des payloads API malformés ;
5. anchors validés/dédoublonnés ; même label dans deux villes reste distinct ;
6. données contextuelles riches exclues des URLs Search ;
7. continuité complète conservée via `sessionStorage` et persistence authentifiée ;
8. tests ciblés ajoutés aux suites existantes.

**Preuve vérifiée**
- HEAD certifié : `c8f651aae9873a11c58eef49edb19f8762816faf` ;
- workflow dédié : `Announcement Page L12 Mon Projet Personalise` ;
- run : `33623128050` ;
- conclusion : **SUCCESS** ;
- job `contract` : **SUCCESS** ;
- tests ciblés : SUCCESS ;
- TypeScript : SUCCESS ;
- production build : SUCCESS ;
- Chromium install/server : SUCCESS ;
- certification visuelle ANN-L12 : SUCCESS ;
- artifact upload : SUCCESS ;
- gates supplémentaires observés verts sur ce HEAD : Canonical Baseline Compile Validation, Phase 1 P1 User Journey Gate, UX Gate 0 Contracts, Phase 1 P1 Final Sweep Gate.

### P2 — 3-step UX refactor — ACTIVE

**Goal**  
Remplacer les 8 étapes visibles par **3 étapes visibles maximum**, sans perte de données ni faux compromis sémantiques.

**Goal visuel verrouillé**
- lecture immédiate : `Mon besoin → Mon quotidien → Mes priorités` ;
- aucun écran ne doit donner la sensation d’un tunnel de 8 étapes ;
- hiérarchie claire sur mobile 390 px et desktop 1280 px ;
- une action principale évidente par étape ;
- champs secondaires révélés uniquement lorsqu’ils sont utiles ;
- résumé final compact et modifiable ;
- CTA final : **Voir les biens faits pour mon projet** ;
- aucun overflow horizontal, aucune erreur console/HTTP de la page ;
- accessibilité clavier/focus conservée.

**Protocole obligatoire P2**
1. BEFORE `/mon-projet` aux mêmes viewports ;
2. référence/mockup cible ;
3. implémentation ;
4. AFTER aux mêmes viewports ;
5. comparaison + tests + score visuel.

**Infrastructure P2 vérifiée**
- le harness Playwright ANN-L12 existant est réutilisable comme modèle technique ;
- il photographie cependant `/visual-qa/announcement-page-mon-projet`, c.-à-d. la personnalisation d’une annonce, **pas** le wizard `/mon-projet` ;
- aucune route `visual-qa` dédiée au wizard n’a été identifiée ;
- P2 doit donc disposer d’un audit visuel dédié à `/mon-projet`.

**État** : ACTIVE — BEFORE non encore capturé.

### P3 — Search + continuity activation — NOT STARTED

**Goal**  
Faire consommer le profil complet par Search/ranking et garantir la reprise du projet sans exposition dans l’URL.

**Cible**
- consommation de `project_id` authentifié ;
- consommation sûre du pending project anonyme ;
- reprise dans `/mon-projet/espace` ;
- raffinage sans repartir de zéro ;
- comportement dégradé sûr si persistence indisponible.

### P4 — Certification + closeout — NOT STARTED

**Goal**  
Certifier fonctionnalité, UX, compatibilité et documentation.

**Cible**
- tests ciblés verts ;
- parcours desktop/mobile certifié ;
- accessibilité de base ;
- aucune régression Search/continuity ;
- canonique à jour ;
- PR prête à merger ;
- post-merge vérifié.

## Invariants

1. `/mon-projet` reste canonique.
2. Aucune nouvelle page “profil” concurrente.
3. Les profils V2 existants restent lisibles.
4. Search doit rester disponible même si la persistence échoue.
5. Une préférence souple ne doit pas masquer automatiquement tous les résultats.
6. Les données riches doivent être conservées sans les exposer inutilement dans l’URL.
7. Le nombre d’étapes visibles concerne l’expérience utilisateur, pas le nombre d’états internes de la machine.
8. Pas de promesse de rendement ou d’inférence personnelle non justifiée.
9. Aucun déploiement Vercel sans autorisation explicite.

## Progression vérifiée

- Lots CLOSED : `2 / 5`
- Lot actif : `P2`
- Avancement global par lots CLOSED : `40%`

## Next exact

Créer le harness visuel P2 dédié à `/mon-projet`, produire les captures BEFORE aux viewports verrouillés, puis définir le mockup cible avant toute modification du wizard.
