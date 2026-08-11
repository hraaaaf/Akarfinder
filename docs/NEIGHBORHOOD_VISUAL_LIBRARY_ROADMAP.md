# AkarFinder — Bibliothèque visuelle quartiers

**Statut : P0 SOUISSI PILOT CLOSED ✅ — P1.1 AGDAL NEXT**  
**Date : 2026-08-11**  
**Chantier : IMAGE-LIBRARY — Reality → AkarFinder**

Ce document détaille le sous-plan d’exécution de la bibliothèque visuelle nationale des quartiers. Il s’insère logiquement après `RABAT-REAL-PHOTO-LIBRARY-1` et avant toute expansion de couverture visuelle. Il ne rouvre pas les lots UX-SEARCH-1→7, ne modifie ni DATA, ni ranking, ni Source Registry, ni Map.

## Doctrine non négociable

Pipeline obligatoire :

`VRAIE PHOTO → vérification lieu → vérification droits/licence → ingestion du master intact → traitement AkarFinder non destructif au rendu (bitmap dérivé seulement si nécessaire) → comparaison source/rendu → score fidélité/UX → Storage + métadonnées → intégration Search`

Règles :

- aucune image de quartier générée ex nihilo ;
- aucune source non matériellement ingérée ne peut être présentée comme transformation ;
- aucune ambiance de quartier n’est présentée comme photo du bien ;
- aucun landmark, bâtiment, végétation, mer, café, villa, tour ou élément urbain ajouté arbitrairement ;
- tout traitement visuel majeur doit atteindre **≥ 9/10** avant validation ;
- un traitement CSS/UI non destructif est canonique lorsqu’il suffit : dans ce cas le master reste intact et `transformed_asset_url = NULL` est attendu ;
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

## P0.1 — Template Lock ✅ CLOSED

Responsabilité unique : formaliser le contrat graphique du Modèle A pour un usage production.

Actions :

- fixer ratio master et safe zones compatibles avec les crops Search ;
- fixer emplacement `SOUISSI`, `Rabat`, 3 qualificatifs max ;
- fixer intensité maximale des overlays/corrections colorimétriques ;
- fixer badge `Photo d’ambiance` comme responsabilité UI Search, non comme vérité de la photo ;
- produire un contrat visuel testable mobile/desktop.

Sortie : **Template A canonique prêt à appliquer**.

## P0.2 — Souissi Signature Source ✅ CLOSED

Responsabilité unique : certifier la source réelle Signature.

Source pilote certifiée : `Avenue Mohamed VI Souissi Rabat.jpg` — Wikimedia Commons, version paysage 3072×1728.

Actions :

- vérifier page source, auteur, date, licence et droit de modification ;
- télécharger le fichier original ;
- vérifier hash/dimensions et cohérence du lieu ;
- conserver attribution + licence + indication de modification ;
- stocker le master source sans transformation.

Sortie : **SOURCE RÉELLE INGÉRÉE ✅**.

## P0.3 — Souissi Signature Asset ✅ CLOSED

Responsabilité unique : appliquer réellement le Modèle A à la source P0.2 sans altérer le master. Le pilote a retenu un traitement CSS/UI non destructif ; aucun bitmap dérivé n’est créé lorsque le rendu suffit.

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

## P0.4 — Souissi Immobilier Source + Asset ✅ CLOSED

Responsabilité unique : produire un asset `immobilier` à partir d’une vraie villa/grande propriété de Souissi avec droits suffisants.

Actions :

- rechercher une source explicitement géolocalisée à Souissi ;
- préférer Creative Commons/open licence ;
- ne pas réutiliser automatiquement une photo d’annonce ou une référence `reference_only` ;
- ingérer le fichier source ;
- appliquer le Modèle A au rendu, ou créer un dérivé uniquement si un traitement pixel est réellement nécessaire ;
- conserver rapport bâtiment/jardin, parcelle, faible densité et volumes réels ;
- scorer ≥9/10.

Sortie : `Souissi / immobilier`.

## P0.5 — Souissi Lifestyle Source + Asset ✅ CLOSED

Responsabilité unique : produire un asset `lifestyle` réel du calme/verdure/cadre résidentiel de Souissi.

Actions identiques à P0.4 avec priorité à :

- arbres matures ;
- jardins ;
- espaces résidentiels calmes ;
- faible densité ;
- aucune artificialisation nightlife/commerces denses.

Sortie : `Souissi / lifestyle`.

## P0.6 — Visual Gate Search ✅ CLOSED

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

Gate : **UX/UI ≥9/10**. Pilote Souissi final : **9,2/10 PASS**.

## P0.7 — DB & Storage Integration ✅ CLOSED

Responsabilité unique : matérialiser les 3 assets certifiés dans la bibliothèque Supabase.

Actions :

- stocker les originaux certifiés dans `neighborhood-visuals` ;
- stocker séparément un dérivé uniquement lorsqu’un vrai bitmap transformé existe ;
- compléter provenance/licence/attribution ;
- renseigner `image_storage_path` ; `transformed_asset_url` reste `NULL` pour le traitement CSS/UI non destructif certifié du pilote ;
- conserver les notes de fidélité et le statut du rendu ;
- vérifier RLS fail-closed ;
- zéro publication publique implicite depuis la DB.

Sortie : **Souissi 3/3 READY ✅** — 3 masters physiques + 3 rows canoniques vérifiées.

## P0.8 — Production Certification ✅ CLOSED

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

Sortie : **SOUISSI PILOT CLOSED ✅**.

<!-- SOUISSI-PILOT-EVIDENCE-START -->
## Preuves de clôture P0 — Souissi

- P0.6 : vraies cards Search, mobile + desktop, score humain **9,2/10** ; aucun asset fictif accepté.
- P0.7 : PR #506 mergée ; trois masters publics stockés dans le bucket `neighborhood-visuals`.
- P0.7S : PR #507 mergée ; ingestion one-shot fermée et `pg_net` supprimé.
- Storage paths : `rabat/souissi/signature/master.jpg`, `rabat/souissi/immobilier/master.jpg`, `rabat/souissi/lifestyle/master.jpg`.
- Source/licence : Wikimedia Commons ; Signature et Lifestyle CC BY-SA 4.0, Immobilier CC BY-SA 3.0 ; attribution et ShareAlike conservés.
- Doctrine finale du pilote : **master intact + identité AkarFinder au rendu**. Un bitmap transformé n’est jamais fabriqué uniquement pour remplir une colonne DB.
- P2 reste la frontière d’activation du resolver bibliothèque quartier.
<!-- SOUISSI-PILOT-EVIDENCE-END -->

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

`source réelle → droits → geo vérification → ingestion du master → traitement Modèle A non destructif (dérivé seulement si nécessaire) → score ≥9 → DB/Storage`.

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

`Neighborhood Registry → source discovery → rights/license → geo verification → DB slots → ingestion master → traitement non destructif ou dérivé justifié → fidelity QA → Search QA`.

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

**État actuel : P0 Souissi Pilot CLOSED ✅. Trois masters réels sont stockés et trois rows canoniques sont réconciliées ; le rendu Modèle A est non destructif et certifié en Search à 9,2/10 ; `transformed_asset_url` reste volontairement `NULL`. Prochain LOT : P1.1 Agdal.**
