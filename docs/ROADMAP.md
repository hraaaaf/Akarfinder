# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-03**  
**Statut : Production active — priorité DATA → profondeur → qualité → certification**  
**Code de référence : `main` @ `fa983a3`**  
**Production : `dpl_8XqdkUnMvVRgKVTCU2bNVnXbYg5f` — `READY`**

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
- aucun contournement de CAPTCHA, login, rate limit ou restrictions ;
- un sitemap et `robots.txt` sont des signaux techniques, pas une licence ;
- Source Registry obligatoire avant toute activation ;
- aucune publication depuis Discovery ou Thin Index sans eligibility ;
- conservation de la source originale et de la provenance ;
- aucune donnée absente inventée ;
- aucune image, galerie ou coordonnée reprise sans droit ;
- migrations additives et réversibles ;
- `Shadow → Canary → validation → activation bornée` ;
- une responsabilité principale par LOT et par PR.

---

## 3. État réel au 3 août 2026

### 3.1 Produit et UX ✅

- application publique active ;
- Acheter, Louer, Vendre et Recherche opérationnels ;
- six visuels Option A exacts en Production : Appartement, Villa, Terrain, Studio, Riad, Bureau ;
- vraie photo autorisée prioritaire sur tout fallback illustré ;
- composants et parcours validés par CI lors de la PR visuelle.

### 3.2 Recherche ✅ / 🟠

- chemin historique structuré conservé comme fallback ;
- read model ODM connecté ;
- Canary déterministe et fail-closed ;
- cap technique actuel : 10 % ;
- stop switch et retour legacy en cas d’erreur ;
- page SSR `/search` et API `/api/search` alignées sur le même parseur et la même clé stable ;
- contrat Gateway public avec `total_count`, `has_more` et `next_cursor` disponible.

Limite : la présence du code et du cap 10 % ne prouve pas le taux effectivement servi par l’environnement Production. Une certification par télémétrie interne reste nécessaire avant toute nouvelle hausse.

### 3.3 Vérité DATA connectée

Lecture directe Supabase, non destructive :

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

Les trois premières sources représentent environ **86,5 %** du corpus servi : la diversification est un gate de qualité, pas une option.

### 3.4 Couverture principale

Pages annonce éligibles par ville :

- Casablanca : 2 155 ;
- Marrakech : 1 073 ;
- Rabat : 984 ;
- Tanger : 907 ;
- Agadir : 600 ;
- Fès : 383 ;
- Kénitra : 323 ;
- autres villes : profondeur encore faible ou inégale.

---

## 4. LOTS terminés ou acquis

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

### ODM 01 → 10F ✅ / avec limites documentées

- read model Thin Index ;
- curseur public ;
- qualité et ranking ;
- quarantaine du bruit vertical ;
- classification `LISTING / CATEGORY / AMBIGUOUS` ;
- récupération prudente de signaux économiques déjà stockés ;
- pages de catégorie et ambiguës exclues du read model public listing-only.

### Canary Search ✅ capacité / 🟠 certification d’exploitation

- dual-read et divergence ;
- contrôleur déterministe ;
- fallback legacy ;
- cap augmenté jusqu’à 10 % ;
- parité page/API ;
- gates CI associés.

### Visual Option A ✅ Production

- famille exacte approuvée ;
- intégration Acheter/Louer/Search/Vendre ;
- fallbacks de cartes ;
- priorité des vraies photos ;
- déploiement Production vérifié.

---

## 5. Programme actif

## LOT A — Honest Listing Depth P0 🔴

Objectif : passer de 7 483 à une profondeur significativement supérieure de **vraies pages annonce** sans bruit.

À livrer :

- acquisition connectée de nouvelles URLs `LISTING` ;
- aucune page catégorie ou recherche admise ;
- provenance et canonical URL obligatoires ;
- déduplication URL avant insertion ;
- classification verticale et documentaire avant eligibility ;
- rapport net-new par source, ville, type et intention ;
- mesure du gain réel après quarantaine.

Gate : aucun objectif de volume ne peut être validé sur le nombre total de documents Thin Index.

## LOT B — Source Registry & Partner Feeds P0 🔴

Objectif : transformer la dépendance aux résultats publics indexés en accès durable et autorisé.

Priorités :

- feeds promoteurs et agences ;
- Promo Immo Marrakech ;
- Dar Agadir ;
- Atlas Immobilier ;
- L’Immobilier Sans Frontières ;
- Aykana ;
- autres sources après revue spécifique.

