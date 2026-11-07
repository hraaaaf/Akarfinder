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


## Checkpoint QA manuel — 07/11, tablette 768×900
- **BEFORE prouvé :** artefact P1A.6 [#42374289592](https://github.com/hraaaaf/Akarfinder/actions/runs/42374289592), HEAD `e0c37135`, 26 captures / `findings=[]`, Required Gate [#42374289626](https://github.com/hraaaaf/Akarfinder/actions/runs/42374289626) SUCCESS. Malgré cela, l'image `map-casablanca-maarif-768.png` montre « Biens » coupé et le CTA hors zone visible de la fiche (erreur de QA que le test mobile ≤430 ne couvrait pas). 390/430 compacte/dépliée vérifiées visuellement, crédits Esri/OSM au-dessus de la fiche.
- **Correction candidate :** même bottom sheet accessible avec état compact/déplié à 768px et jusqu'à 1023px, au lieu d'un rail legacy rogné. Décalage des attributions cohérent au format tablette. Le test navigateur P1A.6 inclut désormais 768 dans les deux états et exige CTA visible, hauteur compacte, contrôle 44px et crédits non masqués.
- **Sécurité CI indépendante :** le workflow legacy P1B.2 appelait Supabase hébergé sur PR, et échouait avec `ENOTFOUND kusfiyimwvxblvsrhaes.supabase.co` puis HTTP 503, [run #42374289590](https://github.com/hraaaaf/Akarfinder/actions/runs/42374289590). Nouveau candidat : contrats offline lors des PR, contrôle cloud manuel et explicitement opt-in seulement. Ne pas confondre SKIPPED live et certification des prix. Aucune écriture DB, changement de configuration cloud, Vercel ou merge.
- **PROOF RESTANTE :** P1A.6/Required Gate exact nouveau HEAD, 768 compact/déplié AFTER inspecté et affiché ; rapports 390/430/1280 sans régression, sécurité workflow, aucune affirmation de conformité de licences fournisseur.
