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


### Relance unique du contrôle final (provisoire)
Le HEAD `277570d6` corrige les deux collisions visibles sur L3-A, avec assertions géométriques et sans aucune donnée fictive. La PR Draft est retargetée temporairement `main` uniquement pour activer les Required/Responsive Gates prévus sur `pull_request: main` ; elle doit revenir sur base L2-D immédiatement après publication des preuves de la CI, sans merge.

### Centrage 2D desktop — correction candidate

L'artefact L3-A `6c2ffe8f` montre, au format 1280px, le repère Maârif presque collé au bord inférieur droit du canvas. **Cause vérifiée dans le code :** `NationalMapRouter` passe `desktopCameraOffset=[-0.0055,0.0090]` depuis la perspective 3D historique, et la caméra L3-A le réutilisait malgré `pitch=0`. Correction : sur Maârif uniquement, caméra réelle Quartier/Rue centrée sur le point canonique (aucun changement de ses coordonnées). Rabat/Agdal et autres villes gardent leurs offsets initiaux. P1A.6 doit désormais prouver sur 1280px un repère entre 20% et 80% de la hauteur de la carte, en plus de l'absence de chevauchement avec la navigation. Cette correction exige un screenshot AFTER pour preuve ; pas encore certifié.


## Correction d'architecture UI L3-A — fiche mobile étendue (07/11)

La P1A.6 [#42377509634](https://github.com/hraaaaf/Akarfinder/actions/runs/42377509634) (31 PNG) a échoué au viewport 430 après rétraction : `noteBox.y=272`, `providerBox.y=277.5` (1 finding). Les captures **montrent aussi un défaut réel en mode étendu** : sur 390px les crédits Esri/OSM flottent au niveau du bouton « Rue ». Le contrôle post-collapse lisait également une position intermédiaire avant que le panneau soit replié.

**Règle UX V2 :** lorsque la fiche contextuelle est ouverte sur ≤1023px, masquer les commandes Maârif (qui ne peuvent pas être utilisées pendant l'interaction avec la fiche), conserver les crédits fournisseurs visibles. Après fermeture, les commandes réapparaissent et Playwright attend la séparation géométrique après l'animation avant de statuer. **Ne jamais masquer les crédits fournisseurs**. Validation : P1A.6 31 PNG + 0 finding, captures et preuve manuelle 390/430/768/1280, RTL/mode source sans manipulation de DB.


## Closeout QA L3-A — 07/11/2026 (preuve acquise)

**Code exact testé :** `ea5e2256bba9b6f8e63477b1b29ef9a64883071f` (sans fusion, sans déploiement). Les corrections précédentes ont été conservées dans ce SHA : état 2D nord en haut, zoom Rue/retour Quartier réels, caméra centrée sur le point canonique, navigation « Maroc » non masquée, commandes de carte cachées en fiche ouverte, crédits OSM/Esri visibles, transition compacte contrôlée.

**SUCCESS / CI :**
- [P1A.6 #42378083553](https://github.com/hraaaaf/Akarfinder/actions/runs/42378083553) : **SUCCESS**, artefact **#13576143895**, `report.json` : `routes=4`, `viewports=["390","430","768","1280"]`, `screenshots=31`, `findings=[]`. Captures Maârif Quartier/Rue, fiche ouverte mobile/tablette, Rabat/Agdal et ville nationale.
- [Required PR Gate #42378083701](https://github.com/hraaaaf/Akarfinder/actions/runs/42378083701), [TypeScript / Baseline #42378083644](https://github.com/hraaaaf/Akarfinder/actions/runs/42378083644), [N3 #42378083596](https://github.com/hraaaaf/Akarfinder/actions/runs/42378083596), [Zillow #42378083525](https://github.com/hraaaaf/Akarfinder/actions/runs/42378083525), [CI Efficiency #42378083597](https://github.com/hraaaaf/Akarfinder/actions/runs/42378083597), [P1B.2 offline #42378083548](https://github.com/hraaaaf/Akarfinder/actions/runs/42378083548) : **SUCCESS**.
- Tous les workflows PR de ce SHA : **17 SUCCESS + 1 SKIPPED**, sans échec.

**AFTER inspecté manuellement :** comparaison avec [L2-D BEFORE #42375209714](https://github.com/hraaaaf/Akarfinder/actions/runs/42375209714) sur quatre viewports ; captures `map-casablanca-maarif-{390,430,768,1280}.png`, `map-casablanca-maarif-street-{390,430,768,1280}.png`, `map-casablanca-maarif-sheet-expanded-{390,430,768}.png`. Le repère Maârif desktop est recentré et les collisions détectées précédemment ne sont plus visibles. Sur fiche ouverte, crédits présents et commandes Quartier/Rue masquées.

**Appréciation visuelle manuelle : 8,5/10** (indicatif, non un audit UX indépendant, objectif cible 9,5/10 non atteint). Restent des annotations très petites et une valeur locale limitée sans POI récents. Ne pas considérer la conformité d'usage commercial d'Esri ou des licences de tuiles comme acquise.

**État du sous-lot :** **L3-A QA technique et visuelle exécutée**, pas L3 complet. Le mode limites administratives demeure **indisponible** (pas de contour publié : absence de source/périmètre revu), les POI périmés restent écartés et les prix réels non certifiés. La branche du sous-lot doit rester une PR Draft distincte, sur la base de L2-D, sans merge/DB/Vercel.

**NEXT exact :** L3-B = revue des sources SIG/sémantique arrondissement et stratégie de POI frais sans inventer de données ; si géométrie non qualifiée, conserver état indisponible. Puis L4 validation nationale 8 villes/17 quartiers, L5 Search (filtres/état vide/retour/4 viewports), L6 accessibilité/licence fournisseur/certification release. Rien n'est déployé en production.
