# Mubawab V6.4.6 — Revue indépendante de la PR Draft #1157 — 04/11/2026

**Périmètre :** `fix/akar-v646-one-navigation-challenge-guard-20261104` empilée sur `test/akar-v646-direct-canary-cli-20261104` (PR #1154). **Aucune fusion ni déploiement.** Travail isolé du rapprochement des backups (PR #1156).

## Goal / succès / preuve

- **Goal :** refuser tout document non approuvé dans le moteur Chromium lui-même et ne jamais compter comme réussi un rendu après tentative de seconde navigation top-level, tout en évitant les faux succès liés aux interstitiels.
- **Succès vérifiable :** refus avant `new_context()` sur une URL hors manifeste ; exactement un document principal intercepté pour un succès ; toute tentative top-level supplémentaire invalide le canary ; iframe refusée mais pas confondue avec navigation top-level ; challenge visible avec cartes résiduelles refusé.
- **Preuve attendue :** tests adversariaux synthétiques sur `test_browser_access_denied.py`, `test_v646_p1_quality_gates.py`, ensemble des tests offline, compilation Python, CI sur HEAD exact. **Un succès CI ne démontre pas la conformité réseau live.**

## Constat et correction (revue du code, pas extrapolation live)

### F1 — HIGH : BrowserFetcher acceptait un URL principal arbitraire (corrigé dans Draft)

Avant le durcissement, `BrowserFetcher.fetch(url)` créait un contexte puis passait `{url}` directement à son routeur : un appel direct hors `live_canary.probe()` pouvait envoyer une requête à un hôte quelconque **avant** le contrôle de `page.url` réalisé après navigation. La vérification stricte du manifeste existait au niveau des appelants, pas au point d'entrée réseau.

**Correction :** `approved_shard_baseline(url)` devient un prérequis hors réseau **avant** création de contexte. Toute URL absente du manifeste exact ou avec un format non admis renvoie `blocked`, `attempts=0`. Ceci ne confère aucune nouvelle autorisation de source.

### F2 — HIGH : tentative de navigation vers une autre page pendant le rendu (corrigé dans Draft)

Le code surveillait le rechargement du même document admis mais ne classait pas explicitement une tentative top-level vers une URL différente (préventivement annulée) comme motif d'échec du canary. Des cartes résiduelles pouvaient conduire à un faux `ok`.

**Correction :** le routeur consigne `blocked_top_level_navigations` lorsqu'une requête de navigation du frame principal est refusée. Le fetch échoue si le compteur est positif, si le document principal n'a pas été intercepté **exactement une fois**, ou si `page.url` diffère du manifeste après rendu. Une iframe rejetée n'incrémente pas ce compteur.

### F3 — MEDIUM : absence de preuve que le routeur est réellement actif (corrigé dans Draft)

Une réponse simulée `200` et des cartes ne prouvaient pas que le navigateur avait intercepté le chargement principal. Le fetch refuse maintenant un succès sans `admitted_main_documents == 1`. Les tests mockés simulent explicitement une vraie route de document ; ils n'affirment pas tester le réseau.

### F4 — V6.4.6 déjà corrigé avant la revue : overlay challenge et même URL

- Une seconde navigation du même document est refusée par le routeur.
- Un challenge en `title`, `h1`, `h2` ou `role=alert` invalide la page, même si `.listingBox` reste dans le DOM.
- Tests de non-régression : le texte ordinaire d'une description ne déclenche pas ce blocage.

## Limites / GO-NO-GO

- **Aucun nouveau canary site :** les trois URL autorisées ont déjà été visitées une fois ; pas de revisite automatique, pas de crawl massif ou de contournement.
- **Risque MIME non résolu :** le routeur laisse passer les catégories Chromium `script`/`stylesheet` même origine, exclut les extensions d'image, et bloque les autres types. Cela **ne prouve pas** qu'un endpoint trompeur (ex. CSS ou JS ayant `Content-Type: image/*`) ne transfère aucune image. La présence de scripts et CSS laisse donc subsister un risque d'accès à d'autres ressources ; **pas de certification réseau « aucune image téléchargée »**.
- Les règles robots/CGU et les droits d'usage doivent être vérifiés **avant** toute visite nouvelle ; l'approbation du manifeste est une vérification locale et non une licence. Le fetch direct ne remplace pas le contrôle robots frais réalisé par le canary.
- Le test Chromium avec navigateur réel peut être SKIPPED en CI légère. Une suite mockée et un `py_compile` ne remplacent pas un vrai navigateur pour vérifier les types de requêtes et le comportement de redirection.
- Ce chantier ne prouve ni disponibilité des biens, ni droit de republier, ni rendement vers 200K, ni unicité physique.

**Verdict fonctionnel hors ligne : GO sur le code `5733751f9a186dcb01c127ac80b10b4955291e63`.** [CI ciblée #41854891860](https://github.com/hraaaaf/Akarfinder/actions/runs/41854891860) **SUCCESS**, 37/37 tests PASS, 0 skip ; [suite complète #41854883482](https://github.com/hraaaaf/Akarfinder/actions/runs/41854883482) **SUCCESS**, 140 tests dont 135 PASS et 5 SKIPPED ; [efficience CI #41854891868](https://github.com/hraaaaf/Akarfinder/actions/runs/41854891868) **SUCCESS**. La suite complète a également vérifié un artefact V645 historique, pas de visite live. Les anciens échecs de mocks ont été corrigés en simulant le document principal réellement intercepté. **Verdict LIVE/LEGAL : NO-GO** sans page distincte autorisée et nouvelle preuve. **PR : Draft**, sans merge ni deploy.

## Références

- [PR Draft #1157](https://github.com/hraaaaf/Akarfinder/pull/1157) ; parent [PR Draft #1154](https://github.com/hraaaaf/Akarfinder/pull/1154).
- [Rapport historique 3 canaries](MUBAWAB_V646_DIRECT_CANARY_RUN_2026-11-04.md).
- [Backup Codex PR Draft #1156](https://github.com/hraaaaf/Akarfinder/pull/1156) — projet séparé.

## Next exact

1. Vérifier CI ciblée/full/efficience à HEAD final ; diagnostiquer/réparer tout échec et documenter le résultat exact.
2. Pour une **preuve réseau stricte « zéro image »**, définir et tester une politique transport qui n'autorise pas un `script`/`stylesheet` opaque à renvoyer une image ; n'affirmer aucune certification MIME tant qu'elle n'est pas réalisée.
3. **Human gate :** une nouvelle URL de canary distincte doit être expressément approuvée après revue source/robots/CGU. Ne jamais retenter les trois pages déjà mesurées ni exécuter une extraction massive.
4. Éventuel merge/déploiement uniquement après validation technique, juridique et autorisation explicite quand requise.
