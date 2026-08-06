# AKARFINDER — ROADMAP CANONIQUE

**Version : 5 août 2026**  
**Statut : UX critique certifiée — priorité DATA → profondeur → qualité**  
**Code de référence : `main` @ `b1b188ff20d44744ffec845ce6774d8de8e5bbe2`**

> Ce document est la source de vérité pour l’ordre des travaux. Les rapports de LOT et d’activation restent des preuves historiques, mais ne modifient pas cette séquence.

---

## 1. Cap produit

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- cœur produit : `/search` ;
- ambition : devenir la référence de recherche et de compréhension du marché immobilier marocain ;
- trajectoire long terme : **Property Graph** — une propriété potentielle, plusieurs observations, une provenance conservée et aucune certitude inventée.

Pipeline canonique :

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

### Doctrine non négociable

- aucun proxy, stealth, faux Googlebot ou bypass ;
- aucun contournement de CAPTCHA, login, rate limit, robots ou restriction ;
- sitemap et `robots.txt` sont des signaux techniques, jamais une licence ;
- Source Registry obligatoire avant activation ;
- aucune publication depuis Discovery ou Thin Index sans eligibility ;
- source originale et provenance toujours conservées ;
- aucune donnée absente inventée ;
- aucune image, galerie, coordonnée ou contact repris sans droit ;
- migrations additives et réversibles ;
- `Shadow → Canary → certification → activation bornée` ;
- une responsabilité principale par LOT et par PR.

---

## 2. État réel au 5 août 2026

### 2.1 UX et produit

Le programme UX P0 + P1 est terminé et fusionné.

| Périmètre | État | Score final |
|---|---:|---:|
| P0 — Search clarity | Terminé | 9,6/10 |
| P1 LOT 1 — Résultat → décision | Terminé | 9,6/10 |
| P1 LOT 2 — Design system | Terminé | 20/20 gates |
| P1 LOT 3 — Mobile ergonomics | Terminé | 21/21 gates |
| P1 LOT 4 — Motion & feedback | Terminé | 20/20 gates |
| Search | Solide | 9,3/10 |
| Fiche bien | Solide | 9,4/10 |
| Mobile critique | Solide | 9,3/10 |
| Design system | Solide | 9,1/10 |
| Accessibilité | Solide | 9,2/10 |
| Site complet | Inégal | 7,4/10 |

**Verdict :** le cœur transactionnel est suffisamment solide. Une nouvelle refonte générale est interdite. Les améliorations UX restantes doivent être ciblées et ne pas retarder DATA.

### 2.2 Recherche publique ODM

- read model ODM connecté à `/search` et `/api/search` ;
- 100 % des recherches publiques éligibles routées vers ODM lors de la dernière certification ;
- fallback Legacy et stop switch conservés ;
- catégorisation, vérité de source, eligibility et déduplication protégées par CI.

### 2.3 Snapshot DATA connecté du 3 août 2026

| Indicateur | Valeur |
|---|---:|
| Documents Thin Index | 56 777 |
| Immobilier probable | 34 172 |
| Non immobiliers quarantainés | 22 586 |
| Immobilier + display eligible | 22 481 |
| Pages annonce `LISTING` éligibles | 7 483 |
| Avec ville | 100 % |
| Avec type | 96,3 % |
| Avec intention | 96,7 % |
| Avec prix | 11,4 % |
| Avec surface | 27,9 % |
| Prix + surface comparables | 9,6 % |
| `property_listings` | 4 508 |
| `property_clusters` | 4 369 |
| Observations factuelles | 2 767 |

Concentration des 7 483 pages annonce éligibles :

- Agenz : 3 813 ;
- Mubawab : 1 374 ;
- MoulDar : 1 289 ;
- Masaken : 749 ;
- autres : 258.

Les trois premières sources représentent environ **86,5 %** du corpus servi. La diversification est un gate de qualité.

### 2.4 Readiness

- architecture produit/technique : **≈ 88–90 %** ;
- UX critique : **≈ 94 %** ;
- UX site complet : **≈ 74 %** ;
- DATA readiness pour lancement ambitieux : **≈ 65–70 %** ;
- readiness globale : **≈ 74 %**.

Le différentiel restant vient principalement de la profondeur, de la vérité économique, de la fraîcheur, de la diversification et de la canonicalisation.

---

# 3. Programme actif — DATA FIRST

## LOT D0 — Consolidation ODM 100 %

**Priorité : P0 — clôture courte**

Objectif : rendre le cutover durable sans relancer un chantier de routage.

- routeur public unique `/search` + `/api/search` ;
- événements `odm_public_routing_v1` ;
- distinction `odm / legacy_primary / legacy_fallback` ;
- latence, volume, erreurs et stop switch observables ;
- fallback Legacy conservé ;
- aucun retrait de Legacy dans ce LOT.

