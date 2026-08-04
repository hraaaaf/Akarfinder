# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-05**  
**Statut : Production active — ODM 100 % certifié — priorité DATA → profondeur → qualité**  
**Code de référence : `main` @ `468eb7f`**  
**Production certifiée ODM : `dpl_2TD7QvPZSiWagox68bRHVZ1xqb3c` — `READY`**

---

## 1. Cap produit

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence**.

Le cœur produit est `/search`.

L’objectif long terme est le **Property Graph du marché immobilier marocain** : une propriété potentielle, plusieurs observations, une provenance conservée et aucune certitude inventée.

Pipeline canonique :

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

---

## 2. Doctrine non négociable

- aucun proxy, stealth, faux Googlebot ou bypass ;
- aucun contournement de CAPTCHA, login, rate limit ou restriction ;
- un sitemap et `robots.txt` sont des signaux techniques, pas une licence ;
- Source Registry obligatoire avant toute activation ;
- aucune publication depuis Discovery ou Thin Index sans eligibility ;
- conservation de la source originale et de la provenance ;
- aucune donnée absente inventée ;
- aucune image, galerie ou coordonnée reprise sans droit ;
- migrations additives et réversibles ;
- `Shadow → Canary → certification → activation bornée` ;
- une responsabilité principale par LOT et par PR.

---

## 3. État réel au 5 août 2026

### 3.1 Produit et UX ✅

- application publique active ;
- Acheter, Louer, Vendre et Recherche opérationnels ;
- six visuels Option A exacts en Production ;
- vraie photo autorisée prioritaire sur tout fallback illustré ;
- parcours principaux protégés par CI responsive et accessibilité.

### 3.2 Recherche publique ODM ✅

- read model ODM connecté à `/search` et `/api/search` ;
- **100 % des recherches publiques éligibles routées vers ODM** ;
- campagne Production : **240/240 HTTP 200, 240/240 ODM, 0 Legacy** ;
- 15/15 gates de cutover PASS ;
- p50 ODM 226,59 ms, p95 503,43 ms, p99 814,80 ms ;
- 10 villes, 4 types et 3 intentions couverts ;
- aucune fuite de contact, galerie, miniature ou badge commercial indu ;
- aucune erreur runtime Vercel pendant la certification ;
- stop switch et rollback 50 % conservés ;
- Legacy conservé comme fallback de sécurité, sans trafic normal.

Preuve canonique :

- run `30958909536` ;
- branche `certification-results` ;
- `reports/odm-full-cutover-100-production-latest.json` ;
- `docs/ODM-FULL-CUTOVER-100-PRODUCTION-RUNBOOK.md`.

### 3.3 Vérité DATA connectée — dernier snapshot certifié

Snapshot Supabase non destructif du 3 août 2026 :

| Indicateur | Valeur |
|---|---:|
| Documents Thin Index | 56 777 |
| Immobilier probable | 34 172 |
| Non immobiliers quarantainés | 22 586 |
| Non classés | 19 |
| Immobilier + display eligible | 22 481 |
| **Pages annonce LISTING éligibles au read model public** | **7 483** |
| Avec ville | 7 483 — 100 % |
| Avec type | 7 203 — 96,3 % |
| Avec intention | 7 233 — 96,7 % |
| Avec prix | 853 — 11,4 % |
| Avec surface | 2 085 — 27,9 % |
| Prix + surface | 717 — 9,6 % |
| `property_listings` | 4 508 |
| `listing_sources` | 4 513 |
| `property_clusters` / members | 4 369 / 4 369 |
| Observations factuelles | 2 767 |

Concentration des 7 483 pages annonce éligibles :

- Agenz : 3 813 ;
- Mubawab : 1 374 ;
- MoulDar : 1 289 ;
- Masaken : 749 ;
- autres sources : 258.

Les trois premières sources représentent environ **86,5 %** du corpus servi. La diversification est un gate de qualité.

### 3.4 Couverture principale — snapshot du 3 août

- Casablanca : 2 155 ;
- Marrakech : 1 073 ;
- Rabat : 984 ;
- Tanger : 907 ;
- Agadir : 600 ;
- Fès : 383 ;
- Kénitra : 323 ;
- autres villes : profondeur encore faible ou inégale.

---

## 4. LOTS acquis

### Fondation P0 DATA ✅

- référentiel géographique ;
- Observation Ledger ;
- Freshness/Lifecycle ;
- scheduler et workers bornés ;
- normalisation et qualité ;
- display eligibility ;
- Source Registry initial ;
- sécurité service role et RLS ;
- Market Index et fondation Property Graph ;
- dédoublonnage conservant les observations.

### ODM 01 → 10F ✅

- read model Thin Index ;
- curseur public ;
- qualité et ranking ;
- quarantaine du bruit vertical ;
- classification `LISTING / CATEGORY / AMBIGUOUS` ;
- récupération prudente des signaux économiques stockés ;
- exclusion publique des catégories et documents ambigus.

### Cutover Search ODM 1 % → 100 % ✅

- dual-read et divergences ;
- contrôleur déterministe fail-closed ;
- paliers certifiés 10 %, 25 %, 50 % et 100 % ;
- fallback Legacy ;
- parité page/API ;
- campagne 100 % complète et preuve persistante.

### Visual Option A ✅

- famille exacte approuvée ;
- intégration Acheter/Louer/Search/Vendre ;
- fallbacks de cartes ;
- priorité des vraies photos ;
- déploiement Production vérifié.

---

## 5. Programme actif

## LOT I — Consolidation ODM 100 % P0 🔵

Objectif : rendre le cutover durable sans ralentir le retour au chantier DATA.

À livrer :

