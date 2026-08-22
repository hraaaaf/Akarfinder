# Refonte carte — Référentiel premium AkarFinder

**Statut : CANON VISUEL CIBLE — v1**  
**Scope : carte, recherche immobilière et harmonisation des pages publiques AkarFinder**  
**Principe : évolution fidèle du produit actuel, jamais rebranding parallèle.**

## 1. Goal

Construire un référentiel visuel et fonctionnel stable permettant de refondre la carte ville par ville, puis d'harmoniser chaque page AkarFinder sans dérive graphique entre les lots.

### Succès

- chaque page publique conserve l'ADN AkarFinder ;
- chaque lot UI dispose d'une cible écrite + visuelle avant implémentation ;
- la carte utilise un référentiel produit versionné par ville/quartier ;
- les couches `zones`, `prix` et `tendances` utilisent les mêmes identifiants de quartiers ;
- aucun lot n'est déclaré conforme sans comparaison avant / référence / après sur les mêmes viewports.

### Preuve obligatoire par lot UI

1. capture **avant** ;
2. référence ou wireframe du présent document ;
3. implémentation ;
4. capture **après** sur les mêmes viewports ;
5. tests fonctionnels + responsive + accessibilité proportionnels au risque ;
6. score de conformité documenté.

> Une page non capturée ne peut pas être déclarée visuellement certifiée. Une impossibilité de capture est un blocker de certification, pas une invitation à inventer le résultat.

---

## 2. ADN visuel existant à préserver

Source primaire : design system actuellement présent dans `app/globals.css` et `app/layout.tsx`.

### Typographie

- **Plus Jakarta Sans** ;
- titres : 600–700 ;
- texte courant : 400–500 ;
- labels compacts / contrôles : 600–700 ;
- pas de deuxième famille décorative.

### Palette canonique

| Rôle | Token cible | Usage |
|---|---:|---|
| Fond app | `#F7F8FA` | arrière-plan général |
| Surface | `#FFFFFF` | cartes, panneaux, popups |
| Texte principal | `#111827` | titres, CTA sombres |
| Texte secondaire | `#6B7280` | métadonnées, aide |
| Bordure | `#E5E7EB` | cartes, champs, séparateurs |
| Data / sélection | `#7C3AED` | données marché, focus, sélection |
| Data secondaire | `#8B5CF6` | nuances, gradients data |
| Attention / découverte | `#F97316` | accents, signaux, mise en avant |
| Positif / confirmé | `#166534` | badges positifs / validés |
| Positif doux | `#DCFCE7` | fond badges positifs |
| No-data | gris neutre | absence de signal, jamais fausse donnée |

### Formes et profondeur

- rayon principal cartes : **18–20 px** ;
- rayon contrôles : **12–16 px** ;
- ombres : sobres, diffuses, jamais lourdes ;
- exemple de niveau : `0 10px 22px rgba(17,24,39,.08)` ;
- hover : augmentation légère de profondeur, pas de saut de layout ;
- focus accessible : halo violet cohérent avec `#7C3AED`.

### Règles premium

1. Priorité à la donnée et à la lisibilité, pas aux effets décoratifs.
2. Blanc + gris + navy constituent la structure ; violet/orange/vert sont sémantiques.
3. Aucun arc-en-ciel par quartier : la couleur exprime une **métrique**, pas un nom.
4. Même composant = même rayon, même ombre, même logique d'espacement sur toutes les pages.
5. Mobile n'est pas une version amputée : les actions critiques restent accessibles.

---

## 3. Architecture cartographique canonique

La carte produit AkarFinder est séparée de la GeoTruth exacte.

### 3.1 Référentiel zones

Un fichier par ville :

`data/map/<ville>-zones.json`

```json
{
  "city": "Rabat",
  "version": "1.0.0",
  "boundaryType": "akarfinder_product_zone",
  "neighborhoods": [
    {
      "id": "rabat_agdal",
      "name": "Agdal",
      "aliases": ["Agdal"],
      "polygon": {},
      "confidence": "high",
      "sources": []
    }
  ]
}
```

Règles :
- ID stable ;
- polygone produit documenté, sans prétention de frontière administrative officielle ;
- provenance et confiance explicites ;
- pas de copie de géométrie sans droits compatibles ;
- pas de centroïde/buffer/Voronoi présenté comme limite de quartier.

