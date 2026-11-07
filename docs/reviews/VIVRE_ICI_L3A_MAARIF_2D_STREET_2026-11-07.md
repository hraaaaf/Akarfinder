# Vivre Ici — L3-A Maârif : modes réels, caméra 2D, zoom rue

**07/11/2026 · DRAFT · Prérequis L2-D #1180 HEAD `e752e793`, sans fusion ou déploiement.**

## BEFORE → Goal → Mockup
- **BEFORE vérifiable :** [P1A.6 L2-D #42375209714](https://github.com/hraaaaf/Akarfinder/actions/runs/42375209714), 27 PNG (390/430/768/1280), écran Maârif avec caméra 3D oblique, faux switch visuel 2D/3D et pseudo-couches ; les données de POI récentes manquent et sont affichées comme indisponibles. Le statut des limites est `center-only` (aucune frontière administrative vérifiée passée par le routeur).
- **GOAL de ce sous-lot :** Maârif en 2D, nord en haut, par défaut ; vrai passage **Quartier → Rue → Quartier** avec caméra mesurée ; aucun contrôle décoratif ni géométrie publiée sans source revue ; respect de la sheet L2-C et des crédits L2-D.
- **SUCCESS :** caméra effective `pitch=0`, `bearing=0` sur Maârif ; bouton Rue zoom réel `≥16.8`, retour Quartier `≤15.2` ; contrôles clavier/touch ≥44px ; 390/430/768/1280 screenshots AFTER + zéro erreur Playwright/Required Gate ; Rabat/Agdal inchangé.
- **PROOF :** `scripts/audits/p1a6-map-responsive-smoke.ts` contrôle les deux états caméra et produit `map-casablanca-maarif-street-{390,430,768,1280}.png`. Toujours inspecter visuellement les captures face à l'artefact BEFORE et qualifier un score après QA.

Mockup fonctionnel (vraie carte, sans contours approximatifs) :

```text
[Rechercher / ville]              [fond satellite]
[← Maroc]                   [crédits réels]
[Quartier · 2D] [Rue · zoom]
Limites administratives indisponibles · source non revue
     Carte 2D nord en haut (rue = zoom réel)
[Fiche compacte / ouverte, CTA Search accessible]
```

## Limites explicites
- **Ce n'est PAS les 3 modes L3 complets.** Le mode limites administratives est indisponible tant que le contour de l'arrondissement/sa sémantique source ne sont pas revus ; ne pas copier la PR #1108 `shadow-reference` comme si elle était certifiée.
- Les repères POI historiques périmés ne sont pas rajeunis ; aucun marqueur, distance, temps ou prix ajouté.
- Pas de fusion, de collecte, de DB cloud, d'import Supabase, de Vercel ou de nouvelles dépendances.
- **Next :** CI+captures, corrections, closeout L3-A ; revue SIG géométrie administrative (human gate), vérification des POI et modes réels L3-B, puis L4–L6.

## CI route temporaire — test exact HEAD
Pour obtenir Required Gate/Responsive P1A.6 (déclenchés uniquement pour une PR cible `main`), la PR Draft #1181 est temporairement retargetée vers `main`. Les changements L3-A restent dans une branche distincte et les branches L1/L2 ne sont pas fusionnées. Revenir à la base `feat/vivre-ici-l2d-attribution-20261107` une fois les tests et captures inspectés. Une CI passée sur la cible `main` prouve le SHA testé, mais pas la sécurité d'une future opération de merge.


## Revue des captures L3-A v0 — collision UI détectée
- [P1A.6 #42376149573](https://github.com/hraaaaf/Akarfinder/actions/runs/42376149573) était SUCCESS, 31 captures, `findings=[]`, mais le contrôle géométrique initial ne couvrait pas les overlays : à 1280px « Quartier 2D » chevauche « Maroc » ; à 390px la mention limites administratives chevauche parfois le crédit MapLibre après rétraction. **Certification visuelle refusée malgré CI verte.**
- Correction V1 candidate : déplacer les boutons desktop sous la navigation et la mention mobile sous les crédits, sans masquer les attributions ; assertions `boundingBox` sur boutons/back et mention/crédits après ouverture/rétraction de la sheet ; BEFORE et AFTER aux mêmes 4 viewports obligatoires.
