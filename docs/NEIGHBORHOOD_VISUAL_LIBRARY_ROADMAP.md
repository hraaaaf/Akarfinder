# AkarFinder — Bibliothèque visuelle quartiers

**Statut : PLANNED**  
**Date : 2026-08-11**  
**Chantier : IMAGE-LIBRARY — Reality → AkarFinder**

Ce document détaille le sous-plan d’exécution de la bibliothèque visuelle nationale des quartiers. Il s’insère logiquement après `RABAT-REAL-PHOTO-LIBRARY-1` et avant toute expansion de couverture visuelle. Il ne rouvre pas les lots UX-SEARCH-1→7, ne modifie ni DATA, ni ranking, ni Source Registry, ni Map.

## Doctrine non négociable

Pipeline obligatoire :

`VRAIE PHOTO → vérification lieu → vérification droits/licence → ingestion du fichier original → transformation AkarFinder → comparaison original/résultat → score fidélité → stockage → intégration Search`

Règles :

- aucune image de quartier générée ex nihilo ;
- aucune source non matériellement ingérée ne peut être présentée comme transformation ;
- aucune ambiance de quartier n’est présentée comme photo du bien ;
- aucun landmark, bâtiment, végétation, mer, café, villa, tour ou élément urbain ajouté arbitrairement ;
- toute transformation visuelle majeure doit atteindre **≥ 9/10** avant validation ;
- licence, attribution, droit de modification et droit de publication restent distincts ;
- une responsabilité = une branche = une PR = un LOT.

## Identité graphique verrouillée — Modèle A

Le template retenu pour les assets quartiers est **Modèle A** :

- vraie photo plein cadre dominante ;
- traitement AkarFinder léger, sans dénaturer la scène ;
- fond/overlay marine très discret si nécessaire ;
- accent teal AkarFinder ;
- touche dorée minimale facultative ;
- nom du quartier très lisible ;
- ville en second niveau ;
- **3 qualificatifs maximum** ;
- badge explicite `Photo d’ambiance` dans Search lorsque l’image ne représente pas le bien ;
- format/crop compatible avec les cards Search denses actuelles.

---

# P0 — SOUISSI PILOT

Objectif : prouver le pipeline complet sur un seul quartier avant toute industrialisation.

## P0.1 — Template Lock

Responsabilité unique : formaliser le contrat graphique du Modèle A pour un usage production.

Actions :

- fixer ratio master et safe zones compatibles avec les crops Search ;
- fixer emplacement `SOUISSI`, `Rabat`, 3 qualificatifs max ;
- fixer intensité maximale des overlays/corrections colorimétriques ;
- fixer badge `Photo d’ambiance` comme responsabilité UI Search, non comme vérité de la photo ;
- produire un contrat visuel testable mobile/desktop.

Sortie : **Template A canonique prêt à appliquer**.

## P0.2 — Souissi Signature Source

Responsabilité unique : certifier la source réelle Signature.

Source pilote prioritaire : `Avenue Mohamed VI Souissi Rabat -1.jpg` — Wikimedia Commons.

Actions :

- vérifier page source, auteur, date, licence et droit de modification ;
- télécharger le fichier original ;
- vérifier hash/dimensions et cohérence du lieu ;
- conserver attribution + licence + indication de modification ;
- stocker le master source sans transformation.

Sortie : **SOURCE RÉELLE INGÉRÉE ✅**.

## P0.3 — Souissi Signature Asset

Responsabilité unique : transformer réellement la source P0.2 selon Modèle A.

À préserver :

- perspective ;
- géométrie de la voirie ;
- bâtiments/volumes visibles ;
- végétation réelle ;
- lampadaires, murs, portails et mobilier existants ;
- densité urbaine réelle.

Interdit : ajouter villas, tours, cafés, monuments ou végétation inexistants.

Scoring :

- fidélité géométrique ;
- fidélité urbaine ;
- conservation éléments existants ;
- qualité graphique ;
- identité AkarFinder ;
- absence d’hallucination.

Gate : **score global ≥ 9/10**.

Sortie : `Souissi / signature`.

## P0.4 — Souissi Immobilier Source + Asset

Responsabilité unique : produire un asset `immobilier` à partir d’une vraie villa/grande propriété de Souissi avec droits suffisants.

Actions :

- rechercher une source explicitement géolocalisée à Souissi ;
- préférer Creative Commons/open licence ;
- ne pas réutiliser automatiquement une photo d’annonce ou une référence `reference_only` ;
- ingérer le fichier source ;
- transformer selon Modèle A ;
- conserver rapport bâtiment/jardin, parcelle, faible densité et volumes réels ;
- scorer ≥9/10.

Sortie : `Souissi / immobilier`.

## P0.5 — Souissi Lifestyle Source + Asset

Responsabilité unique : produire un asset `lifestyle` réel du calme/verdure/cadre résidentiel de Souissi.

Actions identiques à P0.4 avec priorité à :

- arbres matures ;
- jardins ;
- espaces résidentiels calmes ;
- faible densité ;
- aucune artificialisation nightlife/commerces denses.

Sortie : `Souissi / lifestyle`.

## P0.6 — Visual Gate Search

Responsabilité unique : tester les 3 assets dans les vraies cards AkarFinder.

Viewports minimum :

- 360×800 ;
- 390×844 ;
- 768×900 ;
- 1024×800 ;
- 1280×900 ;
- 1440×900.

Mesurer :

- crop ;
- lisibilité du quartier ;
- contraste ;
- répétition ;
- densité ;
- absence d’overflow/clipping ;
- transparence `Photo d’ambiance` ;
- cohérence avec les cards Search certifiées.

Gate : **UX/UI ≥9/10**.

## P0.7 — DB & Storage Integration

