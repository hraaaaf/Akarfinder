# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-4.0 — Large Reservoir Depth Audit ✅ PR #341**  
**Prochain lot DATA : DATA-4.1 — Avito Internal Reservoir Recovery Audit**  
**Lot UX acquis : CARTE-QUARTIER-P1A.2 — Search Geo Contract ✅ PR #334**  
**Prochain lot UX : CARTE-QUARTIER-P1A.3 — Map State & Navigation**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

`main` inclut notamment :

- Mon Projet P1B ✅ PR #318 ;
- CARTE-QUARTIER-P1A.0 ✅ PR #327 ;
- CARTE-QUARTIER-P1A.1 ✅ PR #328, score **9,5/10** ;
- CARTE-QUARTIER-P1A.2 ✅ PR #334 ;
- DATA-1.1 ✅ PR #322 ;
- DATA-1.2 ✅ PR #323 ;
- DATA-1.3A ✅ PR #324 ;
- DATA-1.3B ✅ PR #326 ;
- DATA-1.4 ✅ PR #329 ;
- DATA-1.5 ✅ PR #331, score **9,4/10** ;
- DATA-1.6A ✅ PR #333, score **9,5/10** ;
- DATA-1.6B ✅ PR #338 + #339, score **9,6/10** ;
- DATA-4.0 ✅ PR #341, merge `de1368e`, score **9,6/10**.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search reste canonique et Map reste son complément spatial.

# DATA — acquis structurants

## DATA-1 Census / Registry ✅

- reserve B3 : **37 009 URLs / 7 051 domaines** ;
- Common Crawl : **300/300 Parquet**, **8 727 registered domains** ;
- univers réconcilié : **15 238 domaines** ;
- `PRIMARY_SOURCE_CANDIDATE` : **230** ;
- `PORTAL_CANDIDATE` : **625** ;
- 20 domaines P0 audités techniquement, 19 review-ready ;
- 19 sources policy-reviewed ;
- 19 nouvelles lignes Source Registry appliquées en production ;
- authorization : **1 prohibited / 3 permission_required / 15 unverified** ;
- hidden : **19/19** ;
- états activants : **0**.

## DATA-4.0 — Large Reservoir Depth Audit ✅

PR **#341**, merge `de1368e`, **19/19 workflows verts**, score **9,6/10**.

Contrat :

`PUBLIC VISIBLE → DISCOVERED/SEEDED → NORMALIZED → TECHNICALLY DISPLAYABLE → POLICY-ACTIVABLE`

Preuve live finale :

| Source | Normalized | Technical display | Policy-activable | Unavailable | Fresh confirmed |
|---|---:|---:|---:|---:|---:|
| Avito | **23 925** | **231** | **0** | **22 227** | **10** |
| Mubawab | **11 209** | **3 357** | **0** | **7 506** | **902** |
| **Total** | **35 134** | **3 588** | **0** | **29 733** | **912** |

Sécurité du lot :

- DB writes : **0** ;
- policy changes : **0** ;
- scraper runs : **0** ;
- sitemap harvests : **0** ;
- direct fetches : **0**.

### Avito

- **23 925** rows normalisées au sens pipeline ;
- **22 227 (~92,9 %) `normalization_status=unavailable`** ;
- seulement **10 `fresh_confirmed`** ;
- **231** technical display-eligible ;
- **0 policy-activable** avec la policy actuelle ;
- aucun compteur national immobilier fiable n’a été inventé ;
- le sitemap déclaré reste un signal technique, pas une permission.

### Mubawab

- **11 209** normalized ;
- **3 357** technical display-eligible ;
- **902** fresh-confirmed ;
- compteur public borné observé : **106 947** ;
- gap public→normalized : **95 738** ;
- **0 policy-activable** ;
- la policy actuelle impose de traiter ce gap via partenariat/licence ou mode public-index explicitement admissible, jamais comme permission de crawl.

Conclusion : **technical displayable ≠ policy-activable**. Les grands reservoirs actuels ne doivent pas être comptés comme stock public AkarFinder.

# Prochain lot DATA — DATA-4.1

## Avito Internal Reservoir Recovery Audit

Objectif : expliquer et segmenter les **22 227 lignes Avito déjà détenues** en `normalization_status=unavailable`, sans aucune nouvelle observation réseau.

### DATA-4.1A — Read-only recovery census

Scope :

- lire uniquement les données déjà présentes ;
- croiser `thin_index_normalized_documents_v2`, `source_offer_seeds`, `discovery_candidates` et les observations/provenances existantes ;
- identifier les causes d’`unavailable` ;
- mesurer les signaux récupérables depuis les données existantes : title/snippet, city, intent, property type, price, surface, canonical URL, provider/provenance ;
- classifier chaque cas dans :
  - `RECOVERABLE_FROM_EXISTING_DATA` ;
  - `INSUFFICIENT_EXISTING_EVIDENCE` ;
  - `POLICY_BLOCKED_FOR_NEW_OBSERVATION` ;
  - `NOISE_OR_NON_LISTING` ;
- zéro write ;
- zéro fetch Avito ;
- zéro sitemap traversal ;
- zéro policy change ;
- zéro publication.

Sortie attendue :

`22 227 unavailable → cause → volume → recoverable fields → confidence → next action`

Gate fondamentale : **un gain de normalisation interne n’est jamais présenté comme nouvel inventaire public tant que la Source Registry Avito reste hidden/internal-only.**

### Après 4.1A

Seulement si une récupération déterministe et suffisamment fiable est démontrée : définir un sous-lot de shadow recovery séparé, puis canary/certification avant tout write de production.

# UX — handover

## CARTE-QUARTIER-P1A.2 ✅

`district` est un filtre Search structuré et le routing fail-closed évite les élargissements silencieux à la ville.

## Prochain UX — P1A.3 Map State & Navigation

Cible :

`/map?city=rabat&district=agdal&layer=explore&project_id=...`

Conserver `city`, `district`, `layer`, filtres/intention utiles et `project_id` avec Back/Forward et liens partageables.
