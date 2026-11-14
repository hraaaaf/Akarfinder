# NCI Lot 5 — Visual target Novembre 2026, homepage et contrats

Date : 2026-11-13. Statut : MOCKUP défini après captures BEFORE ; non preuve d'un écran déployé.

## GOAL
Rétablir Vivre Ici sur la Homepage entre les villes et les actions, avec le même NeighborhoodContextReadModelV1 que la carte, la page SEO quartier et l'annonce moderne. Ne pas afficher de POI périmés, faux prix, faux temps de trajet ni frontière Maârif centrale non certifiée.

## BEFORE vérifié dans GitHub Actions
- Run [#43455239930](https://github.com/hraaaaf/Akarfinder/actions/runs/43455239930), artifact **14054450401**, 16 PNG + report, **16/16 PASS**, 0 erreur JS, 0 débordement.
- Viewports identiques obligatoires : 390×844 / 430×932 / 768×900 / 1280×900.
- Homepage / : capture ancrée sur le bas de la grille de villes ; après cette grille, des cartes « La suite de votre projet », mais pas de module Vivre Ici.
- SEO /immobilier/rabat/agdal : panneau contextuel NCI existant, 0 ancre actuelle.
- QA annonce /visual-qa/announcement-page-living-here?state=context : fixture **historique** datée août 2026, 4 repères, ne constitue PAS de la couverture actuelle.
- Carte /map?city=Casablanca&district=Maârif&layer=explore : 3 modes opérationnels et bloc données locales indisponibles.
- Le run pull_request construit un ref de merge éphémère (`GITHUB_SHA` du rapport), alors que le HEAD de la branche propriétaire est `6ad19e330e6153d4228560149ea75cc420d5d9a6`.

## Mockup/référence de composition (avant implémentation)
Visuel desktop+mobile montré au propriétaire dans la conversation le 13 novembre 2026, fichier auteur `homepage_nci_l5_target.png` ; le contrat textuel stable est :

DESKTOP 1280
```text
[VIVRE ICI · REPÈRES SOURCÉS]                [Explorer la carte →]
Comprendre le quartier avant de visiter
Les lieux du quotidien ne sont affichés qu'après vérification récente.
L'absence de repères ne signifie pas l'absence de services.

┌ RABAT · AGDAL ──────────┐ ┌ CASABLANCA · MAÂRIF ─┐ ┌ MARRAKECH · GUÉLIZ ─┐
│ Repères indisponibles    │ │ Repères indisponibles │ │ Repères indisponibles│
│ Sources à revalider      │ │ Sources à revalider   │ │ Sources à revalider  │
│ Explorer Agdal         → │ │ Explorer Maârif     → │ │ Explorer Guéliz    → │
└──────────────────────────┘ └───────────────────────┘ └──────────────────────┘
Aucun prix de quartier, temps de trajet ou POI non vérifié n'est inventé.
```

MOBILE 390/430 : titre 2 lignes, CTA carte >=44 px, une carte entière + amorce de la suivante en défilement horizontal, lien pleine carte >=44 px, aucun défilement horizontal du document.

## SUCCESS ciblé exigé
- Le module Homepage est monté une seule fois, 3 cartes issues du read-model, canonical_neighborhood_id stable et diagnostics de coverage identiques à l'API du même build. Zéro ancre périmée rendue.
- Les trois surfaces NCI « courantes » (Homepage Agdal, Page quartier Agdal, annonce QA **live**) partagent id/coverage/poi IDs ; la carte Maârif rend sa propre vérité source. Historique QA août préservé distinctement pour une régression positive.
- Aucune nouvelle donnée ni prix/temps extrapolé. CTAs visibles et clavier/touch >=44 px, overflow=0, pageerrors=0.
- Suite AFTER 5 états × 4 viewports = 20 captures, dont quatre comparables directes aux BEFORE ; test code/TypeScript/build + NVDA/VoiceOver si impacté.
- Constat du score UX honnête et gate propriétaire. Cible >=9,5/10 non certifiée automatiquement par la CI.

## NON OBJECTIFS
Pas d'injection des 415 POI Geofabrik privés, pas de 1 339 tuiles OSM J18 publiques, pas de promotion du seed août par retouche de observed_at, pas de Vercel/merge sans GO distinct.

## AFTER comparé aux BEFORE, 13 novembre 2026

Le mockup desktop/mobile a été confronté à la vraie Homepage 1280×900 puis 390×844 ; également 430×932 et 768×900. Trois cartes Agdal/Maârif/Guéliz, CTA vers la carte, état « Repères indisponibles » et zéro overflow. Le [run AFTER #43458198177](https://github.com/hraaaaf/Akarfinder/actions/runs/43458198177) contient 20/20 captures et aucun finding ; le [BEFORE #43455239930](https://github.com/hraaaaf/Akarfinder/actions/runs/43455239930) contient 16/16 captures comparables.

Score UX **estimatif**, non une note certifiée de tests utilisateurs : hiérarchie 9, responsive 9, cohérence 9, accessibilité partielle 8,5, honnêteté 9,5, utilité des informations 6 = moyenne ≈8,5/10. La cible ≥9,5/10 n'est pas atteinte faute de POI frais ; ne pas inventer de données pour la dépasser.