**Gate :** tests ciblés, TypeScript, build, CI et smoke Production.

---

## LOT D1 — Source Registry opérationnelle

**Priorité : P0 bloquante**

Transformer la gouvernance des sources en mécanisme exécutable.

Pour chaque source :

- catégorie `partner / direct / public-indexed / internal-signal / forbidden` ;
- base contractuelle ou permission ;
- robots.txt et CGU datés ;
- routes et cadence autorisées ;
- champs observables ;
- stockage, réutilisation et affichage permis ;
- source originale requise ;
- images, contacts et coordonnées ;
- expiration ;
- kill switch.

**DoD :** gate CI empêchant toute source active non enregistrée. Aucun nouveau scraper ne peut être activé avant clôture.

---

## LOT D2 — Honest Listing Depth

**Priorité : P0**

Objectif : augmenter fortement les **vraies pages annonce `LISTING`**, pas le volume Thin Index brut.

- acquisition connectée et gouvernée ;
- aucune page catégorie/recherche admise ;
- provenance et canonical URL obligatoires ;
- déduplication URL avant insertion ;
- classification verticale et documentaire ;
- rapport net-new après quarantaine et déduplication ;
- ventilation source, ville, type et intention.

Paliers de certification :

1. 10 000 pages `LISTING` exploitables ;
2. 25 000 ;
3. 50 000 ;
4. 100 000+ représentations exploitables avec métrique `LISTING` séparée.

---

## LOT D3 — Partner Feeds & diversification

**Priorité : P0**

- flux promoteurs et agences autorisés ;
- onboarding source versionné ;
- ingestion idempotente ;
- SLA de mise à jour ;
- attribution et retrait ;
- diminution progressive de la dépendance aux trois premières sources.

**Gate :** aucun badge partenaire sans relation et preuve explicites.

---

## LOT D4 — Economic Truth

**Priorité : P0**

Objectif : augmenter les 853 prix, 2 085 surfaces et 717 lignes comparables sans deviner.

- prix total, loyer, prix/m², « à partir de » ;
- devise et valeur brute ;
- surfaces habitables, terrain, construites et non typées ;
- provenance et confiance par champ ;
- contradictions ;
- suppression publique indépendante des champs ambigus ;
- précision sur corpus annoté.

**Gate :** zéro valeur publiée uniquement parce qu’un nombre apparaît dans un texte.

---

## LOT D5 — Normalisation géographique nationale

Priorité des pôles :

1. Casablanca ;
2. Rabat–Salé–Témara ;
3. Marrakech ;
4. Tanger ;
5. Agadir ;
6. Fès–Meknès ;
7. Kénitra ;
8. autres villes.

- villes et alias ;
- quartiers ;
- résidences ;
- coordonnées et géométries ;
- score de confiance ;
- aucun backfill faible confiance publié automatiquement.

---

## LOT D6 — Freshness & Lifecycle

**Priorité : P0**

- `first_seen` ;
- `last_seen` ;
- `last_successful_fetch` ;
- `last_material_change` ;
- politique de revisite par source ;
- 404/403/429/timeout sans bypass ;
- circuit breaker ;
- réactivation et expiration explicables ;
- historique de prix et disponibilité.

**Gate :** l’ancienneté seule ne confirme jamais un retrait.

---

## LOT D7 — Property Graph & Dedup V3

**Priorité : P1**

Objectif : **une propriété potentielle → plusieurs observations → un cluster explicable**.

Signaux : source, URL, géographie, professionnel, prix, surface, texte, résidence/programme, temporalité et médias autorisés.

Niveaux :

- doublon fort ;
- rapprochement probable ;
- ressemblance.

Gates :

- aucun cluster géant injustifié ;
- précision prioritaire sur recall ;
- raisons visibles ;
- split et rollback possibles ;
- aucune fusion certaine sur signal faible.

---

## LOT D8 — Quality, Reliability & Display Eligibility

Séparer :

- complétude ;
- fraîcheur ;
- provenance ;
- cohérence ;
- risque de doublon ;
- statut professionnel ;
- analyse documentaire.

Définir ce qui peut apparaître dans : SERP, carte, fiche interne, résultats publics indexés, pages SEO et signaux marché internes.

**Interdit :** score unique opaque présenté comme garantie.

---

## LOT D9 — Ranking V2 & Search Depth Certification

Conserver l’ordre de vérité :

1. catégories commerciales explicites ;
2. pertinence intentionnelle ;
3. localisation ;
4. qualité et fraîcheur ;
5. prix/surface disponibles ;
6. signaux utilisateur.