### 3.2 Référentiel prix

`data/map/<ville>-prices.json`

Clé de jointure : `neighborhood_id`.

Minimum :
- vente / location ;
- type de bien ;
- prix/m² ;
- période ;
- taille d'échantillon ;
- source(s) ;
- confiance ;
- date de fraîcheur.

### 3.3 Référentiel tendances

`data/map/<ville>-trends.json`

Minimum :
- activité ;
- évolution ;
- demande relative ;
- volume observé ;
- période ;
- méthode ;
- confiance.

### 3.4 GeoTruth exacte — séparée

Les zones produit ne servent jamais d'origine exacte pour :
- routing ;
- distance ;
- nearby places ;
- isochrones ;
- position GPS d'une annonce.

---

## 4. Système de couleurs de la carte

Le même polygone change de couleur selon le **mode**, jamais selon son identité.

### Mode Zones

- zone par défaut : surface très claire neutre ;
- bordure : gris froid ;
- hover : contour `#111827` + légère élévation ;
- sélection : violet `#7C3AED` ;
- no-data : gris neutre clairement identifiable.

### Mode Prix

Conserver la logique déjà présente dans AkarFinder : gradient marché allant des tons **chauds** (`#9A3412`, `#D97706`, `#FACC15`) vers le **vert** (`#86EFAC`, `#22C55E`).

La légende doit toujours afficher explicitement le sens `moins cher ↔ plus cher`; aucune couleur seule ne doit imposer une interprétation implicite.

### Mode Tendances

- hausse / dynamique positive : vert ;
- stable : jaune/ambre doux ;
- baisse / ralentissement : orange soutenu ;
- donnée insuffisante : gris ;
- violet réservé à la sélection et au contexte data, pas à une direction de tendance.

---

## 5. Référentiel premium page par page

Le canon s'applique aux **routes existantes** et à leurs sous-routes dynamiques. Les routes confirmées dans l'arborescence actuelle incluent notamment `/`, `/acheter`, `/a-propos`, `/accompagnement`, `/alerts`, `/comment-ca-marche`, `/compagnon`, `/compare`, `/conditions-utilisation`, `/contact`, `/credit`, `/demande-retrait`, ainsi que les surfaces recherche/carte/annonce déjà présentes dans le produit. Toute route supplémentaire découverte reste rattachée à l'une des familles ci-dessous avant modification.

### 5.1 Accueil `/`

**Objectif premium :** moteur immobilier immédiatement compréhensible, confiance avant densité.

```text
┌──────────────── Header AkarFinder ────────────────┐
│ Hero / proposition de valeur                     │
│ ┌──────────── Recherche principale ────────────┐ │
│ └───────────────────────────────────────────────┘ │
│ Intentions rapides : Acheter | Louer | Vendre    │
│ Preuves / couverture / bénéfices                  │
│ Découverte marché / quartiers                     │
└──────────────── Footer sobre ─────────────────────┘
```

Critères :
- recherche = premier point focal ;
- CTA principal navy ;
- accent orange ou violet uniquement pour guider ;
- aucune métrique non prouvée ;
- mobile : recherche et intentions visibles sans chasse au trésor.

### 5.2 Acheter / louer / pages d'intention

S'applique à `/acheter` et aux routes équivalentes de transaction.

```text
Header
Titre intention + contexte
Recherche / filtres rapides
┌ Résultat premium ┐ ┌ Résultat premium ┐
└──────────────────┘ └──────────────────┘
Découverte quartiers / marché
CTA secondaire
```

Critères :
- même langage de cartes que les résultats de recherche ;
- prix, surface, localisation et source forment la hiérarchie n°1 ;
- badges réduits aux signaux réellement utiles ;
- pas de duplication de filtres entre hero et contenu.

### 5.3 Recherche — Liste

**Objectif premium :** décision rapide sans bruit.

```text
Recherche compacte sticky
Filtres essentiels + “Tous les filtres”
Résultats / compteur / tri
┌ visuel │ prix + titre + lieu + surface │ badges ┐
└─────────────────────────────────────────────────┘
...
```

Référence existante : cartes arrondies 18–20 px, fond blanc, orange pour signal de découverte, vert pour confirmation, texte navy.

