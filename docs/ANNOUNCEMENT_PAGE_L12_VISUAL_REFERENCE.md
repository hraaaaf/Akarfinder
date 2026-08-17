# ANN-L12 — Référentiel visuel Mon Projet personnalisé

## Référence

Le référentiel est la fiche AkarFinder ANN-L11 certifiée, pas un redesign externe. L12 conserve :

- fond `#F8FAFC` ;
- deep blue `#0B1F3A / #0B2545` ;
- primary `#0B63CE` ;
- surfaces blanches, bordures slate, ombres froides légères ;
- bronze uniquement comme accent de confiance ;
- aucune concurrence avec le CTA professionnel/WhatsApp.

Baseline obligatoire avant mutation UI : même fixture ANN-L11 aux viewports 390×844 / 430×932 / 768×900 / 1280×900.

## Placement

Dans la colonne principale de `PropertyDetailV2`, immédiatement après `AkarInsightCard` et avant les sections détaillées. Le rail professionnel desktop reste inchangé.

## Wireframe cible

```text
┌──────────────────────────────────────────────────────┐
│ MON PROJET · [nom du projet]                        │
│ Ce bien face à vos critères                         │
│                                                      │
│ [Fit 82/100]*       4 critères OK · 1 écart         │
│                                                      │
│ ✓ Budget            dans votre budget               │
│ ✓ Type              appartement recherché           │
│ ! Surface           8 m² sous votre minimum         │
│ ? Vie à pied        donnée comparable indisponible  │
│                                                      │
│ Vos trajets*                                         │
│ Travail       18 min en voiture · route mesurée     │
│ École         non calculé                            │
│                                                      │
│ [Modifier Mon Projet]                                │
└──────────────────────────────────────────────────────┘
```

`*` affiché uniquement si le contrat de preuve est satisfait.

## États fail-closed

1. **Aucun projet/profil explicite** → aucun module fit, aucun score, aucun trajet.
2. **Profil explicite mais <2 critères évaluables** → raisons disponibles uniquement, aucun score global.
3. **Profil explicite + ≥2 critères évaluables** → score déterministe calculé uniquement sur dimensions évaluées ; chaque raison expose match/mismatch.
4. **Destination sans coordonnées ou propriété non exacte** → aucune durée précise.
5. **Routing indisponible / preuve périmée / destination incohérente** → libellé honnête `Trajet non calculé`, jamais approximation.

## Hiérarchie premium

- eyebrow `MON PROJET` en bleu AkarFinder ;
- titre compact, pas de hero secondaire ;
- score éventuel dans une petite pastille/tuile, jamais plus visuel que le prix ou AkarScore ;
- raisons en lignes denses 44 px minimum sur mobile ;
- vert/ambre utilisés seulement pour état match/écart, pas comme branding ;
- CTA secondaire `Modifier Mon Projet`, jamais CTA principal de la fiche.

## Critères de comparaison après implémentation

- structure avant/après inchangée hors insertion L12 ;
- 0 overflow sur 390/430/768/1280 ;
- aucune collision avec dock mobile L11 ;
- aucune couleur hors système AkarFinder ;
- module masqué sans projet ;
- score absent si preuve insuffisante ;
- temps absent sans `ROUTE_MEASURED` ;
- score visuel cible ≥9,2/10 contre ce référentiel.
