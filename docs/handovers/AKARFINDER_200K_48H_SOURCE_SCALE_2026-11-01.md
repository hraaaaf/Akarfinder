# Akarfinder — Mission 200 000 annonces / 48 h (2026-11-01)

**Goal demandé :** 200 000 fiches immobilières marocaines **uniques, fraîches et exploitables** en 48 heures, pas simplement 200 000 URLs collectées.  
**Statut :** `FEASIBILITY_NOT_PROVEN / NO_PROD_WRITE`. Ce document est un ordre de mission, pas un rapport d'exécution à 200k.  
**Règle :** collecte et qualification en stockage temporaire/SQLite et artefacts uniquement ; **0 écriture** dans Supabase/Neon/base Akarfinder ; aucun déploiement Vercel, aucune publication automatique.

## 1. Faits externes vérifiés le 01/11/2026

| Canal | Volume observable | Portée de ce volume | Source | Priorité |
|---|---:|---|---|---|
| Mubawab | ~110 800 | compteur total du portail, **pas** listing IDs uniques extractibles | https://www.mubawab.ma/ | P0, sous limites de chemin/politique |
| Avito immobilier | 49 074 | **corpus tiers** observé par AlerteImmo, pas total officiel | https://alerteimmo.ma/comparatif | P0, uniquement voies certifiées |
| Sarout.ma | 21 521 | compteur public déclaré, non audité en fraîcheur indépendante | https://sarout.ma/fr/annonces | P1, permission/voie à confirmer |
| FeenWay | 196 276 | **agrégateur multi-sources**, annonces potentiellement dupliquées et non toutes actives | https://www.feenway.com/immobilier | P0 pour une **négociation de flux/partenariat**, pas scraping implicite |
| Yakeey | 2 512 | compteur sur page d'achat interrogée, pas tout le catalogue | https://yakeey.com/fr-ma/achat/biens/maroc | P2 |

Addition interdite : les sources se recouvrent et les catégories/périmètres divergent.

## 2. Le dépôt Akarfinder possède DÉJÀ des collecteurs massifs

Ne PAS réécrire les adaptateurs. Sur `main` :

