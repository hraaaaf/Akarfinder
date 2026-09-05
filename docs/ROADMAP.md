# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-09-05**  
**Statut : MARKET COVERAGE — MASS DISCOVERY ACTIVE**

> **SOURCE UNIQUE DE VÉRITÉ GLOBALE.**
> Ce fichier est la seule boussole pour la stratégie, les priorités, les jalons, la couverture et l’ordre d’exécution AkarFinder.
> Les autres fichiers `*_CANONICAL.md` sont des specs canoniques **de leur périmètre seulement** ; ils ne remplacent jamais cette roadmap globale.
> `docs/SESSION.md` est un handover court et doit toujours renvoyer ici.

---

## 1. NORTH STAR

Construire le **Property Graph le plus large possible du marché immobilier marocain** à partir de surfaces publiques récupérables et traçables, avec bruit accepté au stade de découverte puis classement, déduplication et fraîcheur en aval.

### Objectifs quantitatifs

- **Stretch discovery : >= 250 000 candidates L0/L1 uniques** ;
- **Goal principal : >= 200 000 candidates exploitables** ;
- mesurer séparément les **clusters probablement uniques** et les **annonces probablement actives** ;
- ne jamais présenter `candidate`, `URL`, `ID source` ou `représentation` comme un bien immobilier unique sans preuve dédiée.

Le cap 200k porte donc d’abord sur un **lac de découverte massif**, pas sur une affirmation de 200k biens uniques actifs.

---

## 2. DOCTRINE DE COUVERTURE

### Couches

| Couche | Définition | Tolérance au bruit |
|---|---|---|
| **L0 — Discovery** | URL / ID / représentation candidate avec provenance | élevée |
| **L1 — Observed** | candidate effectivement observée sur une surface publique autorisée | moyenne |
| **L2 — Normalized** | ville, type, transaction, prix, surface, source, etc. normalisés quand disponibles | faible |
| **L3 — Active** | preuve récente et explicite que l’annonce paraît encore active | minimale |

### Règle fondamentale

**Collecter large, conserver la preuve, dédupliquer tard.**

On ne détruit pas une ligne source parce qu’elle ressemble à une autre. On conserve la provenance puis on crée un `property_cluster_id` avec un niveau de confiance.

### Champs minimaux à préserver

`source`, `source_id`, `source_url`, `canonical_url`, `title`, `city`, `district`, `transaction`, `property_type`, `price`, `surface`, `phone_hash`, `image_hash`, `first_seen`, `last_seen`, `evidence`, `layer`, `freshness_confidence`, `property_cluster_id`.

### KPI obligatoire par lane

`found -> overlap/already_seen -> net_new -> candidate_union -> probable_unique -> live_confidence`

Aucune lane n’est jugée sur le nombre de pages parcourues seul.

---

## 3. NON-NÉGOCIABLES

- respecter `robots.txt`, limites publiques et contraintes explicites des sources ;
- aucun contournement login, CAPTCHA, paywall, anti-bot ou API privée ;
- **Avito : 0 requête directe** pour les lanes d’indexation indirecte ;
- provenance et evidence obligatoires ;
- bruit accepté en L0/L1, mais jamais transformé en certitude ;
- `candidate != active` ; `candidate != authorization` ; `URL != property unique` ;
- ne jamais annoncer `100 %` sans dénominateur mesurable ;
- déduplication non destructive ;
- CI en cours n’arrête pas les travaux indépendants ;
- **aucun déploiement Vercel sans autorisation explicite** ;
- **aucune écriture Supabase / production sans gate humain explicite séparé**.

---

## 4. SCOREBOARD CERTIFIÉ — AVITO INDIRECT

| Lane | Found | Overlap | Net-new | Union certifiée | Statut | Preuve |
|---|---:|---:|---:|---:|---|---|
| Kaynly public graph | 5 807 | — | 5 807 | **5 807** | ✅ EXHAUSTED | artifact `9965997820`, SHA256 `a315502dd6e4cc59d6c4dfcac8199d12ae6f15e023a110d10b1006f68a35301c` |
| Common Crawl RE exact | 782 | 8 | 774 | **6 581** | ✅ CLOSED | artifact `9968819905`, digest `0376eda9950b3afbef8f298436a84931d8ac271b7fdffaa964b66607c9052c6f` |
| Wayback 2025–2026 | 0 | 0 | 0 | 6 581 | ⏸ PARKED | rendement nul |
| AlerteImmo 8 shards | 4 813 | 418 | 4 395 | **10 976** | ✅ SUPERSEDED BY FULL | run `33970879901`, artifact `9970941650` |
| **AlerteImmo full sitemap 24 shards** | **14 540** | **5 777** | **8 763** | **19 739** | ✅ CLOSED | run `33971383335`, artifact `9971118875`, digest `sha256:8db625a5217b4032af9b5a9202e74603c3b6c2d5f4f4f612eb3fa56b79455393` |

