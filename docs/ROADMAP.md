# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-07-28**  
**Statut : P0 DATA consolidé dans `main`**  
**Référence de merge : PR #128 — `28621251a3b1723b4db70d1c5218b100cd3550c8`**

---

## 1. Cap produit

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence**.

Le cœur produit est `/search`.

L’objectif long terme est de construire le **Property Graph du marché immobilier marocain** :

- une annonce reste une observation de source ;
- plusieurs observations peuvent représenter le même bien ;
- une propriété canonique ne peut être publiée qu’après provenance, fraîcheur, qualité, dédoublonnage et politique d’affichage ;
- AkarFinder n’invente jamais une donnée absente ;
- la source originale reste visible et accessible.

Pipeline canonique :

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

---

## 2. Doctrine non négociable

### No-Bypass

- aucun proxy ou réseau de contournement ;
- aucun stealth ;
- aucun faux Googlebot ;
- aucun contournement de CAPTCHA, login, rate limit ou blocage ;
- respect de `robots.txt`, des politiques de source et des restrictions d’indexation ;
- arrêt fail-closed lorsqu’une autorisation ou une preuve manque.

### Gouvernance des changements

- inspection avant modification ;
- preuve avant changement ;
- migrations additives et réversibles ;
- aucune publication directe depuis Discovery ou Thin Index ;
- aucun passage Production sans **Shadow → Canary → validation → activation bornée** ;
- une responsabilité principale par LOT et par PR.

---

## 3. État réel au 28 juillet 2026

### P0 DATA — Consolidation mainline ✅ TERMINÉE

La PR #128 a intégré dans `main` la pile DATA certifiée.

Livré et validé :

- référentiel géographique canonique ;
- Property Intelligence Foundation et backfill interne ;
- Observation Ledger append-only ;
- moteur Freshness & Lifecycle ;
- scheduler de revisite déterministe ;
- worker de recrawl borné et dry-run par défaut ;
- adaptateur source autorisée Mubawab ;
- persistance transactionnelle atomique ;
- micro-batch réseau réel de trois offres ;
- sécurité `service_role`, RLS et absence d’exposition publique ;
- Home Proof, User Journey et Canonical Baseline remis en cohérence ;
- 22 workflows du head final verts avant merge.

Preuve micro-batch certifiée :

- demandé : 3 ;
- exécuté : 3 ;
- observations commitées : 3 ;
- échecs : 0 ;
- contournements : 0 ;
- `publication_eligible=false` sur l’ensemble du lot.

### Production publique

Le pipeline historique `property_listings → API Search → SERP` reste le chemin public actif tant que le pipeline ODM n’a pas franchi les gates Shadow et Canary.

Le nouveau pipeline ODM reste séparé :

`Discovery → Source Seeds → Thin Index → Quality → Display Policy → Future Search`

Aucun merge DATA ne constitue, à lui seul, une activation massive de collecte ou une bascule de la SERP.

---

## 4. Programme actif — DATA → SEARCH DEPTH → QUALITY → RELEASE

## LOT 1 — ODM Audit Validator V1 🔴 PRIORITÉ IMMÉDIATE

**PR #139 — Draft, non mergée**

Objectif : fiabiliser les champs économiques avant toute admission publique.

Acquis en Shadow :

- pilote stratifié de 240 représentations ;
- règle `TITLE FIRST` ;
- détection des contradictions prix et surface ;
- séparation indépendante du lien canonique, du prix et de la surface ;
- source policy évaluée avant qualité ;
- statuts de fraîcheur et provenance fail-closed ;
- six gates de sécurité validés ;
- aucune modification de listing, ranking ou display state public.

À terminer avant merge :

1. parseur économique robuste avec objectif zéro faux positif ;
2. typage exhaustif des surfaces ;
3. score de fraîcheur exploitable ;
4. Source Registry complet et explicite ;
5. revue finale des fixtures ambiguës ;
6. CI complète verte sur la base `main` actuelle ;
7. maintien strict du mode Shadow.

**Critère de sortie :** validator mergé, sans activation SERP et avec preuve reproductible sur le pilote.

