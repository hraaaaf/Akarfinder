# AkarFinder — Mon Projet Personalization Canonical

Status: ACTIVE  
Canonical branch: `feat/mon-projet-personalization`  
Base: `main` @ `31174a4527c6034a08943d25a9de9811a90480c1`  
Deployment: none — production deployment requires explicit authorization.

## Goal final

Faire de **Mon Projet** le moteur canonique de personnalisation AkarFinder : comprendre le besoin immobilier et le quotidien de l’utilisateur en **3 étapes visibles maximum**, produire un profil structuré persistant, puis l’utiliser pour lancer et affiner la recherche sans repartir de zéro.

Finder est le point d’entrée contextuel optionnel depuis `/search`. La recherche classique reste immédiatement utilisable et `/mon-projet` reste l’URL canonique de reprise/modification du projet.

### Succès observable

- `/mon-projet` reste la destination canonique du projet.
- Finder est optionnel et n’empêche jamais la recherche classique.
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

Baseline avant P2 :
- `/mon-projet` rendait `MonProjetWizardP1A` ;
- `/compagnon` effectue un `permanentRedirect("/mon-projet")` ;
- `/profil-recherche` redirige vers `/mon-projet` ;
- `/mon-projet/espace` existe et expose la continuité des projets enregistrés.

### Funnel avant P2

`MonProjetWizardP1A` exposait 8 étapes visibles :

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

## Décisions produit verrouillées

1. **Ne pas créer une nouvelle surface “Profil”.**
2. `Mon Projet` reste le nom et l’URL canonique.
3. Finder devient une couche optionnelle au-dessus de `/search`, jamais un passage obligatoire.
4. Desktop : panneau latéral Finder.
5. Mobile : Finder plein écran `100dvh`.
6. Même moteur `MonProjetWizardP2` dans `/mon-projet` et Finder, pour éviter deux funnels divergents.

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

| Signal | Wizard avant P2 | Profile V2 / engine | Companion | Transport | Continuity | Décision |
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
| anchors / temps max | non | oui | oui | sessionStorage / continuity, jamais URL | profil complet | P2 UI |
| enfants | non explicite | oui | oui | sessionStorage / continuity, jamais URL | profil complet | P2 UI |
| télétravail | non | oui | oui | sessionStorage / continuity, jamais URL | profil complet | P2 UI |
| accessibilité | non | oui | oui | sessionStorage / continuity, jamais URL | profil complet | UI conditionnelle future |
| voiture / mobilité | partiel | `car_accessibility` + anchors | préférences + anchors | privé si anchor | profil complet | P2 UI |
| surface vs localisation | oui | aucun signal dédié | perdu | non | non | supprimé/repenser |
| centralité vs calme | oui | `centrality` / `calmness` | ancien mapping incorrect | indirect | profil complet | corrigé P2 |
| tolérance tourisme | ancien détournement | oui | oui | privé hors URL | profil complet | ne plus détourner |

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
- tests ciblés : SUCCESS ;
- TypeScript : SUCCESS ;
- production build : SUCCESS.

### P2 — 3-step UX + Finder shell — CLOSED

**Goal**  
Remplacer les 8 étapes visibles par **3 étapes visibles maximum**, sans perte de données ni faux compromis sémantiques, et exposer ce même moteur via Finder optionnel dans `/search`.

**BEFORE vérifié**
- workflow : `Mon Projet P2 Visual Proof` ;
- run : `33649422239` ;
- artifact : `9854176771` ;
- viewports : 390 / 768 / 1280 ;
- baseline : wizard 8 étapes visible.

**Mockup/référence P2 verrouillé avant implémentation**
- desktop : panneau Finder latéral ~460–520 px sur `/search` ;
- mobile : plein écran `100dvh` ;
- `/mon-projet` utilise le même contenu en mode page ;
- 3 étapes visibles seulement.

