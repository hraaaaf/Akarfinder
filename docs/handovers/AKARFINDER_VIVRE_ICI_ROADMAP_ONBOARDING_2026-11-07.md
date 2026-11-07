# AkarFinder — Vivre Ici : onboarding et feuille de route V1
**Date du cadrage : 07/11/2026 · Statut : décisions produit validées 6/6 ; implémentation NON CERTIFIÉE · Repo : hraaaaf/Akarfinder · Référence main : `c0f172bc6755d769a3103051d90c2953f3215de2`**

> **Fichier canonique produit et roadmap.** Cette version fait foi pour les décisions prises pendant l'onboarding. Elle n'efface pas les preuves et réserves des études précédentes, notamment `3-vivre-ici-akarfinder.md`, la [spec pilote Maârif](https://app.notion.com/p/3f577c66336281d79f5dc46467df5f65), et l'[audit actuel](../reviews/VIVRE_ICI_CURRENT_MAIN_AUDIT_2026-11-06.md). Aucune mutation du produit ni autorisation de fusion/déploiement n'est comprise dans ce document.

## 1. Product brief — 6 décisions explicites du propriétaire

| Q | Décision validée | Implication non négociable |
| --- | --- | --- |
| 1 — Mission | **A+B+C, B au centre** : découvrir le Maroc → comprendre où habiter → consulter les biens | Vivre Ici n'est **pas** un deuxième `/search` |
| 2 — Cible | **Acheteurs et locataires**, familles et particuliers en premier | Le budget investisseur/ROI n'est pas une entrée V1 |
| 3 — Information | **Vie quotidienne > cadre de vie > immobilier** | Sources, proximité réelle et lisibilité avant métriques de marché |
| 4 — Interaction | **Carte dominante + fiche intelligente** | Desktop : rail latéral ; mobile : bottom sheet rétractable |
| 5 — Couverture | **Maroc entier exploratoire, quartiers pilotes détaillés** | **Maârif en premier** ; fail-closed lorsque données absentes |
| 6 — Tech | **B — Rationaliser et reconstruire sélectivement** | Garder les moteurs et modèles vérifiés ; retirer les promesses trompeuses et refaire uniquement les expériences insuffisantes |

**Promesse testable :** « Je comprends ce qui m'attend au quotidien dans un quartier, d'où proviennent ces informations, puis je peux chercher les biens disponibles là-bas. »

**Ordre de l'expérience :** `/map` national → région → ville → quartier → carte + fiche utile → bouton `Voir les biens` préfiltrant `/search`. Le visiteur peut revenir à n'importe quelle échelle. Le mot **« vérifié »** et les chiffres ne sont affichés que sur preuve réelle et datée.

**Hors scope V1 :** recommandation automatisée « meilleur quartier », scores de sécurité/criminalité sans source suffisante, rentabilité financière, comparateur multi-quartiers, agent IA de relocation, scraping non autorisé, couverture détaillée artificielle des quartiers marocains.

## 2. Architecture retenue

- **`/map` reste la route canonique** (navigation desktop/mobile). La section promotionnelle Home Vivre Ici supprimée par décision précédente **ne doit pas être réintroduite**.
- **Conserver l'approche par échelle** : moteur national `PremiumInteractiveMap`/topologie des régions et moteur local `MapLibreNeighborhood3D`. Ne pas forcer leur fusion technique sans mesure de gain. En revanche, **unifier** l'identité visuelle, le contrat d'état `city/district/layer`, les retours, le traitement des erreurs et les sources affichées.
- **Construire une seule fiche intelligente réutilisable**, alimentée par le read-model quartier existant et les données publiques sourcées : catégories **transports, écoles, commerces, santé, parcs**, couverture et provenance. 3 états de contenu : `verified` / `partial` / `unavailable` (labels UX français) ; ne pas afficher de quantité inventée, ni de temps/distances déduits d'un simple centre approximatif.
- **Maârif** est le pilote profond. Contrat existant à respecter : **vue quartier 2D par défaut**, **limites administratives** seulement si la géométrie **de l'arrondissement** est correctement attribuée et revue, **zoom rue + repères** sourcés ; retour et CTA Search.
- Le fichier `lib/geo/maarif-target-pilot-boundary.ts` dans la **branche candidate #1108** est `status: shadow-reference`, `reviewed:false`, `publicationStatus:"shadow"`. **Ce n'est ni une limite certifiée du quartier central, ni une autorisation de publication nationale.** Une revue SIG/source est un véritable *human gate* pour promouvoir la frontière ; si elle manque, mode « limites indisponibles / non certifiées », sans polygone fictif.
- Éviter la création de DB/schémas en V1 tant que le read-model existant suffit. Toute donnée issue de `useMapData()` étiquetée MOCK est **interdite** dans les métriques de décision publiques. Les fixtures de test peuvent rester isolées.

## 3. Matrice de décisions — GARDER / CODER OU AMÉLIORER / SUPPRIMER / ENVISAGER

| Catégorie | Décision concrète | Source/contrat | Priorité |
| --- | --- | --- | --- |
| **GARDER** | Route `/map`, entrée navigation « Vivre ici », URL sélection ville/quartier, retour Maroc | `app/map/page.tsx`, `lib/product-navigation.ts` | P0 |
| **GARDER** | Navigation nationale et hiérarchie régions→villes→quartiers, registre géographique, précision explicite | `PremiumInteractiveMap`, `NationalMapRouter`, dictionnaires territoriaux | P0 |
| **GARDER** | MapLibre local, empreintes et POI **réellement sourcés**, absence de faux pin exact, mode dégradé | `MapLibreNeighborhood3D`, `/api/geo/neighborhood-context` | P0 |
| **GARDER** | Passage à Search avec `city`/`district` effectivement sélectionnés ; un CTA clair | N3 #42295913806 PASS 390/1280 sur l'ancien HEAD ; à retester sur nouveau | P1 |
| **GARDER sous réserve** | Code expérimental utile de la [PR #1108](https://github.com/hraaaaf/Akarfinder/pull/1108) : vue 2D, bascule admin/retour, zoom rue et tests | PR #1108 DRAFT, HEAD `c5a9858` ; 11 fichiers, 6 gates carte historiques verts avant dernière doc | P1 |
| **CODER / AMÉLIORER** | Fiche contextuelle unique : en-tête quartier, **quotidien**, cadre de vie, couverture/source/date, CTA Search | Carte + rail desktop / sheet mobile | P1 |
| **CODER / AMÉLIORER** | Vue Maârif trois modes **vraiment actionnables** ; source du contour administrative revue et correctement libellée ; interactions claviers/touch | Spec Notion pilote 10/10/2026 ; PR #1108 source à **réconcilier**, pas fusionner brute | P1 |
| **CODER / AMÉLIORER** | Écrans mobile rétractables, aucun chevauchement carte/nav/CTA, boutons tactiles 44px par choix produit | 390/430/768/1280 ; focus visible, noms accessibles | P1 |
| **CODER / AMÉLIORER** | Afficher l'incertitude : « Informations indisponibles », provenance et couverture ; états chargement/erreur réseau | Pas de statistiques extrapolées, ni de fausses limites | **P0** |
| **CODER / AMÉLIORER** | Choix progressif des filtres POI pertinents, catégories appuyées par des données, légende et attribution lisibles | Écoles/transports/commerces/santé/parcs ; charges réseau mesurées | P1 |
| **SUPPRIMER de l'UI** | `priceRepere` et `landmarksVerified` MOCK présentés comme « prix » ou « repère vérifié », y compris Maârif (17 600 DH/m², 15 repères) | `PremiumInteractiveMap.useMapData()` : fixtures et libellés non réels | **P0** |
| **SUPPRIMER / REMPLACER** | Modes « Satellite » / « Quartiers » affichés comme boutons sans être actionnables (`<span>`) | `MapLibreNeighborhood3D` actuel | **P0/P1** |
| **SUPPRIMER de l'UI** | Textes de développement : « mock isolé », « aucun appel Supabase » ; ne pas masquer la **vraie** limite de preuve | Remplacer par couverture/provenance compréhensibles par l'usager | P1 |
| **SUPPRIMER après preuve** | Styles contradictoires/doublons dans les nombreuses feuilles `app/map/*.css` ; vieux workflows et affordances après inventaire | Ne supprimer aucune source de preuve ni contrat testé sans remplacement | P2 |
| **ENVISAGER V2** | Comparaison de 2 à 3 quartiers, critères personnels et listes de favoris de quartier | Après fiche Maârif source-vérifiée et tests d'usage | P2 |
| **ENVISAGER V2** | Exploration guidée « quel quartier me convient ? », trajets quotidiens, temps de transport | Exiger véritable routing provider, méthode/droits et données fiables | P2 |
| **ENVISAGER V2+** | Données de marché plus fines, tendances temporelles, qualité de vie enrichie | Sources datées, droits, couverture et taille d'échantillon réellement suffisants | P3 |

**Clarification :** SUPPRIMER = supprimer de l'**interface de décision**, pas effacer brutalement les mocks nécessaires aux tests, les artefacts audités, ni les branches historiques. Les modifications de données, géométries ou droits sont **fail-closed**.

## 4. Roadmap exécutable — ordre des dépendances, statuts et critères

Les lots ne sont **pas considérés terminés** par leur simple existence en code. La preuve concerne toujours le **HEAD candidat exact**, pas une branche historique. Ne pas attribuer de pourcentage d'avancement de l'implémentation tant que les lots ne sont pas certifiés.

### L0 — BASELINE réelle et inventaire, avant toute modification produit — P0

#### L0 checkpoint 07/11/2026 — PREUVE FONCTIONNELLE PARTIELLE

Les 8 blobs Git comparés entre `main@c0f172bc6755d769a3103051d90c2953f3215de2` et candidat PR #1147 `9e1bb3906cc4b60c4c67c6a42ad6256776fe8402` sont strictement identiques. Le [run N3 #42305126064](https://github.com/hraaaaf/Akarfinder/actions/runs/42305126064) est SUCCESS, artefact #13546331975 inspecté : `report.json` `ok=true`, 390/1280 Maroc→Casablanca→Maârif→Search, `overflow=0`. **Pas une seule image dans l'artefact.** Revue `main` 430/768, 3 vues et captures visuelles **restent à faire**. Détails, preuves et blocage workflow_dispatch dans `docs/reviews/VIVRE_ICI_L0_BASELINE_2026-11-07.md`. Aucun contournement CI, aucun Vercel. **L0 NON CLOS**.


- **Goal :** capturer et inventorier le Vivre Ici de `main` aux états national, région, ville, Maârif, retour et Search.
- **Success :** 4 viewports **390×844 / 430×932 / 768×900 / 1280×900**, captures visuelles **BEFORE affichées au propriétaire**, bilan console/HTTP, contrôles carte, interaction clavier/touch, historique CSS et PR #1090/#1108 catalogués sans remerge.
- **Proof :** URL run GitHub + HEAD exact + screenshot(s) inspectés + rapport JSON + liste écarts; comparer au mockup Notion 3 écrans. **Aucun screenshot current-main encore produit dans cet onboarding.**
- **Next :** utiliser le workflow existant `vivre-ici-after.yml` en `workflow_dispatch` sur **main** (runs local Next/Playwright, pas Vercel) pour 8 images national/N3 ; compléter avec nouveau harness interactif 3 vues.
- **Gate :** absence d'accès au déclenchement `workflow_dispatch` dans le connecteur actuel : demande d'un run GitHub Actions lancé par propriétaire ou autre runner de code approuvé (pas production).

### L1 — Vérité des données et gouvernance des sources — P0, bloquant

- **Goal :** ne diffuser aucun fait chiffré ou géométrique non vérifié ; verrouiller les droits des données/maps/images.
- **Success :** **0** prix/nombre de repères fictif présenté comme vérifié ; 100 % des faits affichés reliés à une source identifiable, statut de couverture, date/méthode si pertinent ; données absentes → état honnête ; jamais de centroïde transformé en limite exacte.
- **Proof :** contrats unitaires négatifs `MOCK_NOT_PUBLIC`, vérification de toutes les fiches d'exemple, test du read-model `verified/partial/unavailable`, revue juridique source OSM/ODbL/imagerie Esri/OpenFreeMap avant publication.
- **Décision :** correction P0 du rendu, **sans** `npm audit fix --force`, `DB write` ou transfert indiscriminé des sources shadow.

### L2 — Information architecture / mockup carte + fiche — P1
#### L2 — 07/11/2026 : cible UX concrète AVANT code

La [cible UX pré-implémentation](../reviews/VIVRE_ICI_L2_UX_TARGET_2026-11-07.md) est rédigée depuis l'onboarding 6/6 et les captures [L0 #98](https://github.com/hraaaaf/Akarfinder/actions/runs/42320980541) / [L1 #42358643944](https://github.com/hraaaaf/Akarfinder/actions/runs/42358643944). Wireframes desktop carte ~65% / fiche ~35%, mobile carte dominante + fiche vraiment repliable cible ≤160px (CTA ≥44px). Quatre sous-lots : L2-A **retirer `neighborhoodPolygon(index)` faux contours** au profit de carte ponctuelle sourcée + liste ; L2-B fiche « Quotidien → Cadre de vie → Biens » ; L2-C bottom sheet réelle, clavier/ARIA ; L2-D contrôles/crédits. Les 3 vues Maârif et frontière SIG sont L3. **Ce document est un mockup fonctionnel de référence, pas un design validé par captures AFTER ni une permission de modifier la production.**


- **Goal :** une interface où l'on voit toujours la carte et comprend d'un coup ce qu'apporte la fiche.
- **Success :** prototype approuvé en desktop carte + rail et mobile carte + bottom sheet **repliée ≤160px** (cible historique à contrôler), sections « Quotidien », « Cadre de vie », « Biens », source/état ; **vrais** contrôles et CTA ≥44px ; retour intuitif.
- **Proof :** BEFORE → GOAL écrit → mockup cible → revue UX sur 4 viewports + conformité navigation clavier/voix ; comparer aux références de la section 6. **Pas d'implémentation UI avant mockup/référence.**
- **Gate :** choix visuel suffisamment distinct du modèle antérieur : faire valider si changement stratégique de direction ; sinon conserver l'identité navy C1 `#071B33` et bleu C2 `#0B63CE`.

### L3 — Maârif pilote, trois modes et POI réels — P1

- **Goal :** livrer la valeur locale profondément utile en limitant le risque SIG.
- **Success :** (a) vue quartier 2D (nord en haut) par défaut ; (b) « Voir limites administratives » à action réelle et retour, uniquement **arrondissement sourcé et revu** sinon état non disponible ; (c) zoom rue avec POI sourcés et filtrage réel ; même fiche intelligente entre les 3 modes.
- **Proof :** comparer `main` vs PR #1108 au fichier, reprendre sélectivement les fonctionnalités pertinentes et tests sans écraser navigation actuelle ; CI multi-ville, POI, Rue, N3, tests géométrie/sémantique, screenshot **BEFORE/AFTER pour chaque mode × 4 viewports**, zéro contrôle décoratif/claim fictif.
- **Gate :** promotion d'une géométrie `shadow/reviewed:false` nécessite **revue explicite de la source/périmètre**, pas un simple changement de booléen.

### L4 — Réutilisation nationale progressive, sans dupliquer l'interface — P1

- **Goal :** rendre la découverte Maroc → région → ville → quartier stable et extensible, sans feindre la profondeur de la donnée.
- **Success :** les quartiers du registre ayant un centre réellement sourcé peuvent afficher une fiche selon leur couverture ; pour ceux sans preuve géographique, **pas de pin inventé** ; navigation et retour aux échelles passés sur 4 viewports ; pas de régression des 8 villes/17 quartiers historiquement couverts dans #1108.
- **Proof :** tests API/dictionnaires, 4 viewport screenshots, tests de changement ville et de fallback ; comparaison 68 scénarios historiques de #1108 **comme référence, pas validation du HEAD courant**.
- **Décision :** privilégier les **données/configurations** pour ajouter des villes plutôt que copier le JSX par ville.

### L5 — Passage Search net et sans duplication — P1

- **Goal :** transformer la compréhension d'un quartier en recherche immobilière actionnable.
- **Success :** un CTA « Voir les biens à … » ouvre `/search` avec ville/quartier corrects et état conservé ; 0 annonce à géolocalisation exacte inventée ; fallback si aucune annonce ; retour cohérent.
- **Proof :** Playwright Maroc → ville → Maârif → Search et autres villes, captures et assertions URL/résultats ; keyboard/touch, notamment CTA au-dessus de la sheet sur petit écran.

### L6 — Certification transversale & release gate — P0 clôture

- **Goal :** valider une expérience utile, rapide, fiable, accessible, et réellement fidèle à la vision validée.
- **Success :** 0 erreurs blocantes, 0 overflow, aucun bouton factice, 0 fausse preuve immobilière, aucun CTA masqué, focus clavier visible, labels lisibles, map/sheet stables ; revue visuelle indépendante cible **≥9,5/10** (objectif de la spec, pas score obtenu).
- **Proof :** build/types/tests utiles, required GitHub Actions **`gate` SUCCESS** sur le SHA exact, rapports Playwright et screenshots **AFTER sur les mêmes fixtures et viewports que BEFORE**, comparaison annotée, 2 avis UX/tech si possible ; vérification fournisseur/cartes/licence.
- **Gate humain :** **merge GitHub** seulement autorisation explicite spécifique si requis par le chantier ; **Vercel** : interdiction absolue de déployer sans approbation distincte. `vercel.mjs` maintient `git.deploymentEnabled:false`. Aucune production DB modifiée par les lots précédents.

**Ordre exécutable :** L0 → L1 → L2 → L3 → L4 → L5 → L6. Si données/admin non publiables, réaliser les UI **en mode source indisponible** et ne pas falsifier la preuve pour débloquer artificiellement la roadmap.

## 5. Réemploi des PR : politique anti-régression

| PR | État vérifié lors du cadrage | Décision |
| --- | --- | --- |
| [#1174](https://github.com/hraaaaf/Akarfinder/pull/1174) | DRAFT, docs-only audit `/map` | **Support du présent cadrage et audit**, aucun merge sans nouveau gate/aval |
| [#1108](https://github.com/hraaaaf/Akarfinder/pull/1108) | DRAFT, base sur une branche et non sur `main`, 11 fichiers ; 6 CI cartographiques historiques SUCCESS au HEAD applicatif `dcece3c` | **Réutilisation sélective candidate**, revoir chaque composant/test sur `main` actuel et vérifier exigences réelles, source admin shadow |
| [#1090](https://github.com/hraaaaf/Akarfinder/pull/1090) | DRAFT, `mergeable:false`, 54 fichiers modifiés | **Référence de recherche / source**, ne pas merger brutalement |

**Interdictions :** pas de `main` direct, pas de fermeture d'une PR sans examen de son code/proof, pas de Vercel, pas de données shadow prétendument validées, pas de suppression de la barrière required `gate`.

## 6. Références externes et décisions concrètes

- [NN/g — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) : informations essentielles immédiatement, détails secondaires dans la fiche dépliée, pas dix onglets/commandes visibles simultanément.
- [GOV.UK Design System — Tabs](https://design-system.service.gov.uk/components/tabs/) : éviter les onglets si l'utilisateur doit comparer des informations ou risque de ne pas découvrir le contenu masqué ; pour Maârif, privilégier une fiche hiérarchisée et des **modes de carte explicites** plutôt que des onglets qui ressemblent à des contrôles factices.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) : vérifier **2.5.8** (cibles ≥24px ou exception d'espacement), **2.4.11** focus non entièrement masqué, **2.5.7** fonctions accessibles sans drag obligatoire. **44px** est la **cible UX interne retenue** pour les CTA/touch, pas un seuil de conformité WCAG 2.5.8.
- [MapLibre GL JS — MapOptions](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/) : `attributionControl:false` masque le contrôle par défaut ; vérifier l'attribution effectivement visible et les licences fournisseurs avant publication.

Ces références orientent le travail et **ne prouvent pas** la conformité du code actuel.

## 7. Statut / prochaine action / closeout

- **Onboarding : 6/6 VALIDÉ**, exprimé explicitement par l'utilisateur.
- **Roadmap : proposée/codifiée dans cette PR**, pas encore fusionnée.
- **Audit technique : P0 mock + parcours Maârif non conforme sur `main`** ; les tests N3 390/1280 historiquement verts ne remplacent ni une capture actuelle ni 3 modes.
- **Implémentation V1 : non certifiée, aucun avancement global % déclaré.**
- **Next exact :** établir **L0 BEFORE** sur `main` via GitHub Actions `Vivre Ici AFTER Certification` (`workflow_dispatch`) ou runner local équivalent approuvé ; récupérer les 8 images / rapport ; inspecter et montrer toutes les captures ; confronter au mockup 3 vues ; préparer les correctifs L1/P0 et le réemploi sélectif #1108.
- **Séquence restante :** BEFORE → source/mocks P0 → cible UX carte+fiche → Maârif trois vues → national/fallback → passage Search → AFTER/QAs → vraie CI `gate` → autorisation fusion → post-merge → closeout → **déploiement Vercel seulement sur nouveau feu vert explicite**.

**Fichier canonique : `docs/handovers/AKARFINDER_VIVRE_ICI_ROADMAP_ONBOARDING_2026-11-07.md`.**


#### L0 — 07/11/2026 : preuve de capture main ACQUISE

Le bon run manuel [Vivre Ici AFTER Certification #98](https://github.com/hraaaaf/Akarfinder/actions/runs/42320980541) est **`workflow_dispatch` / main@c0f172bc6755d769a3103051d90c2953f3215de2 / completed SUCCESS** (run #42320980541). L'artefact **#13553704238** téléchargé contient **12 captures PNG** (national 4, zoom 4, Maârif 4) + `summary.json` : **8/8 scénarios HTTP 200**, zéro overflow horizontal, zéro page error, zéro requête Supabase, région national `ready` et Maârif `maplibreReady:true`. **Alerte produit** : `anchorCount:0` dans les quatre vues Maârif ; pas de contenu de vie quotidienne dans la fiche, vue nationale à recadrer, présence de mock, trois modes Maârif non certifiés. L0 visuel BEFORE établi, **L0 interactions et sources restent à terminer**. Le précédent blocage « workflow_dispatch non lancé » est levé ; **ne plus demander à l'utilisateur de relancer le run #98**. Détails dans `docs/reviews/VIVRE_ICI_L0_BASELINE_2026-11-07.md`. Aucun Vercel.


### Checkpoint 07/11/2026 — L0 interaction et L1 P0 ouverte

- L0 audit source / interactions sur `main@c0f172b` : POI `anchorCount=0` causé par seed ANN-L5 du 16/08/2026 expirée au bout de 30 jours (code `certified-seed.ts` + `poi-registry.ts` + filtrage `read-model.ts`). Ne pas prolonger le TTL ; envisager nouvelle acquisition autorisée et horodatée.
- `MapLibreNeighborhood3D` expose badges de mode non actionnables ; CSS `target-alignment.css` masque les boutons zoom ; poignée de fiche `p4-sheet-handle` statique ; national `neighborhoodPolygon` géométrie schématique non réelle ; attribution sous `attributionControl:false` à auditer. Navigation clavier/touch directe non encore exécutée.
- L1 **implémentation candidate** : [PR #1175](https://github.com/hraaaaf/Akarfinder/pull/1175), DRAFT, `79b75e2a7ab6008fdcf7182172f397f9550d0153` : retrait de 45 stats `MOCK` et de leur rendu public, état indisponible explicite, message POI périmés. Aucun merge Vercel/DB ; CI/AFTER non acquis à la rédaction.
- **Next exact** : vérifier CI PR #1175, exécuter `scripts/audits/vivre-ici-l1-truth-contract.mjs`, produire captures AFTER des 4 viewports (et **drilldown ville/maquette**, non présent dans L0 national simple), comparer avec BEFORE ; blocages P0 géométrie/POI droits restent ouverts, ne pas prétendre à une V1 validée.


### 07/11/2026 — L1 candidate : preuves techniques et tests visuels en cours

- La [PR #1175](https://github.com/hraaaaf/Akarfinder/pull/1175) **DRAFT/non mergée**, branche `fix/vivre-ici-l1-fail-closed-20261107`, HEAD `8d14eeb18bc131e11aa7f1b7064c5d3ab67aab01`, vise à **supprimer 45 stats mock** du moteur national (prix, « repères vérifiés », badges de disponibilité) et à signaler sans ambiguïté l'absence de repères récents. Les règles source/TTL/DB restent inchangées. Une suite `scripts/audits/vivre-ici-l1-truth-contract.mjs` est importée par la véritable suite required `gate`.
- CI **gate** HEAD intermédiaire [#42357184685](https://github.com/hraaaaf/Akarfinder/actions/runs/42357184685) **SUCCESS**, logs : 3 nouveaux tests de vérité PASS + TypeScript PASS. Sur actuel HEAD `8d14eeb`, [#42358270810](https://github.com/hraaaaf/Akarfinder/actions/runs/42358270810) **SUCCESS**.
- Ancienne CI P1A.6 sur HEAD `7034ccf` [#42357184686](https://github.com/hraaaaf/Akarfinder/actions/runs/42357184686) 12 findings = 3 attentes **obsolètes** (canvas MapLibre, global national MapLibre, appel API national) × 4 viewports. Le harness corrigé sur `3571d60` exige **SVG TopoJSON prêt + 12 régions + 12 boutons** sur `/map`, tout en conservant les tests du moteur MapLibre ville/quartier ; [#42357749536](https://github.com/hraaaaf/Akarfinder/actions/runs/42357749536) **SUCCESS**, 12 captures `report.findings=[]`. Toutes les captures BEFORE exact main #98 ont leurs équivalents nationaux après sur **390/430/768×900/1280**, faible variation pixel attendue ; ce contrôle national initial ne prouve pas l'ancien drilldown, absent du BEFORE.
- Le script P1A.6 a été étendu sur dernier HEAD `8d14eeb` pour tester réellement **région Casablanca-Settat → Casablanca → Maârif** depuis la page nationale et le rail Maârif direct sur 4 viewports ; attend **20 captures** dont 4 drilldown, l'état `data-local-evidence="unavailable"` et l'absence de chiffres fictifs. [Run #42358270779](https://github.com/hraaaaf/Akarfinder/actions/runs/42358270779) `in_progress` au premier relevé : **NE PAS déclarer ce test passé**.
- P1B.2 sur HEAD précédent **FAIL** car l'API prix retournait 503 en conséquence d'un DNS Supabase ENOTFOUND dans les logs ; ce problème **n'est pas réparé par le correctif UI**, et l'issue du run actuel reste à vérifier.
- **Prochain geste** : vérifier conclusion du run exact P1A.6 étendu, récupérer/inspecter/montrer les 20 captures, corriger le test ou le code si défaut prouvé ; ensuite comparer au mockup 3 vues, tester clavier/mobile, préparer L2. **No merge, no DB, no Vercel**. Le moteur national conserve des polygones SCHÉMATIQUES que L2 doit remplacer/clarifier ; la géométrie Maârif shadow non certifiée ne peut pas être publiée en force.

*Ce checkpoint est une preuve de progrès L0/L1, pas le closeout de Vivre Ici, ni une certification des 3 modes, des POI actifs, ou d'une UX ≥9,5.*


## 07/11/2026 — REPRISE CANONIQUE : L4-A API 8/8 + L5-B GREEN ; L4-B / L6 ouverts

**Règles permanentes :** travaux sur branches/PR distinctes, ne jamais fusionner/déployer Vercel sans autorisation explicite. Aucune mutation/activation DB cloud. Ne pas fabriquer de contour administratif, POI, annonces, distances ou prix. Pour preuve, citer code exact, run CI, rapport, captures inspectées. P1B.2 tests `offline` ne certifient pas les prix réels (legacy Supabase INACTIVE/HTTP 503).

### Lots et preuves exactes
- **L1 #1175, L2-A #1177, L2-B #1178, L2-C #1179, L2-D #1180** : PR non mergées, code/test de sécurité géographique et UX source comme documentés dans leurs fichiers de sous-lot. L2-D SHA `e752e793`, [P1A.6 #42375209714](https://github.com/hraaaaf/Akarfinder/actions/runs/42375209714) : 27 captures, zéro finding ; droits fournisseurs distincts de validation technique.
- **L3-A #1181 DRAFT**, base L2-D, SHA code `ea5e2256`, docs HEAD `9ab4cdd5` : Maârif nord en haut, vraie caméra 2D Quartier→Rue→Quartier, carte recentrée, sheet réactive, crédits visibles. [P1A.6 #42378083553](https://github.com/hraaaaf/Akarfinder/actions/runs/42378083553), 31 captures, `findings=[]`, Required/N3/TS verts, revue visuelle ~8,5/10 indicative. Canonique : `docs/reviews/VIVRE_ICI_L3A_MAARIF_2D_STREET_2026-11-07.md`. **Pas de contour Maârif publié**.
- **L3-B #1182 DRAFT**, base L3-A, SHA test `d5d800fc`, docs HEAD `73ea2e9b` : source Maârif OSM relation `2801474` = arrondissement `admin_level=10`, `shadow/reviewed=false` ; seed POI observée 16 août expirée (30j). [P1A.6 #42384180778](https://github.com/hraaaaf/Akarfinder/actions/runs/42384180778) 27 tests PASS + 31 captures zéro finding. Canonique : `docs/reviews/VIVRE_ICI_L3B_SOURCE_GATE_2026-11-07.md`. **L3 complet non certifié : source contour et POI frais absents**.
- **L4-A #1183 DRAFT — couverture API 8/8 TECHNIQUEMENT CERTIFIÉE** : code testé `ce8442dbaf3d4754d0a3117df1d67250e30d3d80`, docs-only HEAD `145a5cfd9e50b04b8557d9a4014b6eaa4c781571`. Inventaire V5 décompressé (341 places) source `mohammadia` (centre -7.389329/33.695838, 214 quartiers annoncés), alors que l'API demandait `mohammedia` : erreur alias exacte, corrigée par une table `mohammedia→mohammadia` sans modifier V5. N2 vérifie payload alias=canonique, inventaire non vide, quartiers à source déclarée, 0 contours quartier certifiés. [N2 #42398790927](https://github.com/hraaaaf/Akarfinder/actions/runs/42398790927) **SUCCESS** et [N3 #42398790936](https://github.com/hraaaaf/Akarfinder/actions/runs/42398790936) **SUCCESS** ; artefact N2 #13584925329, `report.ok=true`, 8/8 API : **4914 quartiers, 347 centres sourcés déclarés, 4567 sans centre, 0 polygone quartier certifié**. Mohammedia **214 quartiers / 5 centres / 209 sans centre**. **12 captures Casablanca uniquement** sur 390/430/768/1280 inspectées, `overflow=0`, `fakeFill=false`, lien Search cohérent. L4 total NON certifié : L4-B UX Mohammedia et 7 autres villes/17 quartiers encore à tester, ne pas mélanger avec 8/8 API. Document `docs/reviews/VIVRE_ICI_L4A_MULTICITY_SOURCE_GATE_2026-11-07.md`. PR non mergée.
- **L5-A #1184 DRAFT**, base L3-A, SHA testé `8a71b4b7`, docs HEAD `e6bfbae0` : [N3 #42389185818](https://github.com/hraaaaf/Akarfinder/actions/runs/42389185818) **SUCCESS**, artefact #13580434829. Rapport 390/430/768/1280 : Map→Search `Casablanca/Maârif` réellement actifs, retour navigateur vers Maârif avec source MapLibre `available`/bâtiments rendus, 8 captures AFTER inspectées, `overflow=0`; total 31 SUCCESS/1 SKIPPED sur code exact. En CI Search affiche « 0 résultat » : **cela ne certifie pas l'inventaire réel**. Canonique : `docs/reviews/VIVRE_ICI_L5A_SEARCH_CONTINUITY_2026-11-07.md`.
- **L5-B #1185 DRAFT — sous-lot technique CERTIFIÉ** : code réellement testé `5863999876ca6496a86ea77662181b5e5e79b6bb`, doc-only HEAD `0706fab15fe0f61a30217515cb627a42d5be6932`, [N3 #42397029558](https://github.com/hraaaaf/Akarfinder/actions/runs/42397029558) **SUCCESS**, artefact #13583289063 (rapport N3 + `l5b/report.json` tous deux `ok=true`). Deux tests de conservation géographique ville/quartier + cache PASS ; vrai endpoint gateway Maârif `district_requires_structured_search`, 0 results/0 sources, aucun élargissement ville. Parcours N3 4/4 viewports et fixture Search vide/réinitialisation 4/4, 8 captures inspectées, `propertyCards=0`, `overflow=0`, `failure=null`, zéro erreur React #418. Cause corrigée : `SearchMapNeighborhoodDock` et `SearchPriceExplorerDock` initialisaient `useState(readCanonicalSearch)` côté SSR vide mais avec URL Casablanca/Maârif côté navigateur ; état initial désormais stable `""`, URL synchronisée en `useEffect`. P1A.6, Required, CI Efficiency, Baseline Compile **SUCCESS** sur code SHA exact. Score visuel indicatif ~8,5/10 ; **pas** certification produit 9,5/10. PR #1185 base RESTAURÉE sur `test/vivre-ici-l5a-search-continuity-20261107`, non mergée, diff limité à six fichiers ; document `docs/reviews/VIVRE_ICI_L5B_SEARCH_EMPTY_FIXTURE_2026-11-07.md`. **Détails non certifiés :** 4 tests Search historiques hors pattern en échec (dette), données SQL réelles et inventaire indisponibles.

### L6 sources et human gates
- [OpenFreeMap officiel](https://openfreemap.org/) autorise l'usage commercial, mais impose attribution visible (OpenMapTiles + OpenStreetMap) et n'offre pas de SLA ; contrôles de crédits au sein de MapLibre à revalider.
- [Conditions Esri](https://www.esri.com/en-us/legal/terms/web-site-service) : tuiles World Imagery publiques != permission commerciale ; licence et crédits fournisseurs requis, sinon **remplacer la source**, jamais déployer sous hypothèse.
- Legacy Supabase source prix inactive / HTTP 503 : prix, inventaire de biens et filtrage SQL réels non certifiés. Aucun produit 9,5/10 officiellement atteint.

### Next exact / séquence restante
1. **L5-B closeout accompli (sans merge)** : N3 #42397029558 SUCCESS, artefact N3 + L5-B inspecté, 8 captures comparées, document canonique et PR Draft retargetée ; code testé `58639998`, docs HEAD `0706fab1`. Passer au vrai prochain bloqueur L4/L6, sans rouvrir le lot vert sauf nouvelle régression.
2. **Next exact L4-B** : avec L4-A API 8/8 maintenant GREEN, auditer navigation réelle 8 villes / 17 quartiers (dont Mohammedia) sur 390/430/768/1280 ; BEFORE → vérification de la source de chaque label/centre → correction minimale → AFTER + rapport et score. Attention : ancien `PremiumInteractiveMap` contient des quartiers illustratifs codés en dur ; ne pas les présenter comme inventaire V5 validé. Aucun ajout fictif de coordonnées ou contour. Source quartier officiel / POI toujours non certifiés.
3. **L5 / L6** : isoler et corriger les 4 tests Search historiques périmés sans travestir le contrat ; pour la vérité des annonces, attendre une source SQL vivante et autorisée ; vérifier accessibilité clavier/mobile, crédits OpenMapTiles/OSM, licence satellite Esri ou fournisseur autorisé, audits BEFORE/AFTER 4 viewports, seuil visuel final ≥9,5/10 si démontré. Aucun déploiement Vercel sans autorisation explicite.
4. Git/merge/post-merge/closeout seulement si explicitement autorisés. Toutes les PR ici sont non mergées ; roadmap totale et % non certifiés.

**Source vivante externe :** [Notion Akarfinder Command Center](https://app.notion.com/p/3df77c663362816d8678c28ad6a49bcf?pvs=204). Cette section remplace l'ancien checkpoint L1 « CI en cours » comme état de reprise, sans supprimer l'historique.


## 07/11/2026 — L4-B1 Mohammedia overlay (en cours, pas certifié)

Après [L4-A API N2 #42398790927 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42398790927), un **second défaut client** a été détecté : `NationalNeighborhoodOverlayBridge` rejetait le payload source V5 `place.slug=mohammadia` lorsque la route navigateur passait `city=mohammedia`. L'API fournissait bien 214 labels et 5 centres, mais l'UI n'affichait pas l'overlay de recherche de quartiers.

- **Nouveau lot/PR Draft** [#1186](https://github.com/hraaaaf/Akarfinder/pull/1186), branche `test/vivre-ici-l4b-mohammedia-overlay-20261107` **base L4-A**. Test E2E Mohammedia 390/430/768/1280 + sélection d'un label sourcé, dans workflow N2 existant, aucune modification `.github/workflows`.
- **BEFORE** : SHA `e0330f30`, [N2 #42399721190](https://github.com/hraaaaf/Akarfinder/actions/runs/42399721190) annulé automatiquement lors d'un nouveau push ; artefact #13585326427 conservant **une capture 390 px seulement**, examinée : vue de la ville correcte, **champ quartier absent** malgré compteur 214. Les captures BEFORE 430/768/1280 **NE SONT PAS acquises**.
- **Correctif candidat** SHA [`a6ead3d4`](https://github.com/hraaaaf/Akarfinder/commit/a6ead3d46d3656e03bbb730f4ad709c80e8716e3) : seul `mohammedia` peut accepter la réponse canonique V5 `mohammadia`; aucune source de quartiers ni géométrie créée. [N2 AFTER #42399951940](https://github.com/hraaaaf/Akarfinder/actions/runs/42399951940) **non conclu à la dernière lecture** : L4-B1 reste non certifié.
- **Risque Search/noms** : V5 présente le nom `Mohammadia`, le [HCP](https://www.hcp.ma/reg-casablanca/RGPH-2024-Caracteristiques-demographiques-et-socio-economiques-de-la-Population-Fiches-communales-de-la-region_a144.html) et `geo-entity-registry` `Mohammedia` ; liaison Carte→Search doit être testée explicitement, sans assimiler les libellés V5 non qualifiés à 17 quartiers validés.
- **Next exact** : lire AFTER N2, `l4b/report.json` et les 4 captures, corriger les défaillances ; ensuite documenter limite BEFORE, séparer L4-B complet 8 villes/17 quartiers et L6 licences. Aucun merge, DB ou déploiement Vercel.


## 07/11/2026 — JALONS VÉRIFIÉS APRÈS L4-A 8/8 (remplace les statuts L4-A anciens ci-dessus)

| Jalon | État borné par la preuve |
| --- | --- |
| **L1** | GREEN technique : fail-closed et retrait des sources fictives |
| **L2** | GREEN technique : carte responsive, attributions présentes ; droits fournisseur restent L6 |
| **L3-A** | GREEN Maârif 2D/rue techniquement ; **L3 entier AMBER**, contours et POI frais absents |
| **L4-A** | **GREEN, 8/8 villes API** : code testé `ce8442dbaf3d4754d0a3117df1d67250e30d3d80`, [N2 #42398790927](https://github.com/hraaaaf/Akarfinder/actions/runs/42398790927) SUCCESS + [N3 #42398790936](https://github.com/hraaaaf/Akarfinder/actions/runs/42398790936) SUCCESS ; artefact N2 #13584925329 inspecté : `ok=true`, 8/8 couvertes, **4914 quartiers**, **347 centres**, **4567 sans centre**, **0 contour quartier certifié**, 4 cas Casablanca et 12 captures aux 4 viewports. Mohammedia (214 quartiers, 5 centres) reconnue par alias vers l'entrée V5 existante `mohammadia`; aucune donnée ajoutée. [Doc review closeout](https://github.com/hraaaaf/Akarfinder/blob/test/vivre-ici-l4a-multicity-source-20261107/docs/reviews/VIVRE_ICI_L4A_MULTICITY_SOURCE_GATE_2026-11-07.md) docs-only HEAD `3de97ec8`; [PR #1183](https://github.com/hraaaaf/Akarfinder/pull/1183) toujours Draft/unmerged. |
| **L4-B** | **NON certifié** : expérience utilisateur 8 villes/17 quartiers et captures hors Casablanca à faire |
| **L5-A / L5-B** | **GREEN technique** : N3/Search et état vide, hydrate React corrigé ; vraies annonces SQL/prix **non certifiés**. [PR Draft #1185](https://github.com/hraaaaf/Akarfinder/pull/1185) base L5-A, code testé `58639998`, N3 #42397029558 GREEN, 8 captures L5-B |
| **L6** | **NON certifié** : licences Esri, attribution OpenMapTiles/OSM, accès clavier/touch, score visuel global ≥9,5/10 et gate release |

**Next exact :** L4-B, contrôle UI 8 villes et sélection quartier sourcée, 390/430/768/1280, zéro contour/POI inventé ; puis L6 droits/cartographie, a11y et score, avec annonces réelles seulement si une DB autorisée est disponible. PR Draft et aucun merge ni déploiement Vercel sans approbation. **Aucun pourcentage global certifié.**


## 07/11/2026 — L4-B GREEN technique ; grille 8 villes validée comme maquette de preuve

- **L4-B certifié techniquement sur code exact `5e2e826eb4609df9cac08eb52a94ea23eac8d872`** : [N2 #42408104639](https://github.com/hraaaaf/Akarfinder/actions/runs/42408104639) SUCCESS, [N3 #42408104568](https://github.com/hraaaaf/Akarfinder/actions/runs/42408104568) SUCCESS. Artefact N2 **#13588442456** vérifié : 3 rapports `ok=true`, 101 images, 32/32 parcours villes × viewports 390/430/768/1280, 17/17 choix de quartiers sourcés, 8 villes, sans overflow/JS errors dans les rapports. Cas legacy Casablanca et smoke Mohammedia préservés. [PR #1187 Draft](https://github.com/hraaaaf/Akarfinder/pull/1187) empilée sur PR #1186, non fusionnée, review `docs/reviews/VIVRE_ICI_L4B_MULTICITY_UI_2026-11-07.md`, docs-only HEAD `01039190`.
- **BEFORE :** 23/32 cas et 12/17 choix (Rabat 4/4, Mohammedia 4/4, Kénitra sans centre 1/4 en échec). **AFTER :** 32/32, 17/17, pas de coordonnées de quartier inventées. Aucune vérité prix/annonces SQL prouvée.
- **Choix visuel validé par l'utilisateur pour le montage de preuves :** 8 villes sur une grille homogène 2×4, **Mohammedia** mise en valeur par **bordure bleue + halo discret + badge « VILLE CIBLE »**, aucune carte isolée. Montages sur 4 viewports enregistrés en fichiers de conversation `VivreIci_L4B_8villes_FOCUS_Mohammedia_CI-5e2e826e_{390,430,768,1280}px.png`. **Attention : c'est une présentation de preuves, pas une nouvelle interface applicative déployée ou intégrée.**
- **Statuts restants :** L1/L2 GREEN technique, L3 partiel (0 contour quartier certifié, POI frais non vérifiés), L4-A et L4-B GREEN technique, L5-A et L5-B GREEN technique mais L5 global AMBER faute de résultats SQL réels, L6 non certifié (licences, a11y, score visuel final ≥9,5/10). **Aucun pourcentage global fiable.**
- **Next exact :** gates L6, sources géométriques/POI L3, preuve annonces SQL L5 lorsque la base autorisée sera disponible ; retest après assemblage des PR. **Aucun merge ou Vercel sans autorisation explicite.**


## 07/11/2026 — L4-B preuve visuelle finale : rail 1280px corrigé, 32/17 maintenu

Cette section **complète** le closeout L4-B ci-dessus ; les parties antérieures de la roadmap restent historiques et peuvent décrire des CI aujourd'hui dépassées.

- **Code réellement testé :** `01039190bd10d746638f1da237aa7025fbac75a3`. [N2 #42408652297](https://github.com/hraaaaf/Akarfinder/actions/runs/42408652297) **SUCCESS** et [N3 #42408652104](https://github.com/hraaaaf/Akarfinder/actions/runs/42408652104) **SUCCESS**. Artefact N2 [#13588552994](https://github.com/hraaaaf/Akarfinder/actions/runs/42408652297/artifacts/13588552994) ouvert : `report.json ok=true, 4 cas`, `l4b/report.json ok=true, 4 cas`, `l4b-eightcity/report.json ok=true, 32/32 cas passés et 17/17 sélections` ; **101 PNG, 8 villes**, aucune erreur navigateur/overflow déclarée. Les montages AFTER existent aux quatre viewports 390/430/768/1280, plus comparaison même capture du rail Rabat 1280.
- **Correctif UX réel :** ancien CSS carte nationale affichait « Sources et couverture » dans une colonne de quelques caractères ; désormais le panneau ville utilise bloc pleine largeur + police lisible. Playwright mesure **277–282 px de largeur pour les deux paragraphes sur les huit villes desktop 1280**, `font-size=11px`, seuils minimaux de test >=160px et >=10,5px. Screenshots avant/après inspectés. **Score visuel qualitatif ~8/10** pour L4-B : aucune prétention à 9,5/10 global.
- **Identité publique :** « Mohammedia » dans libellés UI/CTA Search, source V5 `mohammadia` inchangée. **Limite** : neuf sélections avec un centre source dans ce sous-ensemble aboutissent à `preview` au lieu d'une vue MapLibre spécifique ; les 17 sélections sont des navigations vérifiées, pas 17 quartiers cartographiés ni des contours certifiés.
- **Git :** [PR #1187](https://github.com/hraaaaf/Akarfinder/pull/1187) reste Draft, base #1186, non mergée. Closeout revu dans `docs/reviews/VIVRE_ICI_L4B_MULTICITY_UI_2026-11-07.md`, docs-only HEAD distinct du code testé. **Pas de Vercel, pas de DB, pas de merge.**
- **Next exact :** L6 vérifier droits d'imagerie Esri (l'URL publique ne prouve pas une licence), OpenMapTiles/OSM et accessibilité ; L3 contour et POI frais ; L5 données SQL réelles si autorisées ; **aucune release certifiée** sans ces preuves et une note globale ≥9,5/10 démontrée. Pas de % global inventé.
