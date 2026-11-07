# Vivre Ici — L2-C : fiche mobile repliable (candidat)
**07/11/2026 — PR Draft, sans fusion, sans déploiement.**

## Goal
Sur Maârif, donner à l'utilisateur une fiche mobile réellement ouvrable et repliable, sans cacher la carte ni le bouton de recherche de biens, tout en conservant l'état honnête des données locales.

## BEFORE / problèmes observés
- Captures de référence [P1A.6 L1 #42358643944](https://github.com/hraaaaf/Akarfinder/actions/runs/42358643944), 390×844/430×932/768×900/1280×900, 20 PNG. Le rail possède une simple poignée `div.p4-sheet-handle` **non actionnable**.
- `app/map/clinical-sheet-guard.css`, `app/map/ux-convergence-l9.css` et `app/map/p4-map-shell.css` imposent plusieurs `max-height` (jusqu'à 176px, min 27svh). Le rail peut masquer les contenus sans permettre d'accès.
- La correction L1 `.p4-premium-empty-evidence` doit rester visible quand 0 POI récent ; Search doit rester présent.

## Cible design (mockup fonctionnel)
```text
ÉTAT FERMÉ ≤160px (390/430 px)         ÉTAT OUVERT ≤55svh (390/430 px)
┌──────────────────────────────┐       ┌──────────────────────────────┐
│ Maârif                 [⌃]   │       │ Maârif                 [⌄]   │
│ Pas de repère récent         │       │ Pas de repère récent         │
│ [Voir les biens à Maârif]    │       │ Vie quotidienne / sources   │
└──────────────────────────────┘       │ Cadre de vie / couverture    │
  Carte toujours visible              │ contenu défilable           │
                                     │ [Voir les biens à Maârif]    │
                                     └──────────────────────────────┘
```

## Candidate implementation
- `P4MapDecisionRail.tsx`: un vrai bouton de bascule, cible de 44×44px, `aria-expanded` et `aria-controls` pilotés par état; réinitialisation à la navigation. Contenu développé regroupé en `[data-l2c-extra]`; CTA géofiltré conservé en dehors du bloc pour rester visible.
- Nouveau `app/map/l2c-sheet.css`, chargé en dernier dans `app/map/page.tsx`: règles phones ≤767px suffisamment ciblées pour neutraliser les anciens `max-height !important` uniquement selon l'état. État ouvert avec un contenu central scrollable, carte visible ; sur tablette/desktop contenu inchangé et bouton masqué.
- `scripts/audits/p1a6-map-responsive-smoke.ts`: pour 390/430, vérifie bounding boxes : fermé ≤160px, cible touche ≥44px, CTA non rogné; ouvre, vérifie `aria-expanded`, sections Quotidien/Cadre de vie, CTA visible, capture `map-casablanca-maarif-sheet-expanded-*.png` (2 captures additionnelles), puis referme. Test structurel associé.

## Success et preuve exigée
- CI exact HEAD TypeScript + required gate + P1A.6 sans findings; les images supplémentaires doivent exister dans l'artifact et être affichées/comparées aux BEFORE.
- Contrôle manuel lecture de Maârif, absence de saut/clipping horizontal, focus clavier, CTA lisible sur les deux états et attribution carte accessible; après correction visuelle si nécessaire.
- Ne pas publier de note de design finale ni déclarer lot validé tant que tests et images n'ont pas été inspectés.
- Prix/POI sans provenance restent indisponibles. Dépendances L1 #1175, L2-A #1177, L2-B #1178; pas de merge ni de déploiement Vercel.
