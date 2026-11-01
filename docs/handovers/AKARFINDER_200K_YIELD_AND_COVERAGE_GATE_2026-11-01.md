# Akarfinder — Gate de rendement net et couverture (01/11/2026)

## Goal / succès / preuve
**Goal :** décider si 200 000 annonces fraîches, uniques et réutilisables en 48 h est réaliste. **Succès :** source autorisée, nombre de fiches détaillées distinctes, date d'observation, prix/surface/localité, droit de réutilisation et statut actif démontrés. **Preuve :** artefacts bruts, manifestes SHA-256, contrat/source_policy_registry et mesures par source.

## État observé
- V6.4.5, CI #41327076337 : 3 pages de résultats, 97 observations, 97 IDs source en SQLite, 65 nouveaux relativement aux 32 précédents. **Pas 97 annonces nouvelles sur le marché**, ni 97 biens dédoublonnés inter-sources.
- 32 460 IDs de candidats (Avito 27 106, Mubawab 5 354) restent non vérifiés. Ne pas les additionner aux 97 comme s'ils étaient des biens indépendants.
- V6.4.6 : 116 tests locaux, CI offline #41335628114 verte. Pas de nouveau run live.
- À 32 fiches/page, 200 000 exigeraient **6 250 pages sans aucun chevauchement**. Les 3 pages du pilote ne démontrent pas un catalogue exploitable à cette échelle.
- **Limites :** aucun compteur total de résultats par shard observé dans les preuves ; troncature non mesurée ; date de publication/active non certifiée ; réutilisation commerciale non autorisée par le seul accès public. CGU Mubawab restreignent l'extraction automatisée et les bases concurrentes.

## Plan de mesure (sans requête interdite)
1. Source avec permission écrite enregistrée dans `source_policy_registry`. Définir URLs/pagination et débit **dans la permission**.
2. Capturer une fois la page initiale brute et ses compteurs affichés, pages accessibles, nombre de fiches distinctes et date, avec hash ; ne pas contourner de protections.
3. Calculer pour chaque shard `coverage = IDs_uniques_observés / total_source_affiché` seulement si le dénominateur est fiable. Sinon `UNKNOWN`, jamais 100 %.
4. Mesurer `net_yield = IDs_qualifiés_non_présents_dans_corpus / requêtes` et `reuse_ready = IDs_qualifiés_avec_droits_actif_fraîcheur`.
5. Tester l'extrapolation 48 h avec plafonds contractuels, retraits, chevauchements inter-sources, et coût de vérification. Pas de promesse de 200k si le plafond mesuré est inférieur.
6. Aucun import dans production tant que qualité, droits, dédup et activation ne sont pas approuvés.

## Arbitrage technique
**Ne pas monter `MAX_APPROVED_SHARDS` de 3 à 1000** sans provenance, troncature et autorisation. Priorité aux flux autorisés et exports agence, déjà couverts par `lib/feeds/schema.ts`, `parsers.ts`, `staging.ts` et `docs/data/ODM-10C-PARTNER-FEED-KIT.md`. La préparation d'un feed n'implique pas d'envoyer un message externe.

## Next exact
Obtenir une source/canal dont la permission écrite autorise la mesure ; lancer un seul canary borné puis produire les métriques de couverture et rendement. Si permission indisponible, **GATE EXTERNE — AUCUNE COLLECTE MASSIVE**.