---

## LOT 2 — Source Registry V2 🔴

Objectif : disposer d’une politique exécutable et complète pour chaque source.

À livrer :

- identité canonique de la source ;
- type de source ;
- statut légal et opérationnel ;
- modes de découverte permis ;
- règles `robots.txt` observées ;
- politique de fetch ;
- politique de stockage ;
- politique de miniature ;
- politique de citation et redirection ;
- fréquence de revisite ;
- statut `partner`, `authorized`, `public_index_only`, `internal_signal_only`, `blocked` ou `legal_review` ;
- historique des décisions et date de prochaine revue.

**Gate :** aucune source inconnue ne peut entrer dans une lane publiable.

---

## LOT 3 — Economic Truth Pipeline V2 🔴

Objectif : rendre prix, devise et surface fiables, typés et explicables.

À livrer :

- candidats prix provenant du titre, snippet et données structurées ;
- normalisation MAD et conservation de la valeur brute ;
- distinction prix total, loyer mensuel, prix au m² et prix « à partir de » ;
- détection des plages, mensualités, avances et montants parasites ;
- surfaces habitables, terrain, construites, utiles et non typées ;
- contradiction inter-champs ;
- confiance et provenance par champ ;
- suppression publique indépendante pour chaque champ ambigu.

**Gate :** aucune valeur économique ne doit être publiée uniquement parce qu’elle est présente en base.

---

## LOT 4 — Freshness Machine V2 🟠

Objectif : mesurer l’actualité réelle d’une observation et organiser sa revisite.

À livrer :

- `first_seen`, `last_seen`, `last_successful_fetch` et `last_material_change` ;
- statut observé, retiré, réactivé, probablement obsolète ou inconnu ;
- score de fraîcheur explicable ;
- cadence par source, type d’annonce et volatilité ;
- gestion des 404, 403, 429, timeouts et erreurs réseau sans bypass ;
- budget et circuit breaker par source ;
- preuves de reprise après incident.

**Gate :** l’ancienneté seule ne peut jamais inventer un retrait confirmé.

---

## LOT 5 — Property Graph & Dedup V3 🟠

Objectif : évoluer de « plusieurs annonces » vers « une propriété potentielle, plusieurs observations ».

À livrer :

- clustering multi-source ;
- clés géographiques normalisées ;
- rapprochement adresse, quartier, coordonnées, surface, prix, texte et médias ;
- distinction doublon fort, rapprochement probable et simple ressemblance ;
- propriété canonique versionnée ;
- conservation de toutes les observations sources ;
- séparation des changements réels et divergences de source ;
- explication du cluster et possibilité de rollback.

**Gate :** aucun cluster ne doit être présenté comme certain sans preuve suffisante.

---

## LOT 6 — Search Read Model ODM 🟠

Objectif : construire un read model de recherche indépendant, observable et réversible.

À livrer :

- schéma de document de recherche canonique ;
- projection des propriétés et observations éligibles ;
- règles de display policy centralisées ;
- provenance et niveau d’information visibles ;
- ranking explicable ;
- pagination et curseurs stables ;
- indexation par ville, quartier, transaction et type ;
- parité fonctionnelle avec la SERP actuelle ;
- métriques de couverture, latence et zéro résultat.

Déploiement obligatoire :

1. Shadow read model ;
2. comparaison offline avec le pipeline actif ;
3. canary interne ;
4. canary public 1 % ;
5. extension progressive seulement si les gates restent verts.

---

## LOT 7 — Search Depth Certification 🟠

Objectif : prouver que le moteur répond utilement aux recherches principales du marché marocain.

Corpus de certification :

- principales villes ;
- quartiers prioritaires ;
- acheter, louer, neuf, terrain, villa, appartement, bureau et commerce ;
- français, arabe, Darija et requêtes mixtes ;
- requêtes naturelles et filtres structurés.

Mesures :

- couverture ;
- précision ;
- taux de zéro résultat ;
- diversité des sources ;
- fraîcheur ;
- taux de résultats incomplets ;
- taux de doublons visibles ;
- qualité des redirections ;
- latence p50, p95 et p99.

