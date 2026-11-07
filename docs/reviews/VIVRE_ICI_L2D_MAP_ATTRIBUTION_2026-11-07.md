# Vivre Ici — L2-D : attribution cartographique visible et contrôles (candidat)

**07/11/2026 · Statut DRAFT : non certifié, non fusionné, non déployé.**

## Goal / Succès / Preuve
**GOAL :** afficher durablement les fournisseurs réels de cartographie sur les deux rendus de Vivre Ici, sans masquer la carte, la fiche ou la navigation mobile.
**SUCCESS :** contrôle d’attribution MapLibre présent avec crédits des sources effectivement chargées ; liens source nationale geoBoundaries et OpenStreetMap visibles ; ni la barre mobile ni la bottom sheet compacte/ouverte ne recouvrent les crédits sur 390×844, 430×932, 768×900, 1280×900.
**PROOF :** TypeScript, tests structurels, navigateur P1A.6, captures AFTER identiques aux BEFORE L1, mesures `boundingBox`, examen visuel ; publier un score visuel uniquement après cette validation.

## BEFORE et mockup
BEFORE [run P1A.6 #42358643944](https://github.com/hraaaaf/Akarfinder/actions/runs/42358643944), 20 captures ; [L2-A #42367154565](https://github.com/hraaaaf/Akarfinder/actions/runs/42367154565), 24 captures :
- `MapLibreNeighborhood3D.tsx` définissait `attributionControl: false` malgré les sources de tuiles Esri et OpenFreeMap/OSM munies de leur attribution.
- Le SVG national affichait un petit bandeau de texte non cliquable, en bas de carte, susceptible de passer sous la navigation mobile.
- La bottom sheet L2-C devait rester accessible avec les crédits au-dessus de sa bordure.

Wireframe mobile :
```text
  CARTE (nationale / ville / MapLibre)
  [Crédits vérifiables cliquables]  [zoom]
  ────────── zone libre ──────────
  [Fiche compacte   ⌃  ]
  [Voir les biens   ]      ← jamais caché
  [Navigation fixe]
```

## Modifications candidates
- `components/map/MapLibreNeighborhood3D.tsx` : activation de `attributionControl: { compact: false }`, option documentée par [MapLibre](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/) et [AttributionControlOptions](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/AttributionControlOptions/) ; sources inchangées.
- `components/map/PremiumInteractiveMap.tsx` : attributs de test `data-premium-map-attribution` et `data-premium-map-controls`, texte contextualisé « Sources des contours », liens réels de geoBoundaries et OSM.
- `app/map/l2d-attribution.css` : sous 768px, évite les recouvrements attribution/bottom sheet et navigation mobile, tient compte de `data-sheet-expanded`. Pas de déplacement de la carte ni de données nouvelles.
- Audits structurels et P1A.6 vérifient crédits dans le DOM, liens nationaux, texte fournisseur MapLibre, géométrie visible au-dessus des panneaux sur mobile.

## Limites et NEXT
Le fait d'afficher le crédit ne constitue pas une validation juridique des conditions commerciales d'Esri/OSM/OpenFreeMap ; revue provider/attributions exigée avant toute certification « conforme ». L2-C reste une dépendance non certifiée. P1B.2 prix/Supabase demeure indisponible et **ne doit pas être marqué vert artificiellement**.

NEXT exact : exécuter les tests du HEAD, inspecter screenshots 390/430/768/1280 et corriger les écarts ; laisser PR Draft et bases empilées jusqu'aux preuves. Aucun merge, DB prod ou déploiement Vercel autorisé.
