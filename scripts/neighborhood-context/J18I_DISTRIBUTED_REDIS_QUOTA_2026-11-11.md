# J18-I — Quota Redis distribué, candidat hors production (mise à jour 2026-11-11)

## Goal / Success / Proof

Goal : préparer sans publier un quota atomique distribué pour l'éventuelle route de repères indicatifs Vivre Ici, tout en maintenant le verrou de diffusion J18-H.

**Succès vérifié pour le moteur de quota** : la réservation atomique est validée avec trois processus indépendants, d'abord Redis OSS, puis transport HTTP local, puis **Upstash REST HTTPS réel + flag Lua allow-key-locking**. Cela ne signifie ni publication autorisée, ni sécurité réseau/identité intégrée, ni capacité production certifiée.

- [Run Redis OSS réel #43002160137](https://github.com/hraaaaf/engineering-governance/actions/runs/43002160137) SUCCESS, 36 réservations simultanées : 20 acceptées/16 rejetées, TTL, isolation, coût pondéré.
- [Run Redis OSS + HTTP local #43011957419](https://github.com/hraaaaf/engineering-governance/actions/runs/43011957419) SUCCESS, 3 processus Node, 20/16, ZCARD=20, TTL=61 786 ms, fail-closed.
- [Run Upstash réel #43033841210](https://github.com/hraaaaf/engineering-governance/actions/runs/43033841210) **SUCCESS** : base Upstash Redis gratuite éphémère (suppression automatique après 72 h), 36 appels HTTPS depuis trois processus Node, 20/16, refus après quota, indépendance des identités, ZCARD=20, TTL conforme ; exécution non modifiée de l'adaptateur REST et de la première ligne Lua `#!lua flags=allow-key-locking`. Jeton, URL et ID masqués dans les logs, aucune donnée client, aucun secret de production. Vérification des logs du job #130567420577.
- [Run indépendant Redis OSS + HTTP #43033840889](https://github.com/hraaaaf/engineering-governance/actions/runs/43033840889) SUCCESS sur le même HEAD de laboratoire.
- Tests Node du pack 12/12 PASS en environnement isolé après ajout de la copie exacte de la route J18-H du HEAD d'origine ; sans cette route (pack partiel), 11/12 passent et le dernier échoue par ENOENT, pas par dysfonctionnement produit. Live-run sans credentials retourne exit 2, fail-closed.

**Contrat** : `scripts/neighborhood-context/j18-distributed-redis-quota.mjs`, fenêtre glissante par acteur (TIME serveur Redis, ZCOUNT, ZREMRANGEBYSCORE, ZADD NX, PEXPIRE), un EVAL par réservation, clé acteur SHA256, borne timeout, refus explicite. Le composant consommateur J18-H doit utiliser une identité de confiance, jamais un X-Forwarded-For librement fourni. Source Lua SHA256 `ca18124342c615253b72672b09fe072c13fd62da67216c859548f1bf550075c0`; blob de l'adaptateur `356eee6858816b59f21798afaf4816731a47cc28`.

## Limites, risques et gates

**Facturation pas certifiée** : métrique Upstash de la base temporaire a retourné `commands_total=0` alors que la preuve REST démontre des commandes réussies. La métrique peut être non actualisée ou inappropriée ; **ne pas en déduire zéro consommation**. Projection interne ~6 commandes/acceptation coût 1, ~3/refus, soit 168 pour 20/16, sans valeur de facture. Le quota libre Upstash annoncé est 500k commandes/mois ; évaluer les commandes réelles via Insights de compte avant activation.

**Disponibilité/performance non certifiées** : essais petits, même région inconnue, pas de test de charge WAN prolongée, pas de test de CDN cache, failover, latences p95/p99 représentatives, ni WAF/identité issue du vrai reverse proxy. Une base temporaire sans compte n'est pas destinée à la production. Ne pas incorporer ses credentials au repo.

**Publication NO-GO** : `app/api/geo/indicative-landmarks/route.ts` reste code-source OFF / HTTP 404. Adapter non raccordé à la route, aucune signature humaine réelle, aucune approbation OSM/PBF, aucun endpoint public, aucune lecture intégrée au reader J18-F. WAF Hobby amont non activé ; cache CDN pourrait éviter de compter certaines réponses si placé avant la Function.

**Git / déploiement** : candidat initial commit GitHub détaché `46e9dbe43a9d955c3f57259241ea71271a7de14c`, parent PR HEAD `c2b982bc37aced04053552a334c3ac2c4f038ebc`. Le document présent est une révision de ce candidat, elle aussi détachée. PR #1197 n'a pas été avancée ; aucune CI Akarfinder du candidat, aucun merge, aucun déploiement Vercel autorisé ou créé. Vercel est lié à Akarfinder et tout push sur une branche susceptible de déployer exige neutralisation démontrée ou GO explicite de déploiement.

## Next exact et séquence restante

1. **J18-I — validation de coût** : mesurer commandes réellement facturées/commandes par réservation dans une base Upstash **revendiquée et dédiée**, si un accès approprié devient disponible ; confirmer limites, protection contre l'abus et logs sans secrets. Ne pas confondre métrique scratch à zéro et certification.
2. **Intégration contrôlée** : avant déplacement de ref PR, prouver la non-exécution de tout auto-preview Vercel ; puis intégrer les 7 fichiers du candidat et sa CI, exécuter sur le HEAD de branche les contrats J18-H + J18-I, TypeScript, HTTP 404, sécurité.
3. **J18 release** : source/manifeste/pinning vérifiés, signature humaine véritable, reader serveur J18-F, autorisations ODbL, QA 3 villes×4 viewports, mobile/VoiceOver/NVDA, géométrie Maârif central, score UX ≥9,5 ; gates humains distincts avant merge, publication et Vercel.

**Progrès global Akarfinder non certifié ; aucun pourcentage inventé.**