Critères :
- densité élevée mais respirable ;
- prix immédiatement lisible ;
- aucune information importante uniquement portée par la couleur ;
- état empty/loading/error dessiné dans le même système.

### 5.4 Recherche — Carte

**C'est la page pilote de cette refonte.**

Desktop cible : **44 % liste / 56 % carte**, cohérent avec le layout existant.

```text
┌──────── Recherche + filtres ──────────────────────┐
│ ┌──── Liste 44 % ────┐ ┌──── Carte 56 % ──────┐ │
│ │ résultats           │ │ [Zones|Prix|Tend.]   │ │
│ │ cartes compactes    │ │                      │ │
│ │                     │ │ quartiers colorés    │ │
│ │                     │ │ légende explicite    │ │
│ └─────────────────────┘ └──────────────────────┘ │
└───────────────────────────────────────────────────┘
```

Mobile :
- bascule claire Liste / Carte ;
- carte ~420 px minimum quand active ;
- contrôles essentiels accessibles au pouce ;
- fiche quartier / annonce en bottom sheet ou carte compacte, jamais popup minuscule.

Critères :
- changement `Zones / Prix / Tendances` sans changer les polygones ;
- légende toujours visible ou accessible en un geste ;
- sélection quartier synchronisée avec liste ;
- no-data explicite ;
- aucune couleur sans valeur ou tranche expliquée.

### 5.5 Fiche annonce

```text
Header
Galerie dominante
┌──────── contenu principal ───────┬─ carte action ─┐
│ prix / titre / lieu              │ contact/action │
│ caractéristiques                 │ favoris/partage │
│ description                      └────────────────┘
│ “Vivre ici” / contexte quartier                  │
│ carte / proximité / réalité rue                  │
└───────────────────────────────────────────────────┘
```

Critères :
- prix et localisation avant enrichissements ;
- sections L5/L6/L7 visuellement subordonnées à la vérité de l'annonce ;
- donnée indisponible = absence explicite, jamais remplissage décoratif ;
- mobile : CTA principal persistant seulement si utile et non invasif.

### 5.6 Comparateur `/compare`

**Objectif premium :** lecture latérale immédiate.

- colonnes alignées ;
- critères fixes à gauche sur desktop ;
- meilleur signal souligné sobrement, jamais “gagnant” inventé ;
- différences importantes > répétition de toutes les données ;
- mobile : cartes empilées + sélecteur de critère, pas tableau horizontal illisible.

### 5.7 Alertes `/alerts`

- création d'alerte en une action principale ;
- résumé humain de la recherche surveillée ;
- fréquence / canal secondaires ;
- cartes alertes actives sobres ;
- états pause/actif compréhensibles sans couleur seule.

### 5.8 Compagnon `/compagnon`

- posture d'assistance, pas chatbot générique envahissant ;
- suggestions courtes liées à l'immobilier ;
- réponses et actions visuellement séparées ;
- violet data utilisé comme accent, structure navy/blanc conservée.

### 5.9 Accompagnement `/accompagnement`

- parcours par besoin ;
- preuve et prochaine action avant discours marketing ;
- cartes services alignées au système 18–20 px ;
- CTA unique dominant par section.

### 5.10 Crédit `/credit`

- calcul / capacité / étapes dans cet ordre ;
- hypothèses financières affichées ;
- chiffres forts en navy, aide en gris ;
- aucune promesse de taux ou d'accord non vérifiée.

### 5.11 Comment ça marche `/comment-ca-marche`

- parcours en 3–5 étapes maximum ;
- une illustration/diagramme fonctionnel par concept utile seulement ;
- même iconographie et mêmes cartes que le reste du site ;
- CTA final vers recherche, pas vers une page intermédiaire inutile.

### 5.12 À propos `/a-propos`

- mission et fonctionnement avant histoire institutionnelle ;
- discours de confiance court ;
- aucune métrique décorative ;
- continuité stricte avec header/footer publics.

### 5.13 Contact `/contact`

- formulaire court ;
- motifs de contact structurés ;
- confirmation explicite ;
- pas de panneau marketing concurrent du formulaire.

### 5.14 Conditions / retrait / pages légales

S'applique à `/conditions-utilisation`, `/demande-retrait` et pages réglementaires équivalentes.

