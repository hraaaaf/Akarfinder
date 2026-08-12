# DATA MASS-2B — High-Yield Source Policy Review

**Statut : ACTIVE — certification required**  
**Branche : `data/mass-2b-high-yield-sources`**  
**Prédécesseur : MASS-2A merge `6cd7625b2ba8e7179ce556841f6306225ba1a3fa`**

## 1. Responsabilité du lot

Auditer les **20 domaines HIGH_YIELD certifiés par MASS-2A** et produire une posture de source explicite, prouvée et fail-closed. MASS-2B ne modifie ni le Source Registry, ni la DB, ni Search et n'ingère aucune annonce.

Le lot sépare volontairement deux axes qui ne doivent jamais être confondus :

1. **Acquisition depuis la source** — est-ce qu'AkarFinder dispose d'une base publique explicite pour crawler/extract/reuse directement le contenu de ce site ?
2. **Indexation publique minimale** — une représentation minimale attribuée (`Source : X` + lien canonique), obtenue sur une base autorisée distincte, peut-elle être envisagée ?

**L'attribution n'annule jamais les CGU d'une source.** Une interdiction de scraping/extraction bloque l'acquisition directe, mais ne transforme pas automatiquement un simple lien canonique en contenu interdit. Inversement, `CANONICAL_LINK_ONLY_CANDIDATE` n'est **pas une autorisation** : une baseline juridique/policy séparée ou une permission explicite reste nécessaire avant activation.

## 2. Doctrine AkarFinder verrouillée

- modèle : `ATTRIBUTED_MINIMAL_INDEX` ;
- nom de la source et lien canonique obligatoires pour toute future représentation tierce ;
- aucune photo source et aucune description complète par défaut ;
- aucune acquisition directe sans preuve positive de canal ;
- robots.txt / sitemap / capacité technique ≠ permission ;
- absence ou ambiguïté de CGU = `HOLD` ;
- `PERMISSION_REQUIRED` signifie qu'une permission/partenariat ou autre base explicitement validée est requise pour l'acquisition directe ;
- les 20 sources restent `allowedChannels = NONE_ONLY`, `publicActivableNow=false`, `registryWriteAllowed=false`, `permissionInferred=false` dans ce lot.

## 3. Cohorte immuable et résultat de revue

| # | Domaine | Score MASS-1 | Décision 2B | Acquisition directe | Index minimal attribué |
|---:|---|---:|---|---|---|
| 1 | marocannonces.com | 70.25 | `PERMISSION_REQUIRED` | bloquée par CGU | candidat canonical-link-only |
| 2 | domio.ma | 67.28 | `PERMISSION_REQUIRED` | aucun grant public de reuse trouvé | candidat canonical-link-only |
| 3 | 1000-annonces.com | 66.75 | `PERMISSION_REQUIRED` | bloquée par CGU | candidat canonical-link-only |
| 4 | 2p.ma | 65.50 | `HOLD` | CGU non résolues | non résolu |
| 5 | sakane.ma | 65.14 | `PERMISSION_REQUIRED` | bloquée par CGU | candidat canonical-link-only |
| 6 | yakeey.com | 65.05 | `PERMISSION_REQUIRED` | bloquée sans accord spécifique | candidat canonical-link-only |
| 7 | ma.afribaba.com | 64.14 | `PERMISSION_REQUIRED` | automatisation/copie restreintes | candidat canonical-link-only |
| 8 | milkiya.ma | 64.13 | `PERMISSION_REQUIRED` | bloquée par CGU | candidat canonical-link-only |
| 9 | dabaannonce.ma | 63.14 | `HOLD` | CGU non résolues | non résolu |
| 10 | immo.mitula.ma | 61.08 | `PERMISSION_REQUIRED` | bloquée par CGU LIFULL | candidat canonical-link-only |
| 11 | immobilier.trovit.ma | 60.79 | `PERMISSION_REQUIRED` | bloquée par CGU LIFULL | candidat canonical-link-only |
| 12 | housing.place | 59.02 | `PERMISSION_REQUIRED` | bloquée par notices légales | candidat canonical-link-only |
| 13 | portail-immobilier.ma | 58.67 | `PERMISSION_REQUIRED` | aucun grant public downstream trouvé | candidat canonical-link-only |
| 14 | souqcity.ma | 58.35 | `PERMISSION_REQUIRED` | bloquée sans permission | candidat canonical-link-only |
| 15 | nuroa.ma | 55.14 | `PERMISSION_REQUIRED` | bloquée par CGU LIFULL | candidat canonical-link-only |
| 16 | darkom.ma | 54.18 | `PERMISSION_REQUIRED` | robots/extraction restreints par CGU | candidat canonical-link-only |
| 17 | annoncesmaroc.ma | 53.47 | `PERMISSION_REQUIRED` | reproduction/tiers restreints | candidat canonical-link-only |
| 18 | flaha.ma | 53.07 | `HOLD` | robots bloqué + CGU non résolues ; aucun bypass | non résolu |
| 19 | expat.com | 51.37 | `PERMISSION_REQUIRED` | reuse/exploitation restreints | candidat canonical-link-only |
| 20 | sekna.ma | 49.83 | `PERMISSION_REQUIRED` | scraping/crawlers explicitement restreints | candidat canonical-link-only |

