# DATA-1 — Moroccan Real Estate Web Census

**Statut : plan d’exécution subordonné à `docs/ROADMAP.md`**  
**But : recenser, classer et prioriser le Web immobilier marocain sans créer de pipeline parallèle ni activer automatiquement une source.**

Ce document détaille le lot `DATA-1` de la roadmap canonique. Il ne remplace ni `docs/ROADMAP.md`, ni `docs/SESSION.md`.

## 1. Point de départ réel

Les briques suivantes existent déjà et doivent être réutilisées :

- Source Registry v2 fail-closed ;
- Source Freshness Engine ;
- Discovery Expansion / reserve lane ;
- OpenSERP, sitemaps publics et Common Crawl déjà présents comme canaux de discovery ;
- Coverage Gap Auditor ;
- baseline Mubawab Casablanca certifiée ;
- partner feed foundation et Professional Workspace.

Le lot B3 Discovery Expansion a déjà produit un inventaire de **76 641 URLs uniques**, dont **37 009 URLs en réserve pour revue de sources non enregistrées**. DATA-1 commence donc par exploiter cette matière existante avant tout nouveau crawl national.

## 2. Invariant

`DISCOVERED ≠ AUTHORIZED ≠ INGESTIBLE ≠ DISPLAYABLE`

Le Census peut découvrir et classifier un domaine. Il ne peut jamais, à lui seul :

- autoriser une ingestion ;
- modifier une policy Source Registry ;
- contourner robots.txt, noindex, CGU, login, CAPTCHA ou limitation technique ;
- publier une annonce ;
- prétendre qu’une API ou un feed est autorisé parce qu’il est techniquement visible.

Toute source nouvellement découverte reste fail-closed jusqu’à revue explicite.

## 3. Modèle de sortie canonique

Une ligne `Domain Census` doit pouvoir représenter au minimum :

- domaine canonique ;
- nombre d’URLs observées ;
- canaux/providers de discovery ;
- première et dernière observation ;
- exemples d’URLs bornés ;
- type d’organisation : `AGENCY`, `PROMOTER`, `PORTAL`, `CLASSIFIED`, `BANK_INVENTORY`, `OTHER`, `UNKNOWN` ;
- preuves de classification ;
- villes/zones observées lorsque l’information existe ;
- signaux techniques explicitement observés : sitemap, JSON-LD, WordPress, Houzez, RealHomes, REST, XML, CSV, autre ;
- statut Registry : enregistré / non enregistré / inconnu ;
- policy effective si elle existe déjà ;
- état de revue ;
- potentiel de volume ;
- priorité suivante ;
- aucune permission inférée.

## 4. Sous-lots

### DATA-1.0 — Audit de réutilisation ✅/EN COURS

Objectif : cartographier les composants déjà mergés avant tout code Census.

Gate : aucun nouveau modèle ne doit dupliquer Source Registry, Discovery Expansion ou Coverage Auditor.

### DATA-1.1 — Domain Census Core 🔴

Objectif : construire un agrégateur déterministe et offline :

`discovery observations → canonical domains → census candidates`

Livrables :

- normalisation sûre des URLs/domaines ;
- déduplication ;
- agrégation providers / compteurs / dates ;
- classification uniquement à partir de signaux fournis ;
- état fail-closed `UNREVIEWED` par défaut ;
- tests déterministes ;
- aucun réseau, aucune DB.

### DATA-1.2 — Existing Reserve Adapter 🔴

Objectif : brancher le Census sur les observations déjà persistées, en priorité les **37 009 URLs de sources non enregistrées** de la reserve lane B3.

Sortie : première liste réelle de domaines non enregistrés, triée par volume observé.

Gate : lecture seule ; aucune inscription automatique dans Source Registry.

### DATA-1.3 — Common Crawl URL Index Discovery 🔴

Objectif : utiliser le Common Crawl URL Index pour élargir le Census à des domaines/pages immobiliers marocains absents de l’inventaire actuel.

Contraintes :

- URL index / metadata seulement au premier passage ;
- `.ma`, Maroc/Morocco et patterns immobiliers ;
- déduplication par domaine ;
- aucun WARC/detail fetch dans ce sous-lot ;
- résultats marqués comme signaux de discovery/historique.

### DATA-1.4 — Web Data Commons Structured Discovery 🟠

Objectif : découvrir des domaines via les extractions structurées déjà disponibles : `RealEstateListing`, `Apartment`, `House`, `Residence`, `Offer`, `PostalAddress`, `Organization`, `LocalBusiness`.

Gate : l’ancienneté des datasets interdit toute affirmation de fraîcheur courante.

### DATA-1.5 — Capability & Tech Fingerprint 🟠

Objectif : déterminer le connecteur potentiel sans confondre capacité technique et autorisation.

Signaux recherchés après preflight policy :

- sitemap ;
- Schema.org / JSON-LD ;
- WordPress ;
- Houzez ;
- RealHomes ;
- REST public ;
- XML/CSV/feed déclaré ;
- HTML générique.

Sortie : `connector_candidate`, jamais `connector_authorized`.

### DATA-1.6 — Source Review Queue & Registry Mapping 🟠

Objectif : transformer les meilleurs candidats du Census en file de revue Source Registry.

États :

`DISCOVERED → AUDITED → POLICY_ASSIGNED → ELIGIBLE | DEFERRED | BLOCKED`

Aucune policy finale n’est écrite sans preuve robots/CGU/licence/evidence et revue explicite.

### DATA-1.7 — National Census Report 🟠

Objectif : produire le classement qui décidera DATA-3 Universal Site Connector.

Classement par :

`volume potentiel × fraîcheur × policy feasibility × répétabilité technique × couverture géographique`

Sorties :

- top domaines ;
- top familles CMS/connecteurs ;
- volume potentiel par ville ;
- registered vs unregistered ;
- sources à contacter ;
- sources blocked/deferred ;
- recommandation du premier connecteur générique à construire.

## 5. KPI DATA-1

- `domains_discovered` ;
- `domains_from_existing_reserve` ;
- `domains_from_common_crawl` ;
- `domains_from_structured_web` ;
- `registered_domains` ;
- `unregistered_domains` ;
- `reviewed_domains` ;
- distribution par type ;
- distribution par tech/connecteur potentiel ;
- `potential_listing_urls` ;
- couverture villes/zones ;
- taux de domaines avec sitemap / structured data ;
- nombre de sources par policy ;
- aucun compteur d’annonces publiques ne doit inclure une simple URL candidate.

## 6. Definition of Done DATA-1

DATA-1 n’est terminé que si :

1. le Census réutilise les briques existantes ;
2. le corpus B3 existant est agrégé par domaine ;
3. Common Crawl URL Index et Web Data Commons ont été évalués en discovery-only ;
4. chaque candidat reste fail-closed sans policy ;
5. les métriques sont reproductibles ;
6. le premier connecteur générique est choisi sur preuves ;
7. aucun bypass ou permission implicite n’a été introduit ;
8. tests, TypeScript, build et CI sont verts ;
9. la PR est mergée avant le sous-lot suivant nécessitant sa fondation.

## 7. Première action

Exécuter `DATA-1.1 — Domain Census Core`, puis `DATA-1.2 — Existing Reserve Adapter` avant toute nouvelle requête massive au Web.