- largeur de lecture limitée ;
- navigation ancrée si document long ;
- typographie et contrastes du design system ;
- aucun artifice commercial ;
- actions légales critiques clairement séparées du texte.

### 5.15 Toute nouvelle page

Avant implémentation :
1. la rattacher à une famille ci-dessus ou créer une nouvelle section dans ce canon ;
2. produire son wireframe ;
3. définir ses états responsive ;
4. seulement ensuite coder.

---

## 6. Composants invariants

### Header
- même hauteur/logique sur toutes pages publiques ;
- logo et navigation stables ;
- variation sticky permise, changement de langage visuel interdit.

### Recherche
- même vocabulaire, mêmes contrôles et mêmes états partout ;
- filtres importants immédiatement accessibles ;
- filtres avancés dans un panneau cohérent.

### Cartes annonce
- même ordre d'information ;
- même système de rayon/ombre/badges ;
- variantes compactes permises pour carte et comparateur.

### Badges
- violet = data/contexte ;
- orange = attention/découverte ;
- vert = positif/confirmé ;
- gris = neutre/no-data ;
- pas de nouveau code couleur sans mise à jour du canon.

### Carte quartier
- popup/focus blanc 16–18 px ;
- eyebrow compact ;
- métrique dominante ;
- contexte secondaire ;
- action claire si pertinente.

---

## 7. Viewports de certification

Conserver les viewports déjà utilisés par la discipline qualité AkarFinder :
- **390 px** ;
- **430 px** ;
- **768 px** ;
- **1280 px**.

Pour chaque page modifiée : avant et après sur les mêmes viewports applicables.

---

## 8. Score obligatoire après chaque lot UI

Score /10, fondé sur preuves :

| Dimension | Poids |
|---|---:|
| Fidélité au présent canon | 30 % |
| Hiérarchie / lisibilité | 20 % |
| Responsive | 20 % |
| Cohérence composants | 15 % |
| Accessibilité / états | 10 % |
| Absence de régression visuelle manifeste | 5 % |

Interprétation :
- `< 8.5` : non conforme ;
- `8.5–9.2` : acceptable mais à corriger si le chemin critique le permet ;
- `>= 9.3` : cible premium atteinte **uniquement si les preuves et tests sont verts**.

Le score n'est jamais auto-déclaré à partir du code seul.

---

## 9. Roadmap Refonte carte — 6 lots

### P1 — Référentiel quartiers Rabat
Goal : liste exhaustive cible, noms, aliases, IDs stables.  
Succès : pas de quartier important manquant/dupliqué selon les sources croisées retenues.

### P2 — Schéma JSON canonique
Goal : figer `zones/prices/trends`.  
Succès : schémas versionnés + validation automatisée.

### P3 — Découpage géographique complet
Goal : une zone produit exploitable par quartier Rabat.  
Succès : 100 % du référentiel P1 possède une géométrie produit documentée ou un statut explicite bloquant.

### P4 — Certification cartographique
Goal : cohérence visuelle et spatiale Rabat.  
Succès : pas de trou/chevauchement absurde, labels cohérents, captures comparées aux viewports cibles.

### P5 — Prix
Goal : alimenter la même carte avec une couche prix/m².  
Succès : valeurs, périodes, samples et confiance disponibles/explicites, no-data fail-closed.

### P6 — Tendances + intégration finale
Goal : modes `Zones / Prix / Tendances` dans une expérience harmonisée.  
Succès : changement de couche sans changement de référentiel spatial, UI conforme au canon et tests verts.

---

## 10. Anti-dérive

À partir de ce document :

- toute modification UI doit citer la section canonique qu'elle implémente ;
- toute divergence volontaire doit modifier ce fichier **avant ou dans le même PR** ;
- aucun lot ne peut introduire une nouvelle palette locale, une nouvelle typographie ou un nouveau système de cartes sans justification canonique ;
- les références visuelles futures doivent rester en harmonie avec l'application réellement existante ;
- aucun déploiement Vercel n'est effectué sans autorisation explicite.

## 11. Baseline visuelle

Le repo ne fournit pas, dans l'audit actuel, de jeu de captures directement exploitable comme baseline canonique. Le design system code est donc documenté ici, mais **la certification visuelle de chaque page reste conditionnée à la capture avant réelle au démarrage de son lot**.

Aucune implémentation UI ne doit contourner cette étape.