Corpus de certification : villes, quartiers, acheter/louer/neuf, types principaux, FR/AR/Darija/mixte.

Mesures : précision, zéro résultat, diversité, fraîcheur, prix/surface, doublons, latence, redirections et accessibilité.

---

# 4. UX secondaire — parallèle borné

Ces LOTS peuvent avancer en parallèle uniquement s’ils ne ralentissent pas DATA.

## UX-A1 — Vendre / Publier

Score actuel : **6,9** → cible **≥ 9,0**.

- Estimer mon bien ;
- Publier une annonce ;
- Trouver un professionnel ;
- tunnel progressif ;
- brouillon ;
- aperçu ;
- validation et mobile à une main.

## UX-A2 — Accueil condensée

Score actuel : **7,8** → cible **≥ 9,0**.

Réduire de 30 à 40 % : promesse, moteur, preuve DATA réelle, grandes villes, différenciation et CTA final.

## UX-A3 — Neuf par programme

Score actuel : **7,2** → cible **≥ 9,0**.

Programmes, promoteur, livraison, chantier, typologies, prix à partir de, disponibilités et comparaison.

## UX-A4 — Acheter / Louer spécialisés

Scores actuels : **7,2 / 7,1**.

Acheter : financement, prix, typologies et tendances.  
Louer : meublé, charges, caution, durée, disponibilité et équipements.

## UX-A5 — Mon Projet cockpit

Score actuel : **7,3** → cible **≥ 9,0**.

Progression, recherches, favoris, comparaison, quartiers, visites, financement, documents et prochaines actions.

## UX-A6 — Carte décisionnelle

Score actuel : **7,4** → cible **≥ 9,0**.

Synchronisation liste/carte, bottom-sheet, clusters, recherche dans la zone et couches quartier.

## UX-A7 — Pro / Agences / Promoteurs

Segmentation, profils enrichis, preuves, couverture locale, leads et séparation stricte commercial/qualité.

## UX-A8 — Immobilier / SEO local

Aucune page mince : annonces, prix datés, volume, quartiers, tendances, méthodologie et provenance.

---

# 5. Intelligence et Property Graph

À reprendre après les gates DATA :

1. Neighborhood Intelligence ;
2. Price Intelligence ;
3. Property Passport ;
4. Compagnon DATA-native ;
5. alertes baisse de prix, disponibilité et nouvelles annonces ;
6. expériences professionnelles et analytics.

---

# 6. Ordre d’exécution verrouillé

1. clôturer D0 — Consolidation ODM ;
2. D1 — Source Registry opérationnelle ;
3. D2 — Honest Listing Depth ;
4. D3 — Partner Feeds et diversification ;
5. D4 — Economic Truth ;
6. D5 — Géographie nationale ;
7. D6 — Freshness ;
8. D7 — Property Graph/Dedup ;
9. D8 — Quality/Eligibility ;
10. D9 — Ranking et certification ;
11. intelligence premium ;
12. lancement national.

En parallèle autorisé : UX-A1, UX-A2, UX-A3 et UX-A5, un LOT à la fois.

---

# 7. Ce qui reste gelé

- refonte UX générale supplémentaire ;
- features périphériques ;
- collecte massive non autorisée ;
- suppression immédiate de Legacy ;
- changement de ranking sans expérience contrôlée ;
- promesse de couverture totale non certifiée ;
- badges « vérifié », « fiable » ou « partenaire » sans droit et preuve ;
- réutilisation d’images ou contacts externes sans autorisation.

---

# 8. Définition de terminé

Un LOT est terminé seulement si :

- scope et non-objectifs écrits ;
- code et documentation mergés dans `main` ;
- tests ciblés, TypeScript et build verts ;
- preuve connectée pour toute affirmation DATA ;
- migrations vérifiées et réversibles ;
- CI complète sans régression pertinente ;
- audit responsive/accessibilité si UI ;
- activation, trafic et code disponible distingués ;
- rollback démontré ;
- déploiement et audit Production vérifiés ;
- roadmap et `docs/START.md` mis à jour.

---

# 9. Prochain LOT canonique

## `DATA-P0-SOURCE-REGISTRY-OPERATIONAL-1`

Objectif : transformer la Source Registry en gate bloquant et auditable.

Livrables minimaux :

- inventaire code ↔ registry ;
- policy versionnée par source ;
- droits d’acquisition, stockage, analyse et affichage ;
- robots/CGU datés ;
- cadence et expiration ;
- kill switch ;
- test CI empêchant toute source non enregistrée ;
- rapport des écarts et plan de fermeture.

**Aucun nouveau scraper ne doit être activé avant fermeture de ce LOT.**
