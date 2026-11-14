# J18-H — Gate de diffusion indicative, préparation hors production (2026-11-10)

## Goal / Success / Proof
Goal : préparer un contrôle de release des seuls repères OSM indicatifs, qui demeure désactivé sans approbation humaine, preuve d'intégrité, expiration et quota distribué.

Succès démontré : module scripts/neighborhood-context/j18-public-release-policy.mjs (Ed25519, SHA source / manifeste, Store ID, expiration du PBF, fenêtre d'approbation <=7 jours, limites bbox 64 cellules et réponse max 180, contrôle du cache max 30 secondes) ; tests synthétiques de signatures et quota atomique injecté. Route séparée app/api/geo/indicative-landmarks/route.ts avec verrou source J18H_SOURCE_PUBLICATION_ENABLED=false ; renvoie toujours 404. Même si le code du verrou était changé sans connecter et auditer la couche de publication, elle renverrait 503 ; aucune variable d'environnement ne peut autoriser la diffusion.

Preuve locale : 17/17 nouveaux tests Node ciblés PASS, TypeScript --noEmit PASS. HTTP Next local GET /api/geo/indicative-landmarks = 404, page /map Maârif = 200. La signature des tests est produite par une clé Ed25519 temporaire créée dans le processus de test, jamais conservée. Le quota injecté est un faux adaptateur de test et NE prouve PAS l'atomicité multi-instance. Aucune vraie signature/approbation humaine n'existe.

## Fichiers
scripts/neighborhood-context/j18-public-release-policy.mjs
scripts/neighborhood-context/j18-public-release-policy.d.mts
scripts/neighborhood-context/fixtures/j18-public-release-policy.test.mjs
app/api/geo/indicative-landmarks/route.ts
.github/workflows/vivre-ici-j11-national-landmarks.yml

## États non atteints / human gates
- Aucun endpoint public fonctionnel ni lecture privée Blob par cette nouvelle route : les repères restent privés.
- Aucune approbation signée de diffusion, aucune clé d'autorité créée, aucun quota distribué réel. En production, quota doit être réellement atomique entre instances et l'identité du client obtenue d'une couche de confiance ; éviter D1 par requête, les limites en mémoire et X-Forwarded-For non fiabilisé.
- Avant activation : source et manifeste vérifiés, gate humain distinct, clé d'approbation tenue hors Git, vérification distante des objets, intégration reader J18-F côté serveur, TTL source et cache <=TTL, quota et anti-abus testés, attribution ODbL, avertissement statut indicatif, tests sur 3 villes x 4 viewports et vrais lecteurs d'écran.
- L'ancienne relation OSM de Maârif arrondissement ne certifie pas les limites du quartier central.
- Pas de merge ni déploiement Vercel sans autorisation explicite. Aucun changement Cloudflare D1/Supabase/Blob dans ce lot.
- Le snapshot privé de 27 567 points expire le 2026-12-08 à 21:21 UTC, il ne suffit pas de relâcher un flag à cette date.

## Next exact
Contrôler la CI du nouveau commit et mettre à jour Notion. Puis qualifier une solution de quotas atomiques cross-instance sans surconsommer D1 (J18-I), tester le coût réel, réseau mobile et UI/UX >=9,5/10, avant toute décision humaine de publication.
