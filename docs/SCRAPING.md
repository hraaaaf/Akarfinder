# AkarFinder — Acquisition de données et gouvernance des sources

**Version : 2026-08-03**  
**Statut : doctrine canonique**

Le nom historique du fichier est `SCRAPING.md`, mais la stratégie actuelle est plus large : **discovery, feeds, imports, observation, index public limité et partenariats**.

## 1. Principe

AkarFinder ne dépend d’aucune source unique et ne collecte pas « tout ce qui est techniquement accessible ».

Pour chaque source, huit questions sont séparées :

1. peut-on découvrir l’URL ?
2. peut-on ouvrir automatiquement la page ?
3. peut-on extraire et stocker des faits ?
4. peut-on conserver le texte ?
5. peut-on afficher un extrait ?
6. peut-on utiliser une image ou un contact ?
7. doit-on seulement rediriger vers la source ?
8. quand la politique doit-elle être revue ?

Un `robots.txt` permissif, un sitemap ou une indexation Google ne constitue pas une licence contractuelle ou de propriété intellectuelle.

## 2. Doctrine No-Bypass

Interdits :

- proxy ou réseau de contournement ;
- stealth ;
- faux user-agent de moteur ;
- CAPTCHA solving ;
- bypass login/paywall ;
- contournement de rate limit ;
- utilisation d’un compte humain pour automatiser un accès interdit ;
- réhébergement de galeries, contacts ou contenus sans droit ;
- activation silencieuse d’une source bloquée.

En cas de 403, 429, CAPTCHA, restriction contractuelle ou preuve absente : arrêt fail-closed, classement de la source et revue.

## 3. Canaux autorisables

### Partenaires et feeds

Priorité la plus élevée :

- feeds promoteurs ;
- feeds agences ;
- CSV/XML/JSON ;
- APIs ;
- exports Sakan Expo ;
- permission écrite et contrat d’attribution/fraîcheur.

### Première partie

Contenu soumis directement par un professionnel ou un utilisateur, avec validation, modération et règles de propriété des médias.

### Sitemaps publics

Utilisables pour discovery lorsque la politique le permet. Le détail, l’extraction et la republication restent des décisions séparées.

### Common Crawl

Signal de discovery et d’historique public. Les données doivent encore passer par classification, provenance, Source Registry et display policy.

### Résultats publics indexés

Utilisables comme représentation limitée : URL, attribution, titre/snippet borné, aucune galerie/contact, redirection vers la source.

Le moteur ou fournisseur de recherche n’est pas présenté comme la source du bien.

### Adaptateurs autorisés

Un adaptateur réseau n’est actif que pour une source dont le registre établit clairement le droit et les limites. Délais, budgets, circuit breakers et journalisation sont obligatoires.

## 4. Statuts de source

- `partner` ;
- `authorized` ;
- `public_index_only` ;
- `internal_signal_only` ;
- `legal_review` ;
- `blocked`.

Le statut doit être daté, documenté, révisable et distinct par capacité.

Exemple : une source peut autoriser la discovery mais interdire le fetch détail, les images et la republication.

## 5. Position actuelle de sources majeures

Les états précis restent dans le Source Registry. Les règles générales actuelles sont :

- **Mubawab** : aucune extraction/republication étendue sans partenariat ou licence ; contribution possible comme index public limité ou signal interne selon la politique active ;
- **Avito** : marketplace mixte, forte quarantaine verticale, aucun fetch/reuse direct sans revue et autorisation ;
- **Agenz, MoulDar, Masaken** : usage limité selon provenance et display policy, sans les présenter comme partenaires ;
- **petites agences à sitemap** : candidates prioritaires aux accords et feeds, jamais automatiquement autorisées.

## 6. Pipeline d’admission

```text
URL découverte
→ source identifiée
→ politique évaluée
→ vertical immobilier
→ document_kind LISTING/CATEGORY/AMBIGUOUS
→ URL canonique et déduplication
→ normalisation
→ qualité/fraîcheur
→ display eligibility
→ index public ou quarantaine
```

Une page `CATEGORY`, une SERP interne ou une URL ambiguë n’est pas une annonce.

## 7. Données minimales

Pour une représentation indexée :

- URL canonique ;
- domaine/source ;
- méthode de discovery ;
- timestamp ;
- classification verticale ;
- type documentaire ;
- politique d’affichage ;
- provenance du titre/snippet ;
- état de fraîcheur.

Pour une annonce structurée :

- ville/type/intention lorsque prouvés ;
- prix et surface avec valeur brute, type, confiance et provenance ;
- source et URL ;
- first/last seen ;
- observations versionnées ;
- droits médias/contact.

## 8. Prix et surface

- ne jamais choisir arbitrairement un nombre ;
- distinguer prix total, loyer, mensualité, avance, prix au m² et « à partir de » ;
- distinguer surface habitable, terrain, construite, utile et inconnue ;
- rejeter les contradictions ;
- publier chaque champ indépendamment ;
- conserver la valeur brute et la preuve.

## 9. Freshness

- cadence définie par source ;
- budget réseau ;
- timeout explicite ;
- circuit breaker ;
- 404 ≠ retrait certain sans politique ;
- 403/429 ≠ autorisation de contourner ;
- réactivation et changement matériel conservés ;
- aucun job planifié non documenté.

## 10. Objectif de volume

Les compteurs sont séparés :

- documents découverts ;
- immobilier probable ;
- display eligible ;
- vraies pages annonce `LISTING` ;
- annonces structurées ;
- observations ;
- propriétés/clusters ;
- lignes comparables prix/surface.

La cible 100 000+ concerne des représentations immobilières exploitables. Elle ne peut pas inclure du bruit, des catégories, des pages de recherche ou des doublons non maîtrisés.