Responsabilité unique : matérialiser les 3 assets certifiés dans la bibliothèque Supabase.

Actions :

- stocker originaux et transformations séparément ;
- compléter provenance/licence/attribution ;
- renseigner source path + transformed asset URL ;
- renseigner fidélité et statut style ;
- vérifier RLS fail-closed ;
- zéro publication publique implicite depuis la DB.

Sortie : **Souissi 3/3 READY**.

## P0.8 — Production Certification

Responsabilité unique : fermer le pilote Souissi.

Gate :

- CI/tests/build verts ;
- migration drift vert si migration impliquée ;
- exact-head vérifié ;
- validation Search réelle ;
- attribution/licence vérifiées ;
- aucun asset fictif ;
- docs canoniques alignées ;
- PR mergée + post-merge check.

Sortie : **SOUISSI PILOT CLOSED**.

---

# P1 — RABAT PILOT SCALE

Objectif : appliquer le pipeline certifié Souissi aux 9 autres quartiers Rabat sans rebâtir le design.

## P1.1 — Agdal

3 assets : `signature / immobilier / lifestyle`.

## P1.2 — Hay Riad

3 assets : `signature / immobilier / lifestyle`.

## P1.3 — Hassan

3 assets : `signature / immobilier / lifestyle`.

## P1.4 — Océan

3 assets : `signature / immobilier / lifestyle`.

## P1.5 — Médina

3 assets : `signature / immobilier / lifestyle`.

## P1.6 — Les Orangers

3 assets : `signature / immobilier / lifestyle`.

## P1.7 — Aviation

3 assets : `signature / immobilier / lifestyle`.

## P1.8 — Yacoub El Mansour

3 assets : `signature / immobilier / lifestyle`.

## P1.9 — Akkari

3 assets : `signature / immobilier / lifestyle`.

Pour chaque quartier :

`source réelle → droits → geo vérification → ingestion → transformation Modèle A → score ≥9 → DB`.

## P1.10 — Rabat Certification

Responsabilité unique : certifier la bibliothèque Rabat complète.

Gate :

- **30/30 assets** ;
- 0 source fictive ;
- 0 transformation non reliée à son original ;
- cohérence graphique nationale ;
- diversité suffisante ;
- crops Search mobile/desktop ;
- licences/attributions complètes ;
- fallbacks corrects ;
- UX ≥9/10.

Sortie : **Rabat 30/30 CERTIFIED**.

---

# P2 — SEARCH INTEGRATION V2

Objectif : consommer la bibliothèque quartier de manière déterministe, transparente et truth-safe.

## P2.1 — Visual Resolver V2

Hiérarchie cible :

`photo réelle du bien autorisée → asset quartier AkarFinder → asset ville/type → fallback neutre`.

Aucune ambiance quartier ne remplace une photo du bien lorsqu’une photo autorisée existe.

## P2.2 — Scene Selection

Responsabilité unique : distribuer `signature / immobilier / lifestyle` sans hasard instable.

Principes :

- sélection déterministe à partir d’une clé stable ;
- éviter les répétitions adjacentes excessives ;
- aucun choix basé sur du texte libre non certifié ;
- pas de `Math.random()`.

## P2.3 — Transparency & Attribution

Pour tout asset quartier :

- label public `Photo d’ambiance` ;
- crédit/licence accessibles ;
- ne jamais suggérer qu’il s’agit du logement ;
- provenance et attribution compatibles mobile.

## P2.4 — Search Visual QA

Viewports : 360 / 390 / 768 / 1024 / 1280 / 1440.

Mesurer :

- crop ;
- variété ;
- répétition ;
- stabilité au reload ;
- densité ;
- temps de scan ;
- image failures ;
- transparence ;
- attribution.

Gate : **≥9/10**.

---

# P3 — NATIONAL SCALE

Objectif : industrialiser la bibliothèque après Rabat.

Ordre de priorité initial :

1. Casablanca ;
2. Marrakech ;
3. Tanger ;
4. Agadir ;
5. Fès / Meknès ;
6. reste du Maroc selon profondeur Search et couverture Geo.

Pipeline industrialisé :

`Neighborhood Registry → source discovery → rights/license → geo verification → DB slots → ingestion → transformation → fidelity QA → Search QA`.

L’automatisation peut assister la recherche et la préparation ; **la validation visuelle finale reste obligatoire**.

---

# P4 — VISUAL INTELLIGENCE

Objectif : exploiter une bibliothèque devenue suffisamment dense sans sacrifier vérité ni stabilité.

## P4.1 — Rotation intelligente

Réduire les répétitions visibles de la même scène dans les résultats adjacents tout en gardant une sélection déterministe.

## P4.2 — Property Compatibility

Utiliser uniquement des signaux structurés certifiés pour choisir un rôle compatible (`signature / immobilier / lifestyle`). Aucun texte libre ne doit inventer une correspondance.

## P4.3 — Freshness

Versionner/remplacer les références devenues obsolètes quand la morphologie réelle du quartier change.

## P4.4 — Coverage Score

Dashboard de couverture :

- ville ;
- quartier ;
- assets requis ;
- assets certifiés ;
- assets expirés/review-needed ;
- licence status ;
- couverture Search effective.

Exemple cible :

`Rabat 30/30 → Casablanca x/y → Marrakech x/y → Maroc %`.

---

# Ordre d’exécution immédiat

Le chantier commence strictement par :

`P0.1 → P0.2 → P0.3 → P0.4 → P0.5 → P0.6 → P0.7 → P0.8`

Aucun P1/P2/P3/P4 n’est activé avant certification du pilote Souissi.

**État actuel : P0.1 Modèle A choisi ; formalisation production à certifier. Souissi DB possède déjà 3 slots (`signature / immobilier / lifestyle`), sans transformation finale validée.**
