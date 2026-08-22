# HVR-6 — Benchmark final références

Date : 2026-08-22

## Goal

Comparer la homepage HVR-5 certifiée aux références actuelles Rightmove, Zillow, Redfin et Realtor.com, puis corriger uniquement les écarts qui améliorent réellement la clarté, l’actionnabilité, la densité ou la confiance.

## BEFORE exact

HVR-5 certifié :
- HEAD `6c1d95bfe49d93aa514114dcd03267f2dbeccba5`
- run `32583217515` SUCCESS
- artifact `9478356032`
- digest `sha256:af95257d826691a2a2028eca600c49c250f65493a2abd6b4322a8dcca163bad3`
- viewports 390 / 430 / 768 / 1280
- score 9,3/10 ; human gate APPROVED

## Re-check frais — références

### Rightmove
Source : https://www.rightmove.co.uk/ — crawl 2026-08-22.
- recherche dominante dès le hero ;
- tabs Buy / Rent / Sold ;
- champ localisation + Search ;
- services secondaires directement actionnables : compte/alertes, valuation, first-time buyers, overseas, commercial, online valuation ;
- peu de texte explicatif avant les actions.

Source complémentaire officielle : https://plc.rightmove.co.uk/content/uploads/2026/02/260227-FY25-Presentation.pdf — présentation FY25 publiée 2026, slide `Transform Search / Conversational search` montrant le même pattern homepage search-first.

### Zillow
Source : https://www.zillow.com/ — crawl récent 2026-08.
- proposition courte ;
- champ principal adresse/quartier/ville/ZIP ;
- recherche = fonction première.

Source officielle produit 2026 : https://www.zillow.com/news/zillow-debuts-ai-mode/
- l’intelligence est reliée à des actions réelles : découverte, planification de visite, connexion agent.

### Redfin
Source : https://www.redfin.com/ — crawl récent 2026-08.
- Buy / Mortgage / Sell / Rent / My Home Value ;
- champ City / Address / School / Agent / ZIP ;
- services secondaires sous forme de destinations directes ;
- inventaire `Browse the newest homes` visible sur homepage.

### Realtor.com
Source : https://www.realtor.com/ — crawl 2026-08-19.
- homes visibles dès la homepage ;
- Buying / Renting / Selling ;
- outils financiers actionnables ;
- bloc `Get Local Info` avec recherche par Address / City / Zip / Neighborhood.

Source complémentaire : https://www.realtor.com/local — `Find Your Ideal Neighborhood` avec recherche dédiée.

## Matrice HVR-5 avant correction

Échelle interne comparative : 10 = très fort sur le critère observé. Les scores sont une appréciation UX, pas des métriques externes.

| Critère | Rightmove | Zillow | Redfin | Realtor | AkarFinder HVR-5 |
|---|---:|---:|---:|---:|---:|
| Recherche prioritaire | 9,8 | 9,7 | 9,6 | 9,2 | 9,5 |
| Intentions achat/location | 9,8 | 9,2 | 9,6 | 9,2 | 9,5 |
| Simplicité / densité | 9,7 | 9,5 | 9,1 | 8,5 | 8,9 |
| Inventaire visible | 8,8 | 9,0 | 9,5 | 9,5 | 9,1 |
| Contexte local | 8,5 | 9,0 | 9,1 | 9,5 | 9,4 |
| Actions secondaires | 9,5 | 9,3 | 9,5 | 9,3 | 9,3 |
| Confiance / provenance | 8,8 | 9,0 | 8,8 | 8,8 | 9,5 |
| Mobile / hiérarchie | 9,5 | 9,4 | 9,2 | 8,8 | 9,0 |

## Findings

### À conserver
- Hero search-first + intents Acheter / Louer / Neuf.
- `AkarFinder Intelligence` car c’est une différenciation réelle et directement reliée à la carte/marché.
- accès villes directs ;
- `Biens à découvrir` ;
- `Comprendre le quartier avant de visiter` ;
- 4 actions finales recherche / projet / vente / professionnels.

### Écart final à corriger

`HomeValueStrip` ajoute trois cartes purement explicatives juste après le hero : `Marché observé`, `Confiance lisible`, `Territoire utile`.

Le benchmark converge vers une homepage où l’après-hero mène rapidement à de l’inventaire, des destinations ou des services. Ces trois cartes répètent déjà l’Intelligence, les listings et le module quartier. Elles ajoutent surtout de la hauteur, particulièrement sur mobile.

Le sous-texte du `HomeActionGrid` (`Pas de détour, pas de chiffres d’exemple...`) décrit une règle interne de conception plutôt qu’un bénéfice utilisateur. Il doit disparaître.

## Goal visuel / wireframe avant implémentation

Desktop :

`Header → Hero/Search + Intelligence → Explorer le Maroc → Biens à découvrir → Comprendre le quartier → 4 actions → Footer`

Mobile :

`Header → Hero/Search → Intelligence → Explorer le Maroc → Biens → Quartier → 4 actions → Footer`

Suppression complète du strip de 3 cartes entre Hero et villes. Aucun nouveau bloc compensatoire.

## Succès observable

- `HomeValueStrip` non monté sur `/` ;
- aucun texte meta `Pas de détour` / `chiffres d’exemple` visible ;
- HVR-1→HVR-6 contracts verts ;
- TypeScript + production build ;
- audit final avec snapshot HVR-3 CI-only pour montrer 4 vraies représentations publiques observées ;
- 4/4 viewports 390 / 430 / 768 / 1280 ;
- 0 overflow ; 0 console error ;
- routes search / compagnon / vendre / pro et 3 quartiers fonctionnelles ;
- score final ≥ 9/10 ;
- human gate final avant merge.

## Hors scope

Backend, DB, ranking, ingestion, politiques source, Vercel.
