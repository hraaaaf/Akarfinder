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
- **J12 partiel, pas une certification release** : la sélection de repères WebGL dispose désormais d’une alternative clavier en liste QA (J12-B), mais une certification lecteur d’écran réelle reste à faire ; l'API ne démontre ni débit prod ni cache CDN et limite les résultats à 180 par bbox. Les repères sont indicatifs et non certifiés pour ouverture/adhésion officielle à un quartier.
- Score visuel indicatif **~8/10**, pas de revendication >=9.5/10 ni d'acceptation humaine finale.
- Aucune modification Akarparser V3, DB produit, Vercel, publication de tuiles privées ou merge.

## Suite
J12-B : alternative clavier explicite pour sélectionner les repères + audit contrastes et réseau/rendu faible zoom sur 3 villes. J13 : closeout docs/PR/CI et cohérence Notion. J14 : gate humain avant merge ou release ; aucun déploiement Vercel sans accord explicite.

## J12-B — Alternative clavier OSM (10/11/2026)

**Goal** : donner un accès clavier non-WebGL aux 152–180 candidats OSM indicatifs de la vue, sans en certifier l'ouverture ou l'appartenance administrative.

**AFTER implementation** : liste HTML native select synchronisée aux filtres et à la fiche POI, au maximum 180 candidats, dévoilée uniquement au focus ; détail aria-live poli et bouton de fermeture 44 px, texte sans overlap. Code limité par QA_OSM_ENABLED, déjà réservé à la preview locale ; aucune promotion du pack privé.

**BEFORE** : aucune alternative clavier aux POI du canvas WebGL. Bouton fermer du détail initialement 27 px ; première bordure de select 2,85:1 contre blanc.

**Preuve AFTER** : Playwright Chromium 4/4 PASS sur 390×844 / 430×932 / 768×900 / 1280×900, navigation Home → Flèche bas → Entrée, sélection d'un vrai ID OSM, détail annoncé aria-live, options 153/177/181/181 dont option vide. À 430 : Écoles 25 options dont l'option vide, reset, fermeture fiche et remise à zéro de la sélection. Focus 3px, cibles du sélecteur et bouton fermer ≥44px, pas de chevauchement titre/fermeture, 0 erreur JavaScript, 0 overflow. Captures AFTER et report.json privés : C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110\j12b-keyboard-after. Captures montrées en conversation, aucun screenshot committé.

**Contrastes calculés à partir des couleurs CSS** : texte #071B33/blanc 17,30:1 ; focus #0B63CE/blanc 5,69:1 ; bordure corrigée #728BA3/blanc 3,54:1 (pas un audit WCAG complet).

**Contrats** : Node 22/22 PASS (8 pack + 4 sécurité Host + 5 J11-C2 + 5 J12). Limitations : NVDA/VoiceOver réel non exécuté ; débit réseau/CDN non qualifié ; limites Maârif central non certifiées. Score visuel indicatif ~8/10, pas 9,5/10.

**Gate** : PR Draft, sans merge/Vercel/DB. Vérifier faible zoom, pousser commit, CI exact HEAD, puis J13 closeout et J14 validation humaine.

### J12-B faible zoom — QA desktop locale (10/11/2026)

**Preuve** : à 1280×900, scroll molette depuis Maârif sur MapLibre, mode QA passe de ready (180 candidats) à zoom (0 candidat, sélection clavier retirée), aucun crash, aucune erreur JS ni overflow. Le recentrage revient à ready/180 et au zoom caméra affiché 14.6 après stabilisation. Rapport privé j12b-lowzoom-report.json et capture j12b-lowzoom-1280.png. 1/1 scénario PASS (après correction du harnais, qui avait d'abord ciblé des boutons dézoomer masqués et lu une caméra en animation). La vue élargie montre Casablanca et le littoral : ne pas interpréter cette capture comme une frontière administrative. La valeur data-l3-camera-zoom était temporairement inchangée après la molette ; le test ne la considère pas comme preuve instantanée de la caméra. Les 3 villes sont vérifiées côté API HTTP locale par la QA J12-A, pas comme rendus navigateurs multivilles.

**Next** : revue cohérence et commit J12-B, CI ciblée sur HEAD exact ; ensuite closeout J13 et gate J14 (humain pour publication).