- `docs/AKARFINDER_MOROCCO_WEB_L8_SCALE_COVERAGE.md` documente **Mubawab 3 172 shards robots-safe**, gate 500 shards = **5 195 IDs uniques** et **45,5 % de recouvrement** ; Avito **2 505 shards**.
- [Run Avito #33672899097 — SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/33672899097) : **2 505 shards, 27 053 IDs immobiliers uniques**, plus de 50 minutes, **zéro écriture DB**. Ce résultat de septembre 2026 est une preuve historique, **pas** un stock frais de novembre.
- `docs/data/DATA-MASS-2F-FINAL-CERTIFICATION.md` : **101 domaines examinés : 43 PERMISSION_REQUIRED, 58 HOLD, 0 source activable par cette revue**. `docs/data/DATA-MASS-6-NATIONAL-MASS-ENGINE.md` impose `DISCOVER → CLASSIFY → POLICY → INDEX → FRESHNESS → DEDUP → RANK` et `shadow_read_only`.
- `docs/data/AKARFINDER_AUTHORIZED_SOURCE_ADAPTER_PROOF_V1.md` certifie une sonde **détail individuelle** Mubawab (sans pagination ni collecte de catégories), avec publication toujours interdite.
- Les workflows sources sont : `morocco-web-l8-avito-sitemap.yml`, `morocco-web-l8-mubawab-exhaustive.yml`, `live-sarouty-full.yml`, plus Common Crawl. Certains workflows effectuent des écritures de production selon l'événement : **audit des side-effects obligatoire avant exécution**.
- `robots.txt` Mubawab interdit les chemins `/*:`; **ne pas utiliser `:p:N`**. Sarouty annonce `Crawl-delay: 10` ; pas de contournement.

## 3. Calcul de capacité (hypothèses, non benchmark)

- **200 000 / 48 h = 4 167 fiches uniques qualifiées/heure.**
- Avec 32 fiches/écran et zéro perte : **6 250 écrans**, soit 2,17 écrans/minute.
- **Scénario illustratif** : si 25 % sont des doublons et 20 % échouent la qualité, le volume brut nécessaire vaut **333 334 observations** (6 945/heure, 3,62 écrans de 32/minute). Ces ratios ne sont **pas mesurés**.
- Les performances CPU GitHub ne prouvent pas que les catalogues/permissions donnent 200 000 fiches fraîches. Une URL connue ou une ancienne fiche Common Crawl n'est **pas** une fiche fraîche et exploitable.

## 4. Exécution en 4 voies parallèles (gates obligatoires)

**A. Grosse capacité en lecture seule — Avito.**
Reprendre l'adaptateur certifié et mesurer les IDs uniques, taux actifs, dédoublonnage, erreurs et 429 sur les shards autorisés. Ne pas lancer de workflows pouvant écrire Supabase. Identifier les écarts depuis l'ancien run à 27 053.

**B. Mubawab.**
Reprendre les 3 172 shards sans chemins interdits et mesurer les IDs distincts. Stop au premier 429/policy block, **aucun bypass**, et ne jamais présenter le compteur du site (~110,8k) comme récolte vérifiée.

**C. Flux autorisés / partenariats.**
Priorité forte à un **export/feed sous accord explicite** pour un agrégateur ou des réseaux d'agences (FeenWay ~196k agrégé en vitrine). Un accord ne dispense pas de mesurer doublons, fraîcheur, droits et format. Pas de copie de descriptions/photos avant vérification des droits.

**D. Complément sous politique source.**
Sarouty, Yakeey, Sarout.ma, Masaken, autres sources du Source Registry **seulement si politique positive** ; respecter crawl-delay; sinon utiliser découverte de métadonnées historiques à titre de signal interne, pas annonce prête.

**Parallélisme :** par domaine/quota, jamais par proxies/identités contournant les limites. `max_concurrency`, retries/backoff bornés, coupe-circuit 429/403/challenge et fichiers d'artefacts versionnés. Pas de jobs massifs simultanés avant préflight runner et preuves de permissions.

## 5. Chronologie 48 h — décision sur preuves

| Fenêtre | Résultat observable nécessaire |
|---|---|
| T0–T+3 h | Contrôle des workflows existants, permissions/policy, quotas, modes d'écriture et inventaire des états/artefacts ; sources non autorisées désactivées |
| T+3–T+8 h | Parallélisation seulement des canaux approuvés ; canaries contrôlés, métriques ID unique/heure, qualité/champs, erreurs |
| T+8–T+24 h | Extension progressive des canaux réellement productifs ; sauvegarde d'ID + `source_url` + `observed_at` ; taux de nouveauté et doublons |
| T+24–T+40 h | Qualification de fraîcheur, normalisation, dédoublonnage inter-sources ; pas d'ingestion produit |
| T+40–T+48 h | Audit exact du volume **unique + frais + qualifié**, preuves et fichiers de reprise ; verdict GO/NO-GO honnête |

**Décision de faisabilité :** dès T+8 h, extrapoler à partir du nombre réellement qualifié/heure et du stock source encore accessible. Si 200k n'est plus atteignable, déclarer un **écart quantifié** plutôt que fabriquer des données ou outrepasser une restriction.

## 6. Critères `ready_for_use` et garde-fous

- identité de source stable, URL canonique, domaine source identifié ;
- catégorie et transaction plausibles, ville/quartier observés (absence explicitement signalée) ;
- prix numérique ou statut `on_request`, surface vérifiée si annoncée ;
- preuve de fraîcheur, pas seulement une date d'index ou dernier passage de crawler ;
- déduplication intra et inter-source avec cas ambigus en revue ;
- revue des annonces non résidentielles, prix atypiques et incohérences ;
- droits de réutilisation et publication vérifiés pour chaque source ;
- **SQLite/artefacts locaux uniquement** ; la frontière de publication est **fermée par défaut**.

## 7. Situation vérifiée / Next exact

- GitHub Actions au pointage : 0 run actif ; ancien run UX sans rapport en file.
- V6.4.4, run [#41315575782](https://github.com/hraaaaf/Akarfinder/actions/runs/41315575782) : 32/32 sur **une seule page de Rabat**, DB SQLite locale validée, pas une capacité 200k.
- Les sources MASS-2 sans permission ne sont PAS activables en collecte directe. Il serait contraire à la politique du dépôt de lancer 200k requests de ces domaines par simple parallélisation.
- **Next exact :** audit ciblé des scripts L8 Avito/Mubawab pour prouver leur mode `zeroDbWrites` actuel, mesure du périmètre frais résiduel, puis exécution **bornée et autorisée** d'un benchmark multi-voies indépendant. En parallèle, demander un flux commercial autorisé pour un volume de l'ordre de 200k.

**Fichier de mission :** ce document. **Aucun résultat 200k n'est déclaré sans compteur dédupliqué, fraîcheur et fichier de preuve.**

## 8. Résultats P0 actuels, 01/11/2026 — evidence contre estimation

- Premier canary [#41318142425](https://github.com/hraaaaf/Akarfinder/actions/runs/41318142425) : deux échecs de DNS vers l'ancien Supabase, aucune requête site qualifiée. Correction : utiliser les **manifestes d'artefacts GitHub certifiés** comme source d'URLs de shards ; aucun besoin de Supabase.
- Second canary parallèle [#41318441693](https://github.com/hraaaaf/Akarfinder/actions/runs/41318441693) : **Mubawab SUCCESS : 25 shards, 313 URL de fiches distinctes** ; Avito 25 essais sans lien du fait d'une redirection interdite par notre pilote (`redirect:error`). Le premier nombre est seulement de la **découverte d'URL**, pas la preuve de 313 fiches fraîches. Le champ de compteur `non_200_or_network` pour Mubawab était erroné (les shards n'avaient pas de champ `status` comparable) et doit être ignoré ; le compteur unique d'URLs est bien extrait.
- Troisième canary limité [#41318584567](https://github.com/hraaaaf/Akarfinder/actions/runs/41318584567) : **Avito SUCCESS : 5 shards, 97 URLs de fiches distinctes, 3 HTTP 200 et 2 HTTP 403**, redirection acceptée uniquement si le domaine final reste Avito ; pas de contournement des 403. [Artefact Avito](https://github.com/hraaaaf/Akarfinder/actions/runs/41318584567/artifacts/13088665235), [artefact Mubawab](https://github.com/hraaaaf/Akarfinder/actions/runs/41318441693/artifacts/13088222666).
- **Zéro DB write** dans les canaries L8 ; aucune insertion de ces URLs dans Akarfinder. Les rapports restent des artefacts de CI/archives téléchargées. Les 97/313 liens ne doivent pas être présentés comme biens uniques cross-source, frais, ni ready-for-use.
- **Feasibility gate pour 200k/48h : NOT PROVEN.** Les seuls grands volumes publiquement revendiqués appartiennent pour partie à des agrégateurs et se chevauchent. Les canaries n'établissent pas 200k annonces actives, ni l'autorisation de réutiliser les descriptions/photos. Une **source d'alimentation bulk sous accord** ou d'autres domaines explicitement autorisés est nécessaire pour garantir le volume visé.
- **Next exact** : mesurer les flux bulk directement autorisés et le stock unique/frais disponible ; monter le débit seulement après certification des sources. Conserver l'architecture read-only + SQLite/artefacts avant toute promotion sélective vers la base produit.
