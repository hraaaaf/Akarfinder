# AkarFinder — FeenWay 47 vs archive Neon 151 900 — 26 octobre 2026

**Statut** : rapprochement SQL **read-only**, tests CI du registre **verts**, mais aucune nouvelle annonce certifiée active, physiquement unique ou republiable.

## Goal / Critère / Preuve

- **Goal** : reprendre les 47 références FeenWay dont cinq champs concordent à la source et qui n'ont pas d'anomalie économique explicite ; les rapprocher d'un véritable inventaire historique AkarFinder plutôt que du seul ledger 9 lots.
- **Succès technique** : rattacher chaque FeenWay ID à un bilan exact sur le stock historique ; identifier des suspects sans fusion automatique.
- **Preuve** : requêtes SELECT sur projet Neon `ancient-violet-43534870`, **branche d'archive** `br-cold-mouse-b2a50yaa`, DB `AkarFinder` ; données ligne à ligne [feenway-canary47-neon-historical-overlap-2026-10-26.jsonl](feenway-canary47-neon-historical-overlap-2026-10-26.jsonl). Test [feenway-canary47-neon-evidence.test.mjs](../../scripts/data/__tests__/feenway-canary47-neon-evidence.test.mjs), job GitHub **40417651566 ✅ SUCCESS**, commit exact `342060c9dca92b0b96d724148162432cab6136a8`. Le job exécute les tests immuables 81+47.

## Réalité de la base d'archive

- **151 900** `property_listings`, **151 900** `listing_sources` ; `property_clusters=0`, `raw_listings=0`.
- **44 427** fiches anciennes possèdent ville + quartier + prix + superficie non nuls, non certifiées fraîches.
- `is_active=true` sur les 151 900 références source mais **98 525 / 151 900 ont `last_seen_at=NULL`** ; 49 214 ont une dernière observation en septembre 2026, 1 219 en août 2026, 2 851 en juillet 2026. Ce drapeau ne peut pas certifier une offre actuellement disponible.
- La DB `AkarFinder` de la **branche Neon production** `br-frosty-glitter-b2762sv1` a **0 table applicative** ; celle de l'archive possède les six tables réelles. Aucune écriture ni transfert vers production.
- Le gel canonique 226 286 URL artifact `10910779576` reste inaccessible. Son échec exact en CI est maintenant prouvé par les logs GitHub : téléchargement `curl` **HTTP 410** au run `40413409022` ; les jobs des trois workflows de parser tombent lors de « Fetch canonical freeze ». **151 900 fiches d'archive ≠ remplacement numérique ou documentaire du gel de 226 286 URL.**

## Rapprochement des 47 références FeenWay

| Étape | Nombre de FeenWay ID concernés | Interprétation |
|---|---:|---|
| Clé source originale ou URL exactement égale à l'archive | **0/47** | aucune collision directe dans **cette archive** uniquement |
| Même ville, transaction, prix ±5 %, superficie ±5 % | **37/47** | 736 correspondances anciennes, signatures très larges |
| En plus même quartier normalisé | **10/47** | 23 correspondances anciennes à contrôler |
| Même quartier, prix ±2 %, superficie ±max(2 m², 2 %) | **6/47** | 10 correspondances anciennes, suspects plus rapprochés |
| Sans correspondance faible de cette nature | **10/47** | absence de similitude **dans ces règles**, non preuve d'unicité |

**6 cas nécessitant revue humaine ou preuves fortes d'identité physique** : FeenWay `182418`, `183798`, `210084`, `212651`, `221904`, `232862`. Les rapprochements montrent des anciens titres génériques de biens dans les mêmes quartiers, surfaces et prix : on ne peut pas les assimiler aux mêmes appartements sans agence/référence, géolocalisation fine, ou photo réutilisable autorisée. Aucun cluster créé.

**4 autres candidats similaires dans le même quartier** : `169266`, `199901`, `226033`, `236014` ; séparés du groupe de six plus proches. **27 autres** ont seulement des ressemblances plus larges au niveau de la ville ; **10** n'ont aucune correspondance dans la fenêtre étudiée. Aucune conclusion négative absolue sur les doublons.

Les **29** métadonnées de date source disponibles au sein des 47 ne constituent pas un statut d'annonce active. Tous les 47 gardent `availability_verified=false`, `physical_duplicate_verified=false`, `rights_verified=false`, `eligibility_certified=false`. Les pages renvoyant un HTTP200, les dates d'indexation ou les `is_active` hérités ne passent aucun de ces gates.

## Qualité / CI / Sécurité

- Tests et workflow read-only, `permissions: contents: read`, aucun réseau nécessaire dans les tests, aucun droit DB GitHub Actions : **CI FeenWay run [40417651566](https://github.com/hraaaaf/Akarfinder/actions/runs/40417651566) SUCCESS**, job `FeenWay 81 source gates` terminé SUCCESS, étape tests SUCCESS.
- **CI historique indépendante en échec** : gel canonique artifact expiré (HTTP 410), sans correction de données possible via l'archive partielle.
- Aucune requête SQL non-SELECT ; pas d'écriture Neon/Supabase, aucun Vercel, merge ni publication.
- **Next exact** : preuve forte de doublon physique sur les dix suspects même quartier ; audit de disponibilité commercialement datée et du droit d'exploitation des 47, avec période économique correcte ; réparation **distincte** de la dépendance CI au freeze 226K via snapshot/provenance et tests d'intégrité, pas substitution silencieuse des 151 900 anciens enregistrements.

**Fichier canonique** : `docs/handovers/2026-10-05-200k-fresh-listings-parser-v2-handover.md`.

## Métadonnées temporelles, séparation stricte des preuves

Sur les 47 dossiers techniques, **29** fiches d'origine retournent une métadonnée `published_date` : **14** dans les sept derniers jours, **28** dans les trente derniers jours et **1** plus ancienne (Sarouty `170553`, datée du **28 octobre 2025**). Pour les **18 autres**, aucune date certifiable n'est produite. Ce sont des **métadonnées observées**, ni preuve d'offre toujours disponible, ni garantie de date de première publication, ni validation de droits.

Répartition des 47 : Avito **28**, Mubawab **12**, Agenz **4**, Yakeey **2**, Sarouty **1**. Les 6 suspects de forte similitude comprennent **3** dossiers avec métadonnée datée ; leur date ne suffit pas à résoudre le doublon. **Aucune promotion `eligible`**.
