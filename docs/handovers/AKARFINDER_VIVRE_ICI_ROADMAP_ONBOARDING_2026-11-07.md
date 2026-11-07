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