### Distribution

- **20/20** domaines audités ;
- **17 `PERMISSION_REQUIRED`** ;
- **3 `HOLD`** : `2p.ma`, `dabaannonce.ma`, `flaha.ma` ;
- **0** acquisition directe autorisée ;
- **17** `CANONICAL_LINK_ONLY_CANDIDATE` ;
- **0** `CANONICAL_LINK_ONLY` approuvé ;
- **0** activation publique ;
- **0** write Registry/DB/policy.

## 4. Preuves officielles principales

Le manifeste machine `data/data-mass-2b/high-yield-source-review.json` conserve les URL officielles utilisées pour chaque source. Exemples structurants :

- MarocAnnonces — `https://www.marocannonces.com/conditions-utilisation.html` ;
- Domio — page officielle conditions/terms ;
- 1000 Annonces — `https://www.1000-annonces.com/cg.php` ;
- Sakane — `https://www.sakane.ma/conditions-generales-d-utilisation_` ;
- Yakeey — `https://yakeey.com/fr-ma/cgu` ;
- Afribaba Maroc — `https://ma.afribaba.com/terms.php?mobile=true` ;
- Milkiya — `https://ami.milkiya.ma/conditions-generales-dutilisation/` ;
- Mitula / Trovit / Nuroa — LIFULL Connect legal notice ;
- Housing.Place — `https://housing.place/en-ma/pages/legal-notices` ;
- Portail Immobilier — `https://portail-immobilier.ma/conditions-generales.php` ;
- SouqCity — official usage agreement ;
- Darkom — official CGU ;
- AnnoncesMaroc — official conditions ;
- Expat.com — official terms ;
- Sekna — `https://sekna.ma/cgu`.

Pour `2p.ma`, `dabaannonce.ma` et `flaha.ma`, le lot ne fabrique aucune conclusion positive à partir d'une absence de preuve. `flaha.ma` n'a fait l'objet d'aucun contournement de robots.

## 5. Gate machine MASS-2B

Le workflow `DATA MASS-2B High-Yield Source Review` impose :

- replay du contrat MASS-2A ;
- exact top 20 / rangs / scores ;
- distribution exacte 17/3 ;
- TypeScript + build production ;
- audit production **read-only** du `source_policy_registry` uniquement ;
- firewall CI : aucun réseau source, seulement Supabase ;
- drift fail-closed si un des 20 domaines apparaît dans le Registry après la revue ;
- 0 write / 0 DDL / 0 Registry mutation / 0 ingestion / 0 Search activation ;
- 0 permission inférée ;
- 0 photo ou description source déclarée réutilisable.

## 6. Hors scope

MASS-2B ne tranche pas la baseline générale de droit applicable à un **simple lien canonique + métadonnées factuelles minimales obtenues indépendamment de la source**. Cette question doit être traitée comme un contrat policy/juridique transversal avant d'autoriser `CANONICAL_LINK_ONLY` à grande échelle.

MASS-2B ne contacte pas non plus les propriétaires des sites, ne négocie aucun partenariat et ne transforme aucune preuve de structure/robots/sitemap en permission.

## 7. Critère de fermeture

MASS-2B n'est CLOSED qu'après exact-head CI + artefact live read-only + cohorte 20/20 + zéro drift Registry non revu + score technique ≥9/10. Le prochain sous-lot reste **MASS-2C — Mid-Yield Sources**, seulement après merge de 2B.
