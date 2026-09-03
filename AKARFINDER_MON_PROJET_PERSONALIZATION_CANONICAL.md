# AkarFinder — Mon Projet Personalization Canonical

Status: ACTIVE  
Canonical branch: `feat/mon-projet-personalization`  
Base: `main` @ `31174a4527c6034a08943d25a9de9811a90480c1`  
Deployment: none — production deployment requires explicit authorization.

## Goal final

Faire de **Mon Projet** le moteur canonique de personnalisation AkarFinder : comprendre le besoin immobilier et le quotidien de l’utilisateur en **3 étapes visibles maximum**, produire un profil structuré persistant, puis l’utiliser pour lancer et affiner la recherche sans repartir de zéro.

**Akar Sense** est le point d’entrée contextuel optionnel depuis `/search`. La recherche classique reste immédiatement utilisable et `/mon-projet` reste l’URL canonique de reprise/modification du projet.

### Succès observable

- `/mon-projet` reste la destination canonique du projet.
- Akar Sense est optionnel et n’empêche jamais la recherche classique.
- Onboarding initial : **3 étapes visibles maximum**.
- Profil structuré V2 conservé et exploité par Search.
- Données personnelles/contextuelles riches exclues de l’URL.
- Continuité anonyme par `sessionStorage` et authentifiée via `/api/me/continuity` + `project_id`.
- Recherche personnalisée désactivable sans casser le tri classique.
- Accessibilité clavier de base du dialogue Akar Sense certifiée avant closeout.
- Aucun déploiement Vercel sans autorisation explicite.

## Architecture verrouillée

1. Ne pas créer de surface concurrente “Profil”.
2. `Mon Projet` reste le nom et l’URL canonique.
3. Akar Sense reste une couche optionnelle au-dessus de `/search`.
4. Desktop : panneau latéral ; mobile : plein écran `100dvh`.
5. Même moteur `MonProjetWizardP2` dans `/mon-projet` et Akar Sense.
6. Les préférences souples réordonnent les résultats mais ne les filtrent pas.
7. `personal_context`, anchors et tolérances riches restent hors URL.

## Funnel cible

### Étape 1 — Mon besoin
Objectif, usage, ville/zone, budget, type de bien et contraintes essentielles.

### Étape 2 — Mon quotidien
Famille, télétravail, mobilité, écoles/transports/commerces, calme/animation, espaces verts/mer et anchors utiles.

### Étape 3 — Mes priorités
3 à 5 priorités principales, compromis contextuels seulement si nécessaires, résumé compact et CTA vers les biens adaptés.

Après onboarding, le récapitulatif est un état modifiable et la recherche une action/résultat, pas des étapes supplémentaires.

## Roadmap vérifiée

### P0 — Contract + funnel architecture — CLOSED

**Goal** : verrouiller le contrat produit/data sans modifier le comportement production.

**Preuve** : architecture 3 étapes, mapping ancien → nouveau, matrice des champs et revue des surfaces Search/Companion/continuity.

### P1 — Profile core enrichment — CLOSED

**Goal** : rendre le contexte quotidien et les anchors réellement écrivables, transportables de façon sûre et testés.

**Preuve vérifiée**
- HEAD certifié : `c8f651aae9873a11c58eef49edb19f8762816faf` ;
- workflow : `Announcement Page L12 Mon Projet Personalise` ;
- run : `33623128050` — **SUCCESS** ;
- tests ciblés, TypeScript et production build : SUCCESS.

### P2 — 3-step UX + Akar Sense shell — CLOSED

**Goal** : remplacer les 8 étapes visibles par 3 étapes maximum et exposer le même moteur depuis `/search`.

**BEFORE**
- workflow : `Mon Projet P2 Visual Proof` ;
- run : `33649422239` ; artifact : `9854176771` ;
- viewports : 390 / 768 / 1280 ; baseline : wizard 8 étapes.

**AFTER `/mon-projet`**
- run : `33660556543` — **SUCCESS** ;
- artifact : `9858651735` ;
- SHA256 : `e7908fa68299584a9dc256a9faa319f8072b08f43a8874b9faf1ee6c8911de07` ;
- 3/3 captures, `findingCount=0`, aucun overflow ;
- score visuel : **9/10**.