Pour chaque source : discovery, fetch, stockage, réutilisation, images, contacts, affichage, citation, cadence, expiration et date de revue.

Gate : aucune source n’est « autorisée » parce qu’elle possède un sitemap ou un `robots.txt` accessible.

## LOT C — Economic Truth P0 🔴

Objectif : augmenter fortement les 853 prix, 2 085 surfaces et 717 lignes comparables sans deviner.

À livrer :

- typage prix total / loyer / prix au m² / à partir de ;
- devise et valeur brute ;
- surfaces habitables, terrain, construites et non typées ;
- détection de contradictions ;
- provenance et confiance par champ ;
- suppression publique indépendante d’un champ ambigu ;
- mesures de précision sur corpus annoté.

Gate : zéro valeur publiée uniquement parce qu’un nombre existe dans un texte.

## LOT D — Freshness & Lifecycle P0 🟠

Objectif : distinguer observation récente, page encore accessible, changement matériel, retrait probable et état inconnu.

À livrer :

- `first_seen`, `last_seen`, `last_successful_fetch`, `last_material_change` ;
- revisite selon politique de source ;
- 404/403/429/timeout sans bypass ;
- circuit breaker et budget par source ;
- réactivation et expiration explicables.

Gate : l’ancienneté seule ne confirme jamais un retrait.

## LOT E — Canary Certification P0 🟠

Objectif : prouver le comportement réel du read model ODM avant extension.

À livrer :

- taux d’exposition effectivement observé ;
- nombre de requêtes ODM et legacy ;
- latence p50/p95/p99 ;
- erreurs et fallbacks ;
- zéro fuite de contact/image ;
- divergence ranking et résultats ;
- rollback testé ;
- fenêtre d’observation bornée.

Gate : aucune hausse au-delà du niveau certifié par télémétrie.

## LOT F — Property Graph & Dedup V3 P1 🟠

Objectif : une propriété potentielle, plusieurs observations.

- rapprochement multi-source ;
- géographie, prix, surface, texte et médias autorisés ;
- doublon fort / rapprochement probable / ressemblance ;
- propriété canonique versionnée ;
- explication et rollback ;
- aucune fusion certaine sur signal faible.

## LOT G — Search Depth Certification P1 🟠

Corpus : principales villes, quartiers, acheter/louer/neuf, appartement/villa/terrain/riad/studio/bureau/commerce, FR/AR/Darija/mixte.

Mesures : précision, zéro résultat, diversité, fraîcheur, prix/surface, doublons, redirections, latence et accessibilité.

## LOT H — Premium Intelligence P1/P2 🟡

À reprendre seulement après gates DATA :

- Map Atlas ;
- Price Atlas ;
- Property Passport ;
- quartier et proximité ;
- comparaison avancée ;
- historique et alertes ;
- expériences professionnelles.

---

## 6. Ordre d’exécution verrouillé

1. Honest Listing Depth ;
2. Source Registry et feeds ;
3. Economic Truth ;
4. Freshness ;
5. Canary Certification ;
6. Property Graph/Dedup ;
7. Search Depth Certification ;
8. couverture nationale équilibrée ;
9. intelligence premium ;
10. Final Production Release Gate.

---

## 7. Cibles

### Prochaine cible intermédiaire

- augmenter le corpus `LISTING` éligible sans bruit ;
- atteindre au minimum 90 % de résultats avec type et intention ;
- porter prix et surface comparables bien au-delà de 9,6 % ;
- réduire la dépendance aux trois premières sources ;
- certifier le taux Canary réellement servi.

### Cible stratégique

**100 000+ représentations immobilières exploitables**, avec une sous-métrique obligatoire et séparée pour les vraies pages annonce `LISTING` publiables.

Le chiffre 100 000 ne peut jamais inclure des catégories, résultats de recherche, URLs ambiguës ou verticales non immobilières.

---

## 8. Ce qui reste gelé

- nouvelles features périphériques ;
- refonte générale supplémentaire ;
- collecte massive non autorisée ;
- hausse Canary non mesurée ;
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
- migrations vérifiées et réversibles ;
- CI complète sans régression pertinente ;
- activation et trafic observé distingués du code disponible ;
- rollback démontré ;
- PR, SHA, limites et prochaine étape documentés.

---

## 10. Prochain point de départ

**LOT recommandé : acquisition connectée et gouvernée de vraies pages annonce `LISTING`, suivie d’une recertification complète du corpus public ODM.**

Aucune nouvelle feature UX ne doit devancer ce LOT.
