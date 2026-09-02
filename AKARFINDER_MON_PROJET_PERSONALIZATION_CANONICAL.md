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

### Modèle V2 déjà disponible

`DynamicSearchProfileV2` version `2.0` couvre déjà : objectif/usages, localisation, anchors + temps maximum, budget, contraintes du bien, préférences quartier, priorités, tolérances et contexte utile (`children_count`, accessibilité, MRE, étudiant, corporate, `remote_work`, faits libres), avec provenance/confiance du signal.

### Écarts réels trouvés au P0

- `profile-engine.ts` sait déjà écrire et valider `anchors`, mais le Companion n’expose aucun événement `answer_anchors`.
- `DynamicSearchProfileV2.personal_context` existe, mais `profile-engine.ts` ne fournit aucun événement permettant d’écrire `children_count`, `remote_work`, etc.
- `companion-v1/state-machine.ts` ne sait donc pas recevoir/persister le contexte quotidien ni les anchors pendant l’onboarding.
- `companionProfileToSearchParams()` transmet le socle canonique, intended uses, préférences et priorités, mais Search ne consomme actuellement que les paramètres de recherche canoniques et `project_id`.
- `LightZillowSearchShell` reconstruit ensuite l’URL à partir des filtres canoniques + `project_id`, donc les paramètres riches non consommés seraient éphémères.
- Dans l’UI actuelle, `surfaceLocation` est collecté mais n’est jamais écrit dans le profil.
- Dans l’UI actuelle, `centralityCalm` est converti en `tourism_intensity_max`, ce qui est une erreur sémantique : centralité/calme et intensité touristique ne sont pas équivalents.
- La continuity authentifiée écrit le profil V2 complet.
- `launchSearch()` stocke déjà le profil et la session Companion complets dans `sessionStorage` sous `akarfinder-pending-project-v2` avant navigation.

## Décision produit verrouillée

**Ne pas créer une nouvelle surface “Profil”.**

`Mon Projet` reste le nom, le point d’entrée et la destination canonique. Le chantier consiste à faire évoluer le wizard actuel d’un formulaire de critères vers un moteur de compréhension du besoin.

## Décision confidentialité P1

Ne jamais sérialiser dans l’URL :

- `personal_context` ;
- anchors / lieux importants ;
- tolérances riches pouvant révéler le contexte du projet.

Raison : ces valeurs peuvent contenir enfants, accessibilité, lieux de travail/école et autres éléments qui n’ont aucune raison d’apparaître dans l’historique navigateur, les referrers ou les logs d’URL.

Transport retenu :

- anonyme : `sessionStorage` déjà écrit par `launchSearch()` ;
- authentifié : profil V2 complet persisté via `/api/me/continuity`, avec `project_id` dans l’URL ;
- consommation active du profil complet par Search : **P3**, pas P1.

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

## Mapping P0 — existant → cible

| Existant | Cible | Décision P0 |
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
| anchors / temps max | non | oui | **P1 : oui** | **sessionStorage / continuity, jamais URL** | profil complet | P1 plomberie |
| enfants | non explicite | **P1 : oui** | **P1 : oui** | **sessionStorage / continuity, jamais URL** | profil complet | P1 plomberie |
| télétravail | non | **P1 : oui** | **P1 : oui** | **sessionStorage / continuity, jamais URL** | profil complet | P1 plomberie |
| accessibilité | non | **P1 : oui** | **P1 : oui** | **sessionStorage / continuity, jamais URL** | profil complet | P1 plomberie, UI conditionnelle P2 |
| voiture / mobilité | partiel via préférences | `car_accessibility` + anchors | préférences + anchors | privé si anchor | profil complet | exploiter existant |
| surface vs localisation | oui | aucun signal dédié | perdu | non | non | supprimer/repenser P2 |
| centralité vs calme | oui | préférences `centrality` / `calmness` existent | mal mappé vers tourisme | indirect | profil complet | corriger P2 |
| tolérance tourisme | indirecte/mal utilisée | oui | oui | **privé hors URL** | profil complet | ne plus détourner P2 |

## Roadmap

### P0 — Contract + funnel architecture — CLOSED

**Goal**  
Verrouiller le contrat produit/data du nouveau Mon Projet sans modifier le comportement production.

**Succès atteint**
- architecture 3 étapes documentée ;
- mapping ancien → nouveau documenté ;
- matrice champ-par-champ documentée ;
- écarts de données identifiés ;
- changements P1 et tests P1/P2 verrouillés.

**Preuve**
- revue source de `MonProjetWizardP1A`, `DynamicSearchProfileV2`, `profile-engine.ts`, `state-machine.ts`, `search-entry.ts`, Search et `/api/me/continuity` ;
- matrice ci-dessus ;
- aucun changement production ni déploiement.

### P1 — Profile core enrichment — ACTIVE

**Goal**  
Rendre le contexte quotidien et les anchors réellement écrivables, transportables de façon sûre et testés, sans casser les profils V2 existants ni modifier encore le funnel visuel.

**Implémenté**
1. événement `personal_context` dans le profile engine avec validation des valeurs supportées ;
2. `answer_context` et `answer_anchors` dans le Companion, dans l’état interne `PREFERENCES` sans nouvelle étape visible ;
3. compatibilité du chemin historique `answer_preferences` conservée ;
4. anchors continuent d’utiliser la validation/déduplication ANN-L12 existante ;
5. données contextuelles riches explicitement exclues des URLs Search ;
6. transport complet existant conservé via `sessionStorage` et continuity authentifiée ;
7. tests ciblés ajoutés dans `search-profile.test.ts`.

**Tests P1 attendus**
- contexte : enfants / télétravail / accessibilité écrits avec signal explicite + timestamp ;
- contexte invalide rejeté ;
- anchors validés/dédoublonnés ;
- `answer_context` / `answer_anchors` ne cassent pas la séquence historique du Companion ;
- `answer_preferences` continue à faire progresser vers `PRIORISATION` ;
- URL Search conserve les contraintes canoniques mais exclut anchors / contexte personnel / tolérances riches ;
- suite ANN-L12 anchors reste compatible ;
- typecheck + build verts.

**Non inclus volontairement dans P1**
- consommation du profil complet par Search : P3 ;
- correction visuelle `centralityCalm` / `surfaceLocation` : P2 avec protocole UI complet.

**État** : ACTIVE — en attente de preuve CI.

### P2 — 3-step UX refactor — NOT STARTED

**Goal**  
Remplacer les 8 étapes visibles par 3 étapes visibles maximum.

**Cible**
- Step 1 Mon besoin ;
- Step 2 Mon quotidien ;
- Step 3 Mes priorités ;
- résumé compact ;
- compromis dynamiques ;
- CTA final direct Search.

**Validation UI obligatoire**
- BEFORE mêmes viewports ;
- Goal visuel écrit ;
- mockup/référence ;
- implémentation ;
- AFTER mêmes viewports ;
- comparaison + tests + score visuel.

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

- Lots CLOSED : `1 / 5`
- Lot actif : `P1`
- Avancement global par lots CLOSED : `20%`

## Next exact

Obtenir la preuve CI du HEAD P1 corrigé ; si vert, fermer P1 dans ce canonique puis démarrer P2 par les captures BEFORE et le Goal visuel.