**Akar Sense `/search`**
- run : `33665341707` — **SUCCESS** ;
- artifact : `9860482949` ;
- SHA256 : `59f19d11a41c82f9791c859371a5ab52d6b9cd6904917f741880d250a737e099` ;
- audit : `FINDER_P2_INTERACTION_V1`, 2/2 scénarios, `findingCount=0` ;
- mobile 390 : panneau `390×844` ; desktop 1280 : panneau `520×900` ;
- scroll lock/restauration et fermeture Escape vérifiés.

### P3 — Search + private continuity activation — CLOSED

**Goal** : faire consommer le profil par Search/ranking, préserver les filtres classiques et garantir la reprise privée du projet.

**Implémentation certifiée**
- tri `recommended` piloté par projection Akar Sense ;
- `personalized=0` restaure l’ordre classique ;
- préférences souples = ranking uniquement ;
- profil pending anonyme lu depuis `sessionStorage` ;
- profil authentifié repris via `/api/me/continuity` avec `project_id` ;
- workspace construit une reprise déterministe ;
- données privées exclues des URLs.

**Preuve finale vérifiée — 2026-09-03**
- HEAD : `962b6090cdc44b1208a78ff18b1921a437e03ec1` ;
- workflow : `Mon Projet P3 Search Personalization` ;
- run #56 : `33784096977` — **SUCCESS** ;
- artifact : `9904900621` ;
- artifact SHA256 : `3812b4aa4adc6d30730bc36aee2a60ecc801f69b7583da8fadb26d51a6800ece` ;
- ranking ciblé : **6/6 tests pass** ;
- BEFORE 390/1280 : green ;
- AFTER actif 390/1280 : green ;
- AFTER désactivé 390/1280 : green ;
- continuity schema : `AKAR_SENSE_P3_CONTINUITY_RUNTIME_V1` ;
- `findingCount=0` ;
- anonyme : `storageRead=true` ;
- authentifié : `continuityHits=1` ;
- workspace : `project_id=audit-project`, `guided=1`, `city=Rabat`, `property_type=Appartement` ;
- clés privées interdites dans URL : aucune trouvée ;
- score visuel : **9/10**.

### P4 — Accessibility + final closeout — ACTIVE

**Goal** : certifier le dialogue Akar Sense au clavier puis fermer le chantier sans régression visuelle.

**Baseline vérifiée avant implémentation**
- `Escape` ferme le dialogue ✅
- body scroll lock/restauration ✅
- `role="dialog"` + `aria-modal="true"` ✅
- focus initial dans le dialogue ❌
- trap `Tab / Shift+Tab` ❌
- retour focus au launcher ❌

**Implémentation préparée dans le lot P4**
- focus initial sur le bouton de fermeture ;
- trap `Tab / Shift+Tab` dans le panneau ;
- `Escape` conservé ;
- focus restauré au launcher à la fermeture ;
- aucune modification visuelle intentionnelle.

**Succès P4 attendu avant CLOSED**
- runtime `AKAR_SENSE_P4_ACCESSIBILITY_RUNTIME_V1` avec `findingCount=0` ;
- BEFORE/AFTER mêmes viewports 390×844 et 1280×900 ;
- aucune erreur page ni overflow ;
- comparaison visuelle et score ;
- canonique passé à 100 % seulement après preuve ;
- PR prête puis merge/post-merge vérifiés ;
- aucun déploiement Vercel sans autorisation explicite.

## Invariants

1. `/mon-projet` reste canonique.
2. Akar Sense reste optionnel.
3. Aucune nouvelle page “profil” concurrente.
4. Les profils V2 existants restent lisibles.
5. Search reste disponible même si la persistence échoue.
6. Une préférence souple ne masque pas automatiquement les résultats.
7. Les données riches sont conservées sans exposition inutile dans l’URL.
8. 3 étapes visibles concernent l’UX, pas le nombre d’états internes.
9. Aucun déploiement Vercel sans autorisation explicite.

## Progression vérifiée

- Lots CLOSED : `4 / 5`
- Lot actif : `P4`
- Avancement global par lots CLOSED : **80%**

## Next exact

Exécuter `Mon Projet P4 Akar Sense Accessibility` sur le commit P4 atomique. Si vert : récupérer l’artifact, montrer les captures BEFORE/AFTER, valider `findingCount=0`, comparer visuellement, passer P4 à CLOSED / 100 %, puis préparer PR/merge et post-merge. Si rouge : diagnostiquer le point exact avant toute correction.
