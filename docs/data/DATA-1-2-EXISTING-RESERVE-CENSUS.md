# DATA-1.2 — Existing Reserve Census — Production Evidence

**Snapshot : 2026-08-07**  
**Mode : production read-only / discovery evidence only**  
**Source : `public.odm_b3_discovery_expansion_audit_v1`**  
**Decision filtrée : `reserve_unregistered_source`**

Ce document enregistre la première mesure réelle du Moroccan Real Estate Web Census à partir du corpus déjà persisté par B3 Discovery Expansion.

> Important : une priorité de revue n’est ni une classification définitive, ni une permission de crawl, ni une policy Source Registry. Tous les domaines restent fail-closed jusqu’à audit explicite.

## 1. Volume réel de la réserve

- URLs en réserve : **37 009** ;
- domaines distincts : **7 051** ;
- URLs sur domaines `.ma` : **8 682** ;
- domaines `.ma` hors bruit connu : **496** ;
- domaines portant un signal lexical immobilier hors bruit connu : **543** ;
- URLs associées à ce signal lexical immobilier : **8 144**.

## 2. Priorité de revue v1

Les règles DATA-1.1 sont volontairement prudentes : elles priorisent la revue à partir de signaux de domaine, sans inférer l’autorisation ni même garantir que le domaine est réellement une source immobilière.

| Priorité | Domaines | URLs observées | Interprétation |
|---|---:|---:|---|
| HIGH | 554 | 9 280 | signal lexical immobilier, ou classified + `.ma` |
| MEDIUM | 429 | 4 880 | `.ma` ou signal classified insuffisant seul |
| LOW | 6 050 | 17 468 | preuve domaine insuffisante ; revue différée |
| NOISE | 18 | 5 381 | plateformes non-property connues dans la liste bornée v1 |
| **Total** | **7 051** | **37 009** | — |

Le gain immédiat est opérationnel : le premier audit peut cibler **983 domaines HIGH + MEDIUM** au lieu de traiter aveuglément les 7 051 domaines.

## 3. Premiers domaines à auditer

Classement par volume d’URLs observées parmi les domaines portant au moins un signal de revue. Les valeurs ci-dessous ne préjugent d’aucune policy.

| Domaine | URLs observées | Providers observés |
|---|---:|---|
| `marocannonces.com` | 1 782 | openserp, serper_mass_harvest |
| `immo.mitula.ma` | 1 675 | openserp, serper_mass_harvest |
| `immobilier.trovit.ma` | 1 653 | openserp, serper_mass_harvest |
| `logic-immo.com` | 1 217 | openserp |
| `dabaannonce.ma` | 794 | openserp, serper_mass_harvest |
| `sakane.ma` | 517 | openserp, serper_mass_harvest |
| `nuroa.ma` | 457 | openserp, serper_mass_harvest |
| `souqcity.ma` | 253 | openserp, serper_mass_harvest |
| `2p.ma` | 243 | openserp, serper_mass_harvest |
| `domio.ma` | 209 | openserp, serper_mass_harvest |
| `1000-annonces.com` | 125 | openserp, serper_mass_harvest |
| `immobilier.cari.ma` | 116 | openserp, serper_mass_harvest |
| `telecontact.ma` | 113 | openserp, serper_mass_harvest |
| `darkom.ma` | 95 | openserp, serper_mass_harvest |
| `flaha.ma` | 93 | openserp, serper_mass_harvest |
| `annonces-express.com` | 84 | openserp, serper_mass_harvest |
| `housing.place` | 75 | openserp |
| `sekna.ma` | 69 | openserp, serper_mass_harvest |
| `portail-immobilier.ma` | 62 | openserp, serper_mass_harvest |
| `souika.ma` | 62 | openserp, serper_mass_harvest |
| `annoncesmaroc.ma` | 57 | openserp, serper_mass_harvest |
| `immohammedia.com` | 55 | openserp, serper_mass_harvest |
| `damaneimmo.ma` | 52 | openserp, serper_mass_harvest |
| `dardar.ma` | 50 | openserp, serper_mass_harvest |
| `milkiya.ma` | 46 | openserp |
| `fendary.ma` | 41 | openserp |
| `leaderimmo.ma` | 41 | openserp, serper_mass_harvest |
| `fadlimmo.com` | 40 | openserp |
| `maisons-maroc.com` | 39 | openserp |
| `beytic.com` | 37 | openserp |
| `rabatimmo.ma` | 36 | openserp, serper_mass_harvest |
| `immobilier-pro-maroc.com` | 35 | openserp |
| `nador.immo` | 35 | openserp, serper_mass_harvest |
| `rents.ma` | 34 | openserp |
| `immotaroudant.com` | 33 | openserp, serper_mass_harvest |
| `mhproperties.ma` | 33 | openserp |
| `immo-maroc.com` | 32 | openserp, serper_mass_harvest |
| `baytibayti.ma` | 29 | openserp |
| `jibril.immo` | 29 | openserp, serper_mass_harvest |

## 4. Bruit confirmé au niveau domaine

La reserve lane contient aussi des résultats de moteurs, réseaux sociaux et plateformes généralistes. La liste bornée v1 retire déjà **5 381 URLs** de la file de revue prioritaire.

Exemples observés : `duckduckgo.com`, `facebook.com`, `instagram.com`, `tiktok.com`, `youtube.com`, `reddit.com`, `google.com`, `linkedin.com`, `stackoverflow.com`.

Cette exclusion est uniquement une optimisation de revue DATA-1. Elle ne supprime aucune observation historique B3.

## 5. Reproductibilité

Export read-only canonique :

`scripts/census/sql/data-1-existing-reserve-export.sql`

Puis :

```bash
npx tsx scripts/audits/data-1-existing-reserve-census.ts \
  --input <export.json> \
  --json <report.json> \
  --markdown <report.md> \
  --top 100
```

Le moteur doit produire :

`raw reserve rows → Domain Census Core → review priority → JSON + Markdown`

## 6. Verdict DATA-1.2

La masse de discovery existe déjà : **7 051 domaines inconnus sont présents dans le corpus B3**. Le prochain goulot n’est donc pas seulement la découverte de nouveaux domaines ; c’est la **qualification** :

1. éliminer le bruit ;
2. distinguer portail / agrégateur / classified / agence / promoteur / autre ;
3. auditer robots, noindex, CGU/licence et conditions d’usage ;
4. attribuer une policy Source Registry explicite ;
5. mesurer la profondeur réelle de chaque source admissible ;
6. seulement ensuite choisir le connecteur d’ingestion/indexation approprié.

La priorité suivante reste DATA-1.3 Common Crawl URL Index en **discovery-only**, mais le corpus B3 existant doit être exploité en premier pour éviter de multiplier du bruit déjà présent.
