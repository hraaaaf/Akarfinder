# AkarFinder V6.4.6 — Décision d’architecture proposée : confiance des publications

**Statut : PROPOSITION NON DÉPLOYÉE — 07/11/2026.** Ce document n’autorise ni collecte Mubawab, ni import cloud, ni merge, ni déploiement Vercel. Baseline : [Draft PR #1172](https://github.com/hraaaaf/Akarfinder/pull/1172), code HEAD `32d6b2147facb470df4562b5630e61acdbcc89a7` (à revérifier avant travaux).

## Bilan probant et périmètre fermé

Contre-audit indépendant de l’utilisateur, **7,8/10 sur HEAD 32d6b214** : archive 32/32 intègre ; suite hors ligne **188 tests, 183 PASS, 5 SKIP** ; six contre-tests supplémentaires réussis. **PASS ciblé** pour (1) exclusion de producteurs coopérants sur un même système de fichiers respectant `flock` et (2) cohérence des champs des annonces affichées dans Markdown avec JSON/SQLite. Ce sont des correctifs **clos pour le périmètre offline mono-hôte testé**, et NON une validation globale de la publication.

**Verdict global maintenu : CHANGES_REQUIRED / NO_GO_LIVE**. Les tests ne prouvent ni protection contre suppression/remplacement des fichiers de verrou, ni cohérence de tous les compteurs et signaux dérivés, ni protection anti-rollback du registre local, ni Chromium réseau réel, ni droits commerciaux.

## Choix d’architecture recommandé pour le lot suivant

**Recommandation (non implémentée) :** sortir l’autorité de génération du répertoire de publication et du filesystem local. Utiliser un **registre transactionnel de confiance externe** (p. ex. une table PostgreSQL dédiée avec permissions minimales) pour les générations, les propriétaires de lease, les états et l’empreinte d’un manifeste. Conserver les artefacts par `generation/run_id` en **chemins immuables**, sans modifier en place les fichiers d’une génération publiée. Un registre PostgreSQL ordinaire **n’est pas intrinsèquement anti-rollback** : sécuriser sauvegardes/restaurations, rôles, audit/attestation externe et politique de reprise. Ne pas créer de ressource ni utiliser une base cloud avant la décision opérateur sur l’emplacement et les identités.

Alternative mono-hôte : un répertoire de verrous et d’exports sous permissions OS strictes, propriété d’un compte de service différent des lecteurs, réduit le risque de remplacement des locks, **sans** assurer de résistance au rollback total du système. Déconseillée comme certificat final d’anti-rejeu.

### Contrat minimal proposé

1. **Unicité et fencing.** Chaque producteur acquiert une autorisation de génération auprès du registre externe. Toute opération de finalisation vérifie atomiquement un **jeton de fencing**, la génération et l’identité du producteur. Si le producteur perd l’autorisation, toute publication tardive est refusée ; un verrou `flock` local reste une défense complémentaire, pas une autorité multi-hôte.
2. **Générations monotones.** Le registre est la **seule source de vérité** pour la dernière génération autorisée. Un lecteur n’accepte pas une génération plus ancienne que la tête approuvée. L’état passe à `in_progress`, puis `published` ou `failed`; les exports partiels et anciens restent ignorés. La protection du registre contre restauration complète doit être fournie et testée séparément.
3. **Snapshot cohérent.** Une génération produit une représentation figée des annonces effectivement observées, une vue SQL cohérente (WAL inclus), un JSON complet, le Markdown et les autres rapports. Chaque sortie référence le même `generation/run_id`, le même périmètre d’observations et une version de schéma commune.
4. **Sémantique certifiée, pas seulement SHA/HMAC.** Comparer exhaustivement SQL `listings` ↔ JSON ; les annonces affichées en Markdown ↔ JSON ; les **compteurs** (`total_cumulé`, `uniques_ce_cycle`, `nouvelles`, `modifiées`, `rejets`, `qualité`) à des événements et observations explicitement conservés ; les **signaux dérivés** aux entrées et versions des règles permettant de les reproduire. Un compteur non prouvable doit être marqué **non certifié** ou absent, jamais présenté comme validé.
5. **Authenticité et lecture.** Signature de manifeste par secret protégé hors artefacts ; manifeste contenant les hashes, le schéma, les comptes certifiés et le digest logique SQL. Le lecteur récupère **les octets déjà vérifiés** et un instantané SQL lecture seule, sans réouvrir les chemins par la suite. Vérifier identité/génération de tête dans le registre avant et à la fin de la lecture.
6. **Pannes et concurrence.** Un crash après staging mais avant finalisation laisse des artefacts orphelins **non publiés**. Un crash après finalisation doit laisser un snapshot lisible par génération ; toute incohérence force `valid:false`. Tester contention, expiration/reprise de lease, crash à chaque étape, restauration d’un ancien dossier et restauration du registre, modification de compteurs/qualité re-signée, suppression/recréation des locks.

## Critères observables de SUCCESS

- Deux producteurs simultanés, même dossier ou sur deux hôtes, ne peuvent **jamais tous deux finaliser** la même génération ; un producteur doté d’un ancien jeton est rejeté.
- Restauration d’anciens exports **et** tentative de restauration du registre détectée ou formellement exclue par des contrôles d’infrastructure indépendants et testés.
- Tous les compteurs de rapport et champs de qualité déclarés certifiés sont reconstructibles depuis une preuve d’observation immuable, ou clairement étiquetés non certifiés.
- Une divergence SQL/JSON/Markdown/signaux dérivés, même accompagnée de hashes et HMAC valides de fixture, produit `valid:false`.
- Démonstration d’un lecteur qui consomme **exactement** les octets vérifiés et échoue fermé sur panne/rejeu.
- CI offline du **HEAD exact**, tests Chromium/MIME/network ultérieurs, réaudit indépendant favorable **pour le périmètre annoncé**. Ces derniers ne dispensent pas de droit de collecte/republication.

## Décisions humaines indispensables — NON prises

- Hébergement et contrôle d’accès de l’autorité monotone, politique de restauration et journal d’audit ; présence éventuelle de producteurs multi-hôtes.
- Gestion/rotation de la véritable clé HMAC dans un gestionnaire de secrets, sans la copier dans Git, Notion ou les packs.
- Contrat des consommateurs existants : migration du lecteur, versionnement des exports, compatibilité, politique de conservation et reprise de données.
- Toute collecte réelle, autorisation commerciale, merge, base de production et déploiement Vercel.

**Next exact :** obtenir le choix et les contraintes d’hébergement du registre de confiance avant toute implémentation externe ; en parallèle, inventorier les compteurs/signaux effectivement présents et leurs preuves dans le code, puis spécifier les assertions automatisées du contrat complet.