- routeur public unique pour `/search` et `/api/search` ;
- événements structurés `odm_public_routing_v1` ;
- distinction `odm / legacy_primary / legacy_fallback` ;
- latence, volumes, erreurs et état du stop switch observables ;
- empreinte de clé stable sans requête brute ;
- fallback Legacy et rollback 50 % conservés ;
- aucune suppression du moteur Legacy dans ce LOT.

Gate : tests ciblés, TypeScript, build, CI complète et smoke Production sans erreur runtime.

Après ce LOT, aucun autre chantier de routage ne doit devancer la profondeur DATA.

## LOT A — Honest Listing Depth P0 🔴

Objectif : passer de 7 483 à une profondeur significativement supérieure de **vraies pages annonce**, sans bruit.

À livrer :

- acquisition connectée de nouvelles URLs `LISTING` ;
- aucune page catégorie ou recherche admise ;
- provenance et canonical URL obligatoires ;
- déduplication URL avant insertion ;
- classification verticale et documentaire avant eligibility ;
- rapport net-new par source, ville, type et intention ;
- mesure du gain réel après quarantaine.

Gate : aucun objectif de volume validé sur le nombre total de documents Thin Index.

## LOT B — Source Registry & Partner Feeds P0 🔴

Objectif : réduire la dépendance aux résultats publics indexés par des accès durables et autorisés.

Priorités : feeds promoteurs/agences et revue explicite de chaque source : discovery, fetch, stockage, réutilisation, images, contacts, affichage, citation, cadence, expiration et date de revue.

Gate : aucune source n’est déclarée autorisée parce qu’elle possède un sitemap ou un `robots.txt` accessible.

## LOT C — Economic Truth P0 🔴

Objectif : augmenter fortement les 853 prix, 2 085 surfaces et 717 lignes comparables sans deviner.

- typage prix total / loyer / prix au m² / à partir de ;
- devise et valeur brute ;
- surfaces habitables, terrain, construites et non typées ;
- contradictions, provenance et confiance par champ ;
- suppression publique indépendante des champs ambigus ;
- précision mesurée sur corpus annoté.

Gate : zéro valeur publiée uniquement parce qu’un nombre existe dans un texte.

## LOT D — Freshness & Lifecycle P0 🟠

Objectif : distinguer observation récente, accessibilité, changement matériel, retrait probable et état inconnu.

- `first_seen`, `last_seen`, `last_successful_fetch`, `last_material_change` ;
- revisite selon politique de source ;
- 404/403/429/timeout sans bypass ;
- circuit breaker et budget par source ;
- réactivation et expiration explicables.

Gate : l’ancienneté seule ne confirme jamais un retrait.

## LOT F — Property Graph & Dedup V3 P1 🟠

Objectif : une propriété potentielle, plusieurs observations.

- rapprochement multi-source ;
- géographie, prix, surface, texte et médias autorisés ;
- doublon fort / rapprochement probable / ressemblance ;
- propriété canonique versionnée ;
- explication et rollback ;
- aucune fusion certaine sur signal faible.

## LOT G — Search Depth Certification P1 🟠

Corpus : principales villes, quartiers, acheter/louer/neuf, types principaux, FR/AR/Darija/mixte.

Mesures : précision, zéro résultat, diversité, fraîcheur, prix/surface, doublons, redirections, latence et accessibilité.

## LOT H — Premium Intelligence P1/P2 🟡

À reprendre seulement après les gates DATA : Map Atlas, Price Atlas, Property Passport, quartiers, comparaison avancée, historique, alertes et expériences professionnelles.

---

## 6. Ordre d’exécution verrouillé

1. terminer Consolidation ODM 100 % ;
2. Honest Listing Depth ;
3. Source Registry et feeds ;
4. Economic Truth ;
5. Freshness ;
6. Property Graph/Dedup ;
7. Search Depth Certification ;
8. couverture nationale équilibrée ;
9. intelligence premium ;
10. Final Production Release Gate.

---

## 7. Cibles

### Prochaine cible intermédiaire

- augmenter le corpus `LISTING` éligible sans bruit ;
- conserver au minimum 90 % de résultats avec type et intention ;
- porter prix et surface comparables nettement au-delà de 9,6 % ;
- réduire la dépendance aux trois premières sources ;
- mesurer les gains net-new après quarantaine et déduplication.

### Cible stratégique

**100 000+ représentations immobilières exploitables**, avec une sous-métrique obligatoire et séparée pour les vraies pages annonce `LISTING` publiables.

Le chiffre 100 000 ne peut inclure ni catégories, ni résultats de recherche, ni URLs ambiguës, ni verticales non immobilières.

---

## 8. Ce qui reste gelé

- nouvelles features périphériques ;
- refonte générale supplémentaire ;
- collecte massive non autorisée ;
- suppression immédiate de Legacy ;
- changement ranking sans expérience contrôlée ;
- promesse de couverture totale non certifiée ;
- badges « vérifié », « fiable » ou « partenaire » sans droit et preuve ;
- réutilisation d’images ou contacts externes sans autorisation.

---

## 9. Définition de terminé

Un LOT est terminé seulement si :

- code et documentation sont mergés dans `main` ;
- tests ciblés, TypeScript et build sont verts ;
- preuve connectée disponible pour toute affirmation DATA ;
- migrations vérifiées et réversibles lorsqu’elles existent ;
- CI complète sans régression pertinente ;
- activation, trafic et code disponible sont distingués ;
- rollback démontré ;
- PR, SHA, limites et prochaine étape documentés.

---

## 10. Prochain point de départ

Après la clôture du LOT I :

**acquisition connectée et gouvernée de vraies pages annonce `LISTING`, suivie d’une recertification complète du corpus public ODM.**

Aucune nouvelle feature UX ou nouvelle phase de routage ne doit devancer ce LOT DATA.