### Certification AlerteImmo full

- sitemap : **4 434 / 4 434 routes visitées** ;
- 24/24 shards complets ;
- erreurs : **0** ;
- direct Avito requests : **0** ;
- contenu Avito fetché : **non** ;
- gain vs baseline 10 976 : **+79,84 %** ;
- `exhaustive_claim` limité au **sitemap public AlerteImmo observé**, jamais à Avito entier ni au marché entier.

**Baseline Avito indirecte canonique actuelle : 19 739 IDs candidats certifiés.**

---

## 5. PROBE DE RÉCUPÉRABILITÉ MULTI-SITES — 2026-09-05

Run `33971441131` ✅ SUCCESS ; artifact `9971074508`, digest `sha256:0899ec82c4d0dd876578a23c9735486ee4f6772c734a7770926538884708c054`.

| Source | robots lisible | Racine autorisée | Sitemap observé | Décision immédiate |
|---|---|---|---:|---|
| **Akaar** | ✅ | ✅ | 7 locs | **NEXT — inspecter sitemap puis mass discovery** |
| **Domio** | ✅ | ✅ | 6 locs | **NEXT — inspecter sitemap puis mass discovery** |
| **MarocAnnonces** | ✅ | ✅ | 0 | **NEXT — cartographier pagination publique** |
| **ImmoDirect** | ✅ | ✅ | 10 locs observées | **NEXT — inspecter les sitemap indexes** |
| **MAnonce** | ✅ | ✅ | 0 | PROBE pagination / routes publiques |
| **Sarout** | ✅ | ❌ racine | 0 | HOLD direct ; chercher uniquement route explicitement autorisée / surface tierce |
| **MarocImmo** | ✅ | ❌ racine | 0 | HOLD direct ; chercher uniquement route explicitement autorisée / surface tierce |
| **Sekna** | ✅ | ❌ racine | 0 | HOLD direct ; chercher uniquement route explicitement autorisée / surface tierce |

`root_allowed=false` interdit de transformer un gros chiffre marketing en permission implicite. Le volume potentiel ne prime jamais sur les contraintes publiques.

---

## 6. RÉSERVOIRS ET PRIORITÉS

Les chiffres externes non certifiés servent uniquement à **prioriser les probes**. Ils ne comptent pas dans le score canonique avant artifact de découverte.

### Tier A — exécution prioritaire

1. **Mubawab** — inventorier d’abord les artifacts/runs déjà présents dans le repo ; l’utilisateur signale >30k déjà trouvées, mais aucun exact canonique ne sera publié avant réconciliation artifact.
2. **Akaar** — racine autorisée, sitemap présent ; forte priorité.
3. **Domio** — racine autorisée, sitemap présent.
4. **MarocAnnonces** — racine autorisée ; construire un crawler de pagination borné, checkpointé et robots-aware.
5. **ImmoDirect** — racine autorisée, sitemap/index présent.

### Tier B — lanes complémentaires

- MAnonce ;
- Agenz ;
- Yakeey ;
- autres agrégateurs / portails marocains dont l’accès public est prouvé ;
- surfaces tierces qui exposent légalement des liens source.

### Tier C — découverte indirecte massive

- Common Crawl collections multiples / fenêtres temporelles ;
- moteurs/index publics ou APIs de recherche autorisées ;
- archives publiques ;
- sitemaps/SEO lattices ;
- datasets publics ;
- partner feeds / exports fournis volontairement.

Une lane à fort bruit peut rester utile si son **net-new marginal** est élevé et sa provenance est conservée.

---

## 7. ROADMAP QUANTITATIVE

| Jalon | Critère | État |
|---|---|---|
| **M10K** | >=10k candidates certifiées sur une union mesurable | ✅ atteint |
| **M20K** | >=20k candidates certifiées | 🟡 **19 739 — à 261 du seuil** |
| **M25K** | >=25k candidates | NEXT |
| **M50K** | >=50k candidates | PLANNED |
| **M100K** | >=100k candidates | PLANNED |
| **M200K** | >=200k candidates exploitables | NORTH STAR |
| **M250K+** | >=250k L0/L1 discovery candidates | STRETCH |

### Definition of Done — M200K

M200K n’est CLOSED que si :

1. `candidate_union >= 200 000` après normalisation minimale des identifiants ;
2. provenance/evidence disponible pour **100 %** des candidates conservées ;
3. score par `source`, `ville`, `layer`, fraîcheur et statut publié ;
4. doublons exacts supprimés du compteur d’union mais représentations sources conservées ;
5. clustering probable non destructif disponible ;
6. distribution `L0/L1/L2/L3` publiée ;
7. limites robots / droits / zones non récupérables documentées ;
8. aucun chiffre `active` ou `unique property` inféré à partir du seul volume candidate.

