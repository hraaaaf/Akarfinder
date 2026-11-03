# ORDRE DE MISSION — CLAUDE
## Audit contradictoire et perfectionnements V6.4.6 — Akarfinder / Mubawab
**Émis : 03/11/2026 · Type : revue indépendante / suggestions, NON implémentation**

### 1. Demande exacte
Tu es **reviewer senior Python, scraping robuste, data quality et systèmes à reprise**.
Lis d'abord les fichiers du ZIP, puis propose **5 à 8 perfectionnements techniques réellement utiles**, ordonnés par valeur et risque. On veut rendre l'acquisition **mesurable, exacte, reprenable et scalable**, pas inventer des succès ni multiplier les frameworks.

**Livrables attendus :** rapport critique, patchs proposés (diffs ou pseudo-diffs testables) et nouveaux tests suggérés. **Ne modifie pas les fichiers du repo ou la production**. Tu peux proposer des corrections P0/P1/P2, mais attends la validation de l'équipe avant exécution.

### 2. Contexte et état prouvé à ne pas confondre
- Repo : https://github.com/hraaaaf/Akarfinder
- Branche du pack : `sandbox/akar-v646-parser-benchmark-20261102`.
- Le ZIP a été assemblé sur un commit précis consigné dans `MANIFEST.json` ; lis-le avant toute hypothèse.
- **V6.4.6 offline :** [CI 41549175495](https://github.com/hraaaaf/Akarfinder/actions/runs/41549175495) **SUCCESS, 33 tests**, mais seulement des HTML **synthétiques**.
- **V6.4.5 historique :** mêmes logs CI lisent l'archive SQLite V645 [run 41327076337](https://github.com/hraaaaf/Akarfinder/actions/runs/41327076337) : **97 lignes = 97 ID-source**, 97 core-complets, **91 prix numériques + 6 sur demande**. Ce n'est PAS une collecte V646 fraîche et ne prouve pas la déduplication physique.
- **V6.4.6 live :** [canary 41611908342](https://github.com/hraaaaf/Akarfinder/actions/runs/41611908342) **SUCCESS au sens workflow et au sens parsing de 1 shard Rabat** : 1 navigation, HTTP 200, `parsed_quality_pass`, **34 cartes dont 2 ignorées, 32 éligibles, 32 parsées, 32 ID-source distincts, 32/32 core-complets**, prix numériques **29**, sur demande **3**, aucun rejet, durée de la sonde **3.908 secondes** (1 observation, **pas** débit horaire durable). `verified_active=null`, `physical_unique_properties=null`, `publication_eligible_proven=0`.
- **Objectif produit :** 200 000 annonces marocaines distinctes, fraîches et complètes. Cet objectif **n'est pas démontré** ; **32 ID-source / une page ≠ capacité nationale, listings actifs, biens physiques uniques, droits d'utilisation ou débit soutenu**.
- **Restrictions :** `MAX_APPROVED_SHARDS=3`, `MAX_PAGES=1`, HTTP 403/429 fail-closed, robots vérifié à chaque canary. Aucun déploiement Vercel sans autorisation explicite. Ni requêtes massives, ni contournement anti-bot, ni écriture Supabase/Neon/DB produit.
- L'utilisateur garde les décisions juridiques/commerciales ; tes recommandations restent **strictement techniques** et respectent les limites actuelles.

### 3. Revue obligatoire des zones à risque
1. **Fidélité du parseur au HTML réel :** `.listingBox`, `.listingTit`, `.listingH3`, `.priceTag`, `.adDetails`, `linkref`, `/a/<id>`; cas d'annonces sans quartier, prix sur demande, valeurs ambiguës, annonces non appartement dans un shard appartement. Vérifie les faux positifs.
2. **Qualité des annonces :** que signifie « complète » ? absence de `property_type`, statut actif, date source, photos, provenance fine. Sépare champs présents, champs fiables, états inconnus, et `ready_for_use`. Détecte la différence entre les seuils `passes_quality` et `complete_core_with_district`.
3. **Déduplication :** doublons d'ID, doublons par bien physique inter-IDs/inter-portails, candidats ambigus, décisions de fusion conservatrices, idempotence et risque d'écrasement d'un bon champ par un mauvais champ.
4. **Erreurs silencieuses :** requêtes HTTP 403/429/5xx, blocage JS, 200 avec HTML partiel, timeouts, fallback navigateur, remontée des diagnostics, erreurs qu'un workflow vert pourrait masquer (ex. canary renvoyant exit 0 même si `canary_status` vaut blocked).
5. **Reprise après interruption :** contrôle des transactions SQLite, checkpointer page/URL, crash au milieu, rejouabilité, rapports atomiques, garantie « at least once » et absence de pertes ou dédoublements.
6. **Mesure et benchmark :** requêtes effectivement tentées, latence réseau et navigateur séparées, taux accepté, nombre net nouveau comparé au snapshot, couverture par shard, bornes et troncatures, échantillonnage; ne pas inférer la viabilité des 200k d'un canary unique.
7. **Performance responsable :** complexité du parsing, RAM, sérialisation, DB, sécurité des URLs et ressources, sans augmenter les quotas ou inventer de parallélisation permise.
8. **Maintenabilité/CI :** tests de régression mutés, fixtures tirées d'HTML brut **si fourni et autorisé**, tests sourcés vs synthétiques, schémas de sorties versionnés, conditions d'échec sémantiques et preuve de zéro écriture prod.

### 4. Format impératif de ta réponse
**A. Verdict** : note sur 10 **avec périmètre et confiance**, GO/NO-GO clairement distingués pour : test offline ; canary 1 page ; extraction multi-shards ; objectif 200k ; publication.

**B. Tableau 5 à 8 améliorations** :
`rang | P0/P1/P2 | défaut constaté (fichier + fonction/ligne) | impact mesurable | modification minimale | test de régression | risque/coût | critère GO`.
Ne te contente pas de recommandations générales. Mets au moins **deux objections techniques sérieuses** à l'approche actuelle.

**C. Top 3 exécutables en priorité** : ordre optimal, estimations de taille de diff (petite/moyenne/grosse), dépendances et critères d'acceptation. Propose du code/diff pour les 1 à 3 corrections les plus utiles, **sans les appliquer**.

**D. Cas adversariaux** : au moins 8 fixtures de tests (prix/locale/type/duplicats/blocked/partial HTML), avec attendu numérique ou failure state, et distinction synthétique vs HTML réel.

**E. Benchmark digne de ce nom** : protocole reproductible, observables et seuils d'arrêt; séparer `observed_ids`, `net_new_ids`, `complete_ids`, `physical_unique_estimate`, `verified_active`, `publication_eligible`; formule d'extrapolation uniquement une fois les mesures disponibles, avec intervalle d'incertitude.

**F. Questions ouvertes** : maximum 3, seulement si bloquantes; sinon énoncer tes hypothèses.

### 5. Critères de qualité de ta revue
- Cite les chemins/fonctions exacts du pack. Distingue **bug prouvé / risque plausible / amélioration optionnelle**.
- Aucune invention de run, capture, permission, fixture réelle, test passé ou chiffre.
- Refuse l'overengineering et les optimisations prématurées.
- Ne juge pas la permission commerciale comme acquise par un robots.txt favorable.
- La première priorité est **la fiabilité des métriques** (complet/uniques/nouveaux), pas l'augmentation du nombre de requêtes.

### 6. Pièces du ZIP
Le dossier `sources/` contient les scripts, tests, manifests et workflows sur le HEAD du pack ; `evidence/` contient les rapports JSON extraits d'artefacts GitHub existants ; `MANIFEST.json` consigne le commit, les checksums et le statut exact. **Rien de cela n'est une capture HTML brute du site.**

**Livrable final souhaité :** `CLAUDE_V646_REVIEW.md`, 5–8 perfectionnements argumentés, 3 patchs suggérés, suite d'essais; sans modification du dépôt.

**Rappel : aucune demande de merge ou déploiement, aucun benchmark massif.**