**Implémentation P2**
- `MonProjetWizardP2` : funnel 3 étapes ;
- `/mon-projet` basculé sur `MonProjetWizardP2` ;
- `FinderLauncher` ajouté à `/search` ;
- body scroll verrouillé lorsque Finder est ouvert ;
- fermeture par bouton et `Escape` ;
- aucune modification de production/Vercel.

**AFTER `/mon-projet` vérifié**
- run : `33660556543` ;
- conclusion : **SUCCESS** ;
- artifact : `9858651735` ;
- SHA256 artifact : `e7908fa68299584a9dc256a9faa319f8072b08f43a8874b9faf1ee6c8911de07` ;
- 3/3 captures ;
- `findingCount=0` ;
- 390 : `scrollWidth=390`, `clientWidth=390` ;
- 768 : `scrollWidth=768`, `clientWidth=768` ;
- 1280 : `scrollWidth=1280`, `clientWidth=1280` ;
- aucune erreur HTTP/console relevée ;
- score visuel : **9/10**.

**Finder `/search` vérifié**
- run : `33665341707` ;
- conclusion : **SUCCESS** ;
- artifact : `9860482949` ;
- SHA256 artifact : `59f19d11a41c82f9791c859371a5ab52d6b9cd6904917f741880d250a737e099` ;
- audit : `FINDER_P2_INTERACTION_V1` ;
- 2/2 scénarios ; `findingCount=0` ;
- mobile 390 : panneau `390×844`, body scroll verrouillé puis restauré ;
- desktop 1280 : panneau `520×900`, positionné à droite, body scroll verrouillé puis restauré ;
- fermeture `Escape` vérifiée.

### P3 — Search + continuity activation — ACTIVE

**Goal**  
Faire consommer le profil par Search/ranking sans remplacer les filtres classiques, puis garantir la reprise du projet sans exposition des données riches dans l’URL.

**Implémentation en cours**
- le tri `recommended` consomme la projection Finder non sensible déjà présente dans l’URL ;
- le ranking est déterministe et stable ;
- ville, quartiers, exclusions, types, priorités, préférences, usages et features explicites peuvent influencer l’ordre ;
- aucune préférence souple ne filtre un résultat : elle ne fait que le réordonner ;
- `personalized=0` restaure l’ordre classique ;
- `SearchPersonalizationControl` expose l’état actif/en pause ;
- `personal_context`, anchors et tolérances privées restent exclus de cette projection URL ;
- tests ciblés : `finder-personalization.test.ts` ;
- certification visuelle BEFORE/AFTER dédiée : `Mon Projet P3 Search Personalization`.

**Restant P3 avant CLOSED**
- certifier tests + build + BEFORE/AFTER 390/1280 ;
- vérifier la consommation sûre du profil complet authentifié via `project_id` ;
- vérifier la reprise du pending project anonyme / `/mon-projet/espace` sans exposer les données privées ;
- vérifier le raffinage sans repartir de zéro.

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
2. Finder reste optionnel.
3. Aucune nouvelle page “profil” concurrente.
4. Les profils V2 existants restent lisibles.
5. Search doit rester disponible même si la persistence échoue.
6. Une préférence souple ne doit pas masquer automatiquement tous les résultats.
7. Les données riches doivent être conservées sans les exposer inutilement dans l’URL.
8. Le nombre d’étapes visibles concerne l’expérience utilisateur, pas le nombre d’états internes de la machine.
9. Pas de promesse de rendement ou d’inférence personnelle non justifiée.
10. Aucun déploiement Vercel sans autorisation explicite.

## Progression vérifiée

- Lots CLOSED : `3 / 5`
- Lot actif : `P3`
- Avancement global par lots CLOSED : `60%`

## Next exact

Obtenir le résultat du workflow `Mon Projet P3 Search Personalization`. Si vert : montrer les captures BEFORE/AFTER, comparer le contrôle de personnalisation, puis poursuivre la consommation `project_id` / pending profile. Si rouge : diagnostiquer, corriger et relancer par commit sûr.