---

## 8. PIPELINE CIBLE

`DISCOVER -> RAW EVIDENCE ARTIFACT -> NORMALIZE -> EXACT DEDUPE -> CANDIDATE LAKE -> PROBABILISTIC CLUSTER -> FRESHNESS SCORE -> SEARCH/INDEX ELIGIBILITY`

### Règle de promotion

- L0/L1 peuvent être massifs et bruyants ;
- L2 exige normalisation suffisamment fiable ;
- L3 exige evidence récente ;
- Search/production constitue un **gate séparé** du discovery lake.

Le lac de candidats n’accorde aucune autorisation de publication riche.

---

## 9. RÈGLES DE DÉDUPLICATION

### Exact

- même `source + source_id` ;
- même canonical URL ;
- identifiant provider stable identique.

### Probable — cluster uniquement, jamais suppression destructive

Combinaisons possibles :
- `phone_hash + city + price + surface` ;
- `image_hash` / perceptual image signature ;
- titre normalisé + quartier + surface + prix ;
- coordonnées proches + caractéristiques convergentes.

Chaque cluster garde toutes ses représentations et un `cluster_confidence`.

---

## 10. RÈGLES DE RENDEMENT / STOP

Après un probe ou premier batch :

- **>=1 000 net-new** : full sweep prioritaire ;
- **300–999 net-new** : continuer si coût faible, en parallèle d’une autre lane ;
- **<300 net-new** : lane secondaire / park sauf evidence d’un réservoir non encore atteint ;
- erreurs, truncation et couverture de sitemap doivent être affichées séparément ;
- un run `SUCCESS` ne signifie jamais automatiquement que la lane a atteint son Goal.

---

## 11. FILE D’EXÉCUTION CANONIQUE — NOW

1. ✅ **Certifier AlerteImmo full sitemap** -> CLOSED à **19 739** union Avito indirecte.
2. ✅ **Probe multi-sites** -> CLOSED ; Akaar/Domio/MarocAnnonces/ImmoDirect/MAnonce récupérables au niveau racine, trois autres HOLD direct.
3. 🔵 **Mubawab inventory & reconciliation** -> retrouver les artifacts existants, mesurer exact found/duplicates/net-new et établir la baseline Mubawab canonique.
4. 🔵 **Akaar sitemap expansion** -> compter les vraies URLs de listing / sources exposées et mesurer net-new.
5. 🔵 **Domio sitemap expansion**.
6. 🔵 **MarocAnnonces pagination expansion**.
7. 🔵 **ImmoDirect sitemap expansion**.
8. 🟡 **MAnonce route probe**.
9. 🟡 **Agenz / Yakeey / autres surfaces autorisées**.
10. 🟡 **Common Crawl multi-collection + search indexes + archives** pour bruit contrôlé et rattrapage historique.
11. **Unifier le Candidate Lake** : exact dedupe + provenance + layer + freshness + clusters.
12. **Gate humain séparé** avant toute écriture Supabase/search prod ou déploiement Vercel.

La règle d’or de la file : **le chantier ne s’arrête pas parce qu’une CI indépendante est pending**.

---

## 12. HISTORIQUE STRUCTUREL — CLOSED, À NE PAS RESSUSCITER

### DATA MASS-INDEX — 8/8 CLOSED

M0→M7 restent fermés. Les preuves détaillées historiques restent dans leurs docs (`docs/MASS_INDEX.md`, closeouts ingestion, Common Crawl V1.2, etc.).

Vérités à conserver :
- `source_offer_seeds` / représentations publiques ne sont pas des biens uniques ;
- provenance ≠ permission ;
- quality ≠ eligibility ≠ permission ;
- Search activation / contenu riche / partenariat restent des gates séparés ;
- les anciennes preuves ne définissent plus la priorité courante : **la priorité courante est MARKET COVERAGE / M200K**.

### Homepage / visuel / ranking / SEO

Les lots CLOSED gardent leurs preuves dans les specs de périmètre et le README. Ils ne concurrencent pas cette roadmap pour définir le **Next exact**.

---

## 13. NEXT EXACT

**Atteindre M25K puis M50K sans attendre une source parfaite.**

Action immédiate :
1. réconcilier le stock Mubawab déjà découvert dans les artifacts GitHub ;
2. en parallèle, ouvrir Akaar puis Domio/MarocAnnonces/ImmoDirect selon rendement ;
3. unionner chaque lane dans le Candidate Lake en publiant `found / overlap / net-new / union` ;
4. conserver le bruit en L0/L1 au lieu de le supprimer prématurément.

**Boussole : 250k discovery candidates -> >=200k exploitables -> clusters/fraîcheur mesurés séparément.**
