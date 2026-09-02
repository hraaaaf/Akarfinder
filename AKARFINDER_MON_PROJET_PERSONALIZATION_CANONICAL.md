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

### Données déjà supportées

`DynamicSearchProfileV2` couvre déjà notamment :

- objectif et usages ;
- villes / quartiers préférés et exclus ;
- anchors + temps maximum ;
- budget achat / loyer / apport / flexibilité ;
- type de bien, surfaces, chambres, features, travaux ;
- préférences quartier ;
- priorités ;
- tolérances ;
- contexte utile : enfants, accessibilité, MRE, étudiant, corporate, télétravail, faits libres ;
- provenance / confiance du signal (`explicit`, `behavioral_inference`, `companion_derived`).

### Hand-off search actuel

`companionProfileToSearchParams()` transmet déjà les contraintes supportées par Search via paramètres canoniques et conserve les données plus riches dans des paramètres `profile_*`.

## Décision produit verrouillée

**Ne pas créer une nouvelle surface “Profil”.**

`Mon Projet` reste le nom, le point d’entrée et la destination canonique. Le chantier consiste à faire évoluer le wizard actuel d’un formulaire de critères vers un moteur de compréhension du besoin.

## Architecture cible du funnel

### Étape 1 — Mon besoin

But : définir ce que l’utilisateur cherche.

Inclut :
- objectif : acheter / louer / investir / neuf / explorer ;
- usage ;
- ville / zone ;
- budget ;
- type de bien ;
- contraintes absolues essentielles.

### Étape 2 — Mon quotidien

But : comprendre les contraintes de vie qui doivent influencer la recherche.

Inclut selon pertinence :
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

But : forcer un ordre de préférence exploitable par le ranking.

Inclut :
- 3 à 5 priorités principales ;
- éventuels compromis uniquement lorsque nécessaires ;
- résumé compact modifiable ;
- CTA principal : **Voir les biens faits pour mon projet**.

### Après onboarding

- Récapitulatif = état de projet, pas étape obligatoire.
- Recherche = action/résultat, pas étape d’onboarding.
- Compromis = interaction contextuelle déclenchée uniquement lorsqu’une décision est utile.

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

## Roadmap

### P0 — Contract + funnel architecture — ACTIVE

**Goal**  
Verrouiller le contrat produit/data du nouveau Mon Projet sans modifier encore le comportement production.

**Succès**
- architecture 3 étapes documentée ;
- mapping ancien → nouveau documenté ;
- champs existants classés : conserver / déplacer / enrichir / différer ;
- invariants de compatibilité définis ;
- tests P1/P2 ciblés identifiés.

**Preuve attendue**
- ce canonique à jour ;
- revue du wizard, `DynamicSearchProfileV2`, state machine, hand-off Search et continuity ;
- matrice de couverture finale sans champ critique orphelin.

**État** : ACTIVE.

### P1 — Profile core enrichment

**Goal**  
Rendre les données utiles au quotidien réellement éditables/persistables par Mon Projet, sans casser les profils V2 existants.

**Cible**
- événements explicites pour contexte quotidien utile ;
- anchors / mobilité si données disponibles ;
- conservation de la provenance et de la confiance ;
- compatibilité transition/state machine ;
- tests unitaires du profile engine et de la state machine.

**État** : NOT STARTED.

### P2 — 3-step UX refactor

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
- mockup/référence ;
- implémentation ;
- AFTER mêmes viewports ;
- comparaison + tests + score visuel.

**État** : NOT STARTED.

### P3 — Search + continuity activation

**Goal**  
Faire consommer davantage du profil par Search/ranking et garantir la reprise du projet.

**Cible**
- hand-off sans perte ;
- persistance projet authentifié ;
- reprise dans `/mon-projet/espace` ;
- raffinage sans repartir de zéro ;
- comportement dégradé sûr pour utilisateur non authentifié.

**État** : NOT STARTED.

### P4 — Certification + closeout

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

**État** : NOT STARTED.

## Invariants

1. `/mon-projet` reste canonique.
2. Aucune nouvelle page “profil” concurrente.
3. Les profils V2 existants restent lisibles.
4. Search doit rester disponible même si la persistence échoue.
5. Une préférence souple ne doit pas masquer automatiquement tous les résultats.
6. Les données non supportées directement par Search ne doivent pas être silencieusement perdues.
7. Le nombre d’étapes visibles concerne l’expérience utilisateur, pas nécessairement le nombre d’états internes de la machine.
8. Pas de promesse de rendement ou d’inférence personnelle non justifiée.
9. Aucun déploiement Vercel sans autorisation explicite.

## P0 — points encore à fermer

- [x] destination canonique confirmée
- [x] funnel 8 étapes identifié
- [x] architecture cible 3 étapes définie
- [x] mapping macro ancien → nouveau défini
- [x] surface data V2 inventoriée
- [x] hand-off Search vérifié
- [x] espace de continuité confirmé
- [ ] matrice champ-par-champ wizard/state-machine/profile/search/continuity
- [ ] liste exacte des changements P1
- [ ] liste exacte des tests P1/P2
- [ ] P0 closeout

## Progression vérifiée

- Lots CLOSED : `0 / 5`
- Lot actif : `P0`
- Avancement global par lots CLOSED : `0%`

## Next exact

Compléter la matrice champ-par-champ du P0, puis verrouiller les changements P1 et les tests avant toute refonte UI.
