# AKARFINDER — Inventaire de sources réellement activables (audit interne 01/11/2026)

## Goal / critère / preuve
**Goal** : identifier un canal immédiatement utilisable et légalement exploitable pour le pilote de rendement 200k.
**Succès** : au moins une source avec permission explicite, acquisition, réutilisation et statut de fraîcheur vérifiables.
**Preuve** : lecture du fichier canonique `data/data-mass-2b/high-yield-source-review.json`, de `docs/data/DATA-MASS-2B-HIGH-YIELD-SOURCES.md`, du kit de feeds `docs/data/ODM-10C-PARTNER-FEED-KIT.md` et de l'onboarding `data/audits/direct-feeds-ingestion-onboarding.md`.

## Résultat vérifié (sur le snapshot historisé, non sur les conditions du marché à cet instant)
| Indicateur | Valeur | Interprétation |
|---|---:|---|
| Domaines MASS-2B audités | 20 | Cohorte historique d'août 2026 |
| PERMISSION_REQUIRED | 17 | Pas d'acquisition directe autorisée |
| HOLD | 3 | Gouvernance insuffisante |
| Domaines explicitement activables pour acquisition directe | **0** | `allowedChannels = NONE_ONLY`, `directAcquisitionAllowed = false` |
| URLs ressemblant à des pages d'annonce (somme 20 domaines) | 1 988 | **Indices historiques, pas des biens uniques ni des droits d'exploitation** |
| Agences avec export réel connecté | 0 connu | Le système de feeds et ses fixtures sont une capacité technique, pas un partenaire actif |
| Mubawab V6.4.5 | 97 IDs source / 3 pages | Mesure de parsing technique, pas licence commerciale |

## Sources candidates prioritaires (aucune autorisée)
1. marocannonces.com : 474 URLs de détails probables dans la cohorte, PERMISSION_REQUIRED, restrictions explicites.
2. domio.ma : 212, PERMISSION_REQUIRED, pas de grant public de réutilisation.
3. sakane.ma : 178, PERMISSION_REQUIRED, CGU restrictives.
4. 2p.ma : 174, HOLD, CGU non résolues.
5. 1000-annonces.com : 161, PERMISSION_REQUIRED, copie interdite par les CGU.

Les 1 988 URLs sont un comptage de représentations par source, **pas** une déduplication physique inter-sources. Elles ne doivent pas être ajoutées aux 32 460 IDs historiques ni aux 97 du pilote.

## Décision
**NO-GO pour un nouveau crawl massif de ces 20 domaines**. La lecture du repo confirme que l'outil de feeds `lib/feeds/{schema,parsers,staging}.ts` est prêt pour un canary *sur export fourni avec droits*, mais aucun tel export n'est identifié. Ne pas confondre capacité technique et permission.

## Next exact
Recevoir **un export autorisé d'agence/promoteur** ou un canal officiellement licencié (même 100 lignes) et un document attestant acquisition/réutilisation/fraîcheur ; exécuter le staging en quarantaine, compter valides/nouveaux/actifs/avec droits, puis estimer le plafond 48h. **Blocage externe : aucun flux réel autorisé vérifié.** Aucun envoi de message, scraping supplémentaire, DB prod, merge ou déploiement.
