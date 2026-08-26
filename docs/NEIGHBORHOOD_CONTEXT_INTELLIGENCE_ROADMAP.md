# AkarFinder — Neighborhood Context Intelligence — ROADMAP

Date : 2026-08-26
Base produit vérifiée : `main@89b033e40ecb74521fdd3c22f5669857f7ad1e4b`
Human gate final : **VALIDÉ par l’utilisateur le 2026-08-26**
Statut : **CLOSED — 7/7 lots fermés = 100 %**

## Goal global

Construire une couche nationale de repères utiles de quartier où Carte, page quartier, homepage et `Vivre ici` utilisent une même vérité POI, avec provenance, fraîcheur et précision territoriale explicites.

Chaîne livrée :

`Quartier canonique → POI vérifiés → anchors utiles → read-model → Carte → page quartier → homepage → listing → certification nationale`

## Critères globaux — état final

- source POI reproductible et hors render path : ✅
- source / licence / attribution / fraîcheur conservées : ✅
- relation POI ↔ quartier explicite et fail-closed : ✅
- sélection d’anchors déterministe et diversifiée : ✅
- même read-model sur Carte / page quartier / homepage / listing : ✅
- aucune minute depuis un centroïde quartier : ✅
- aucune appartenance « dans le quartier » sans preuve territoriale : ✅
- Carte map-first : ✅
- couverture nationale mesurée avec `covered | partial | insufficient | unavailable` : ✅
- stale/rejected non publiés : ✅
- certification tests + TypeScript + build + UI + revue humaine : ✅
- aucun Vercel sans autorisation explicite : ✅ aucun Vercel effectué dans ce chantier.

## Correspondance des lots

| Lot canonique | Exécution | Statut |
|---|---|---|
| 1 — Réconciliation + contrat | PR #902 | ✅ CLOSED |
| 2 — National POI Source + Registry | PR #904 (`L1`) | ✅ CLOSED |
| 3 — Assignment + Anchor Selection | PR #906 (`L2`) | ✅ CLOSED |
| 4 — Read Model + API | PR #907 (`L3`) | ✅ CLOSED |
| 5 — Carte Repères + Semantic Zoom | PR #913 (`L4`) | ✅ CLOSED |
| 6 — Surface Convergence | PR #918 (`L5`) | ✅ CLOSED |
| 7 — National Scale + Quality/Freshness | PR #931 (`L7-A/L7-B`) | ✅ CLOSED |

## Preuves clés Lots 1–6

- Lot 1 : PR #902, merge `58de80ff29bf128a3881bfc5951be6380baaecab`.
- Lot 2 : PR #904, merge `b2a899eaf11f945e980a3c39f4e195c51270b859`.
- Lot 3 : PR #906, merge `fb177022594f5cbc7a628e3edad3c4ffd5ec0ae5`.
- Lot 4 : PR #907, merge `c304e4bd0ae0b23334fe3a6c510459ecedf7c77f`.
- Lot 5 : PR #913, merge `ff7ab0e9ba5acd59dd143084dc8cbb593eb62923`; BEFORE `32911680354`, artifact `9586788602`.
- Lot 6 : PR #918, merge `dcf690de81abf1d8b14fff0fbe9f89201ff13e6d`; run `32965282547` SUCCESS; artifact `9605551739`; 16/16 captures 390/430/768/1280; `report.json ok=true`; 0 finding / overflow / page error; score visuel **9,5/10**.

## Lot 7 — National Scale + Quality / Freshness ✅ CLOSED

### Livré

- baseline national : **21 quartiers / 8 villes** ;
- couverture réelle : **1 covered / 1 partial / 2 insufficient / 17 unavailable** ;
- **6** read-models runtime / **15** quartiers sans modèle ;
- **12 anchors**, tous frais, provenance complète ;
- **17** cibles queryables ;
- **4** cibles bloquées faute de repère fiable : Racine, Aïn Diab, Bourgogne, Souissi ;
- freshness policy : **30 jours** ;
- refresh reproductible hors render path ; mode par défaut `plan` = **0 réseau** ;
- live uniquement avec endpoints explicitement configurés ;
- fail-closed si source indisponible ;
- 5 canaries ;
- détection de downgrade couverture / anchor drop / perte fraîcheur ;
- baseline + refresh conservent `poi_id`, source/URL, attribution, `license_policy`, `license_url`, `observed_at`, fraîcheur ;
- coût opérationnel : 0 appel réseau par défaut ; coût monétaire provider non certifiable sans provider payant configuré, donc aucun montant inventé ;
- taille read-model runtime : **10 915 octets / 10,659 KiB** ;
- baseline sérialisé : **15 550 octets / 15,186 KiB** ;
- latence read-model : **0,398 ms médiane / 0,903 ms p95 / 1,079 ms max** ; aucun seuil arbitraire ;
- régression **NCI L1–L6 + L7-A/L7-B : PASS** ;
- TypeScript : PASS ;
- build production : PASS ;
- L7-B ne modifie aucun fichier UI produit ; certification visuelle L6 conservée ; smoke transversal observé à **48 captures / 0 finding** ;
- aucun Vercel.

### Preuve exacte

- L7-A : run `32977534630` SUCCESS, artifact `9610110450` ;
- PR L7-B : #931 ;
- exact HEAD : `13e9483fc32df8af6bd49426b57b29eefe593728` ;
- run final : `32983514419` SUCCESS ;
- artifact : `9612476675` ;
- digest : `sha256:f7a624ce468f496a1f342eee4bdbddafda68ea5650af75a0461ac2b41b746640` ;
- `quality-report.json` : `ok=true`, 0 finding ;
- provenance : 12 anchors / 0 evidence manquante ;
- merge produit : `89b033e40ecb74521fdd3c22f5669857f7ad1e4b` ;
- closeout pré-human-gate : PR #932, merge `34bb6358b0d922fc629bd7068be48b39f404dfd0` ;
- human gate final utilisateur : **VALIDÉ**.

## Incident utile corrigé

Le validator renforcé a détecté que la projection L7-A perdait `source_url`, `license_policy` et `license_url` alors que L3 les conservait. La projection a été corrigée ; le validator n’a pas été affaibli.

Les workflows L4/L5 ne rejouent plus leurs audits BEFORE sur une PR L7 ; leurs tests déterministes restent inclus dans le gate L7.

## Avancement final

- Lots 1–7 : **CLOSED ✅**
- **Global vérifié : 7/7 = 100 %**
- Chantier NCI : **CLOSED**

## Post-closeout

Aucun déploiement Vercel n’a été effectué. Toute activation live provider ou tout déploiement futur reste un chantier séparé et nécessite les autorisations correspondantes.
