# Vivre Ici / Maârif — J15 densité mobile QA (10/11/2026)

## Goal / Success / Proof
- Goal : alléger la carte mobile du statut OSM redondant en mode chargé, sans perdre l'attribution visible, les alertes de zoom/erreur ou l'accès clavier.
- Success technique : panneau OSM dupliqué réduit visuellement en état ready sur Maârif jusqu'à 1023px ; aria-live demeure dans DOM ; attribution OpenStreetMap/ODbL visible. Boutons de modes à 44px, sans chevauchement Maroc.
- Référence : SPEC canonique Notion Vivre Ici / Maârif, carte quartier dominante sans frontière inventée.

## BEFORE exact HEAD 1a2cd7f4d7cb97bfeebadde27666164247894b40
- Captures QA dev locale privées aux 390x844/430x932/768x900/1280x900 : C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110\j15-before. Les quatre PASS HTTP200/source/ODbL/0 erreur JS/0 overflow.
- 390x844 : carte 390x780, statut flottant 257,7x65,5 px à y414,5, crédits y493-528, modes y186-230, Maroc y118-162, fiche y619,6-768. Duplication des informations OSM.
- 430x932 : statut 257,7x65,5 px à y502,5 ; fiche repliée y707,6-856.

## Patch limité
- Nouveau CSS app/map/vivre-ici-j15-mobile-density.css, import dans page.tsx. Statut visuellement masqué 1x1px par clip-path seulement pour pilote Maârif en état ready sur <=1023px ; pas de display:none ni visibility:hidden. Zoom/error restent affichables. Status ARIA et données inchangés.
- Modes déplacés de y186 à y174 sur mobile/tablette ; fin du bouton Maroc à y162, séparation 12px. Aucun pack ou DB ajouté.

## AFTER — QA locale candidate
- Playwright Chromium layout 4/4 PASS aux mêmes 390/430/768/1280 ; HTTP200, MapLibre disponible, source OSM/ODbL visible, candidats 152/176/180/180, 0 erreur JS, 0 overflow.
- 390/430/768 : statut avant 257,7x65,5 -> après 1x1 et clip-path inset(50%). À 1280, statut conserve 261,7x69,5 et position initiale. Fiche et CTA inchangés.
- Captures/report AFTER privés : C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110\j15-after ; 4 tailles effectivement inspectées.
- Node 24/24 contrats PASS (8 pack + 4 host + 5 J11-C2 + 5 J12 + 2 J15). Playwright clavier régression 4/4 PASS aux mêmes quatre formats : sélection native Home/Flèche bas/Entrée, fiche OSM liée et aria-live, bouton de fermeture >=44 px sans overlap, select >=44 px, filtres Écoles 176→24→176 à 430, 0 erreur JS, 0 overflow. Captures/rapport privés dans j15-keyboard-after (montrée au demandeur).
- Ce lot ne prouve ni une navigation NVDA/VoiceOver réelle, ni débit CDN/mobile PROD, ni note >=9,5/10. Maârif central sans frontière certifiée.

## Gates
- Candidate seulement locale tant que diff/code/tests/clavier/CI HEAD final non vérifiés ; puis mise à jour PR/Notion.
- PR #1197 Draft, pas de merge, pas de Vercel, pas de DB produit ni tuiles QA publiées.

## J15 clôture CI exacte HEAD 06cd08d620bb8420486deb42f1a6f7721c484a97
- GitHub Actions : 29 workflows, 27 success / 2 skipped / 0 failure / 0 running, vérifiés le 10 novembre 2026.
- Playwright layout 4/4, clavier 4/4, Node 24/24, HTTP local 200, source OSM/ODbL et messages faible zoom préservés. Aucun pack privé ni screenshot en Git, checkout propre avant ouverture J16.
- Code/QA/CI J15 techniquement clos, mais NOT production release : score 9,5/10 et validation humaine non obtenus, frontière centrale non certifiée, lecteur d'écran réel et CDN non audités. Aucun merge/Vercel/DB.
