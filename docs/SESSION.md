# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-1.4 — Candidate Reconciliation & Source Prioritization ✅ PR #329**  
**Prochain lot DATA : DATA-1.5 — Candidate Technical Capability Audit**  
**Lot UX certifié : CARTE-QUARTIER-P1A.1 — Geo Canonical Core ✅ PR #328**  
**Prochain lot UX : CARTE-QUARTIER-P1A.2 — Search Geo Contract**

Ce fichier est le handover opérationnel court du projet. L’historique détaillé reste dans Git, les PR et les preuves techniques. `docs/ROADMAP.md` reste l’unique roadmap canonique.

## Main canonique

`main` inclut notamment :

- Mon Projet P1B ✅ PR #318 ;
- CARTE-QUARTIER-P1A.0 ✅ PR #327 ;
- CARTE-QUARTIER-P1A.1 ✅ PR #328, score 9,5/10 ;
- DATA-1.1 ✅ PR #322 ;
- DATA-1.2 ✅ PR #323 ;
- DATA-1.3A ✅ PR #324 ;
- DATA-1.3B ✅ PR #326 ;
- DATA-1.4 ✅ PR #329, merge `2847dd2`.

Invariants conservés : aucune migration DATA-1, aucune activation/policy Source Registry automatique, aucun bypass.

## DATA-1 — acquis

### DATA-1.1 — Domain Census Core ✅

Fondation déterministe et fail-closed : normalisation domaine/URL, agrégation des signaux, adaptateur B3, priorité de revue `HIGH / MEDIUM / LOW / NOISE`.

### DATA-1.2 — Existing Reserve Census ✅

Snapshot Production read-only du 2026-08-07 :

- **37 009 URLs distinctes** ;
- **7 051 domaines** ;
- **554 HIGH / 9 280 URLs** ;
- **429 MEDIUM / 4 880 URLs** ;
- premier batch initial : **983 domaines HIGH + MEDIUM**.

### DATA-1.3A — Common Crawl URL Index Contract ✅

Deux lanes discovery-only :

- `MA_TLD_REAL_ESTATE` ;
- `MOROCCO_EXTERNAL_REAL_ESTATE`.

Aucun WARC fetch, aucune ingestion, aucune permission inférée.

### DATA-1.3B — Common Crawl Live Evidence ✅

PR **#326**, merge `b69b3e6`.

Preuve `CC-MAIN-2026-25` :

- **300/300 Parquet** analysés ;
- **0 échec** ;
- **9 087 hosts bruts** ;
- **8 970 hosts canoniques** après normalisation `www.` ;
- **8 727 registered domains** ;
- lane A `.ma` : **2 056 hosts** ;
- lane B externe Maroc/ville : **7 031 hosts** ;
- aucun WARC/content fetch ;
- aucune écriture Supabase ;
- aucune source activée.

### DATA-1.4 — Candidate Reconciliation & Source Prioritization ✅

PR **#329**, merge `2847dd2`.

Le lot réconcilie en lecture seule :

`B3 reserve + Common Crawl certifié + Source Registry v2`.

Preuve live finale :

- B3 : **7 051 domaines** ;
- Common Crawl : **8 727 registered domains** ;
- Source Registry : **16 domaines** ;
- univers réconcilié : **15 238 domaines** ;
- B3 ∩ Common Crawl : **532** ;
- Common Crawl only : **8 195** ;
- B3 only : **6 506** ;
- déjà dans Source Registry : **16** ;
- **15 222 domaines non enregistrés**.

Classification conservatrice v1 :

- `PRIMARY_SOURCE_CANDIDATE` : **230** ;
- `PORTAL_CANDIDATE` : **625** ;
- `CLASSIFIED` : **22** ;
- `AGGREGATOR` : **29** ;
- `SHORT_TERM_RENTAL` : **94** ;
- `OTHER` : **14 237** ;
- `UNKNOWN` : **1**.

Gate finale sur SHA `c3c2d16` : **20/20 workflows verts**.

Fail-closed confirmé : `readOnly=true`, `writesPerformed=0`, `effectivePoliciesAssigned=0`.

## Top de revue DATA-1.4

Les premiers candidats du rapport final incluent notamment :

1. `limmobiliersansfrontieres.com` — Registry existant, first-party candidate ;
2. `valfoncier.ma` ;
3. `damaneimmo.ma` ;
4. `capital-properties.ma` ;
5. `leaderimmo.ma` ;
6. `immotaroudant.com` ;
7. `mhproperties.ma` ;
8. `immo-maroc.com` ;
9. `proimmobilier.ma` ;
10. `immobest.ma` ;
11. `christiesrealestatemorocco.com` ;
12. `immohammedia.com` ;
13. `rabatimmo.ma` ;
14. `immobilier-pro-maroc.com` ;
15. `agadirimmobilier.ma`.

Portails connus comme `sakane.ma`, `agenz.ma`, `darkom.ma` et `milkiya.ma` restent explicitement séparés des likely first-party sources. Meta-agrégateurs/classifieds/short-term ne peuvent pas être promus en `PRIMARY_SOURCE_CANDIDATE` par le score.

## Doctrine DATA active

Invariant :

`DISCOVERED ≠ AUTHORIZED ≠ INGESTIBLE ≠ DISPLAYABLE`

Pipeline de qualification :

`DISCOVERY → CENSUS → SOURCE REVIEW → POLICY → CONNECTOR CANDIDATE → INGESTION/INDEXATION SI ÉLIGIBLE`

Une capacité technique, une présence Common Crawl ou un score de priorité ne vaut jamais autorisation.

## Prochain lot DATA — DATA-1.5

Objectif : auditer **les capacités techniques** des meilleurs candidats non enregistrés sans encore décider leur policy.

Priorité : `PRIMARY_SOURCE_CANDIDATE` puis portails à forte valeur.

Pour chaque domaine sélectionné, mesurer uniquement des preuves publiques/admissibles :

- disponibilité et contenu de `robots.txt` ;
- sitemap(s) publics ;
- nombre/structure de pages immobilières détectables ;
- JSON-LD / Schema.org / microdata ;
- WordPress générique ;
- Houzez ;
- RealHomes / autres familles CMS réellement observées ;
- REST public déclaré/exposé ;
- XML/CSV/feed public explicitement exposé ;
- fréquence/fraîcheur observable ;
- signaux de login/noindex/blocage ;
- capability score ;
- recommandation de **famille de connecteur candidate**, jamais d’autorisation.

Sortie attendue :

`TOP CANDIDATES → TECH AUDIT → CONNECTOR FAMILY CANDIDATE → SOURCE REVIEW/POLICY`.

Aucun site ne doit être ingéré ou ajouté automatiquement à Source Registry pendant DATA-1.5.

## UX — handover

CARTE-QUARTIER-P1A.1 est mergé via PR #328. Search reste le moteur canonique et `/map` passe par l’identité géographique canonique.

Prochaine étape UX indépendante : **CARTE-QUARTIER-P1A.2 — Search Geo Contract**, avec `district` comme filtre structuré et `q` conservé comme texte libre.
