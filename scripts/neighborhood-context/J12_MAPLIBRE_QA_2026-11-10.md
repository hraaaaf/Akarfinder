# Vivre Ici / Maârif — J12 QA tactile, attribution et clavier (10/11/2026)

## Goal / Success / Proof
Goal : durcir la QA privée MapLibre sans inventer de frontière ni publier le pack national OSM.
Success observé : cibles tactiles >=44 px mobile/tablette, attribution contenue desktop, 4 viewports cohérents, filtres clavier utilisables, API QA bornée et sûre pour 3 villes.
Proof : rapports Playwright/Node privés et contrats GitHub, sur le checkout PR #1197. Les coordonnées de bboxes sont des fenêtres de TEST, jamais des périmètres administratifs.

## BEFORE
- J12 touch-audit local 390x844 : filtre Repères 60x31 px ; bouton de recentrage 40x40 px, non conformes à la cible produit de 44 px. Modes Maârif à 44 px.
- Capture J12 initiale 1280x900 : attribution MapLibre de très grande largeur en bas de carte, visuellement prolongée sous le rail Maârif.
- Référence produit : SPEC canonique Notion Vivre Ici / Maârif, trois modes, repères vrais, aucun tracé inventé.

## AFTER et vérifications
- Patch CSS `vivre-ici-j12-touch-targets.css`, import via `app/map/page.tsx` : touches filtres, controls et retour Maroc à 44 px sur <=1023 px. Tests privés aux 390x844, 430x932, 768x900 : aucun élément cible audité sous 44 px, pas de chevauchement filtre/retour.
- Patch CSS `l2d-attribution.css` : attribution MapLibre desktop bornée à 320 px, texte enveloppé, placée à l'intérieur de la carte et dégagée du contrôle de recentrage. Avant/après 1280x900 visuellement relus.
- Playwright J12 final après correction : **4/4 PASS** aux 390x844, 430x932, 768x900 et 1280x900 ; HTTP 200, repères OSM 152/176/180/180, source disponible, attribution OSM/ODbL, 0 erreur JS, 0 overflow. Sur 430 : Écoles 176→24, reset 176 ; Rue 14.6→17.1 ; Limites sans fausse frontière, puis retour Quartier.
- Navigation clavier J12 : **2/2 PASS** aux 390 et 1280 ; filtres avec role group / aria-pressed, activation Entrée puis reset, focus carte 3 px, label `Carte interactive de Maârif, Casablanca`, 0 JS error.
- API HTTP locale J12 : **9/9 PASS**. Casablanca, Rabat et Marrakech HTTP 200 (180 candidats maximum/requête), provenance OSM/ODbL et indicateur commercial non certifié. Requêtes invalides/large bbox/limit 1001 -> 400 ; Host et X-Forwarded-Host falsifiés -> 404 ; réponses privées no-store/noindex. Le premier essai spoof Host par fetch avait un défaut de harnais : refait avec HTTP brut et curl, refus réel confirmé. Les mesures HTTP sont en environnement local DEV uniquement, PAS des mesures réseau mobile/CDN ou PROD.

## Preuves privées (ne pas publier le pack)
Racine `C:\\Users\\lenovo\\Desktop\\AkarFinder-Vivre-Ici-QA-20261110` :
- BEFORE visuel : `j11c-final-qa/maarif-{390x844,430x932,768x900,1280x900}.png` ; BEFORE tactiles : `j12-touch-audit.json`.
- AFTER tactile : `j12-touch-after-report.json` et `j12-after-qa/rapport+captures`.
- AFTER attribution et régression 4 tailles : `j12-attribution-after-qa/report.json` et quatre captures.
- Tests API : `j12-multicity-report.json` ; clavier : `j12-a11y-report.json`. Les rapports et captures restent sur PC, aucune tuile QA en Git.
- Harnais échoué dû à l'encodage PowerShell archivé sous `j12-attribution-bad-encoding` ; résultat invalide, remplacé par un run UTF-8 vert.

## Réserves et décision
- **J12 partiel, pas une certification release** : chaque repère WebGL n'a pas d'équivalent accessible clavier/screen reader en liste ; l'API ne démontre ni débit prod ni cache CDN et limite les résultats à 180 par bbox. Les repères sont indicatifs et non certifiés pour ouverture/adhésion officielle à un quartier.
- Score visuel indicatif **~8/10**, pas de revendication >=9.5/10 ni d'acceptation humaine finale.
- Aucune modification Akarparser V3, DB produit, Vercel, publication de tuiles privées ou merge.

## Suite
J12-B : alternative clavier explicite pour sélectionner les repères + audit contrastes et réseau/rendu faible zoom sur 3 villes. J13 : closeout docs/PR/CI et cohérence Notion. J14 : gate humain avant merge ou release ; aucun déploiement Vercel sans accord explicite.