**Gate stratégique de lancement :** profondeur satisfaisante dans les principaux marchés marocains, sans sacrifier provenance, légalité, fraîcheur ou qualité.

---

## LOT 8 — UX/UI Integration & Premium Experiences 🟡

**PR #140 — Draft d’intégration, actuellement conflictuelle**

Périmètre :

- Search Session et historique ;
- Map Atlas ;
- exploration interactive des prix ;
- sélection et comparaison de propriétés ;
- Property Passport ;
- intelligence quartier ;
- heatmaps et quartiers similaires.

Avant merge :

- résoudre les conflits avec `main` sans écraser les contrats DATA ;
- préserver la Display Eligibility Policy ;
- valider desktop, tablette et mobile ;
- vérifier accessibilité, TypeScript, build et tests généraux ;
- smoke test manuel de `/search` ;
- aucune activation Production automatique.

---

## LOT 9 — National Coverage Expansion 🟡

Objectif : atteindre une profondeur nationale utile et équilibrée.

Priorités :

- combler les écarts hors Casablanca ;
- renforcer Rabat–Salé–Témara, Marrakech, Tanger, Agadir, Fès, Meknès, Kénitra, El Jadida, Oujda, Tétouan et pôles secondaires ;
- utiliser sitemaps publics, index publics, Common Crawl et feeds autorisés ;
- augmenter les représentations exploitables sans abaisser les gates ;
- conserver les signaux non autorisés en interne uniquement.

Cible long terme : **100 000+ représentations exploitables**, sans confondre volume brut et inventaire publiable.

---

## LOT 10 — Final Production Release Gate 🟡

Conditions cumulatives :

- Source Registry complet pour les sources activées ;
- qualité économique certifiée ;
- fraîcheur opérationnelle ;
- dédoublonnage V3 validé ;
- Search Read Model en canary réussi ;
- Search Depth Certification réussie ;
- UX/UI intégrée sans régression ;
- arabe, responsive et accessibilité validés ;
- observabilité, alertes et rollback disponibles ;
- revue légale et sécurité terminées ;
- une seule séquence de déploiement Production consolidée.

**Aucune nouvelle feature non critique ne doit retarder ce gate.**

---

## 5. Ordre d’exécution verrouillé

1. finaliser et merger ODM Audit Validator V1 ;
2. compléter Source Registry V2 ;
3. certifier Economic Truth Pipeline V2 ;
4. renforcer Freshness Machine V2 ;
5. construire Property Graph & Dedup V3 ;
6. construire le Search Read Model ODM en Shadow ;
7. exécuter Search Depth Certification ;
8. intégrer les UX Waves sans conflit avec DATA ;
9. combler les gaps de couverture nationale ;
10. exécuter le Final Production Release Gate.

---

## 6. Ce qui est explicitement gelé

Jusqu’au passage du Final Production Release Gate :

- nouvelles features périphériques non critiques ;
- activation massive d’un scraper ;
- publication automatique de Thin Index ;
- changement de ranking sans expérience contrôlée ;
- bascule complète vers ODM sans Shadow et Canary ;
- chiffres marketing non reliés à une métrique définie ;
- prétention qu’une annonce est vérifiée ou certifiée sans preuve correspondante.

---

## 7. Définition de « terminé »

Un LOT n’est terminé que lorsque :

- le code ou la documentation est mergé dans `main` ;
- les tests ciblés sont verts ;
- TypeScript et build sont verts lorsque concernés ;
- la preuve connectée est disponible lorsque le LOT touche les données ;
- les migrations sont vérifiées et réversibles ;
- aucune activation publique non autorisée n’a eu lieu ;
- la PR, le SHA et les limites résiduelles sont documentés.

---

## 8. Prochain point de départ

**Prochaine mission recommandée : terminer la PR #139 — ODM Audit Validator V1.**

Aucune activation SERP ne doit être faite dans ce LOT. La sortie attendue est un validateur économique et de provenance certifié, mergé et prêt à alimenter les étapes suivantes en Shadow.
