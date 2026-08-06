# AkarFinder — Déploiement Vercel + Supabase

**Version : 2026-08-03**  
**Production : `https://akarfinder.vercel.app`**  
**Déploiement vérifié : `dpl_8XqdkUnMvVRgKVTCU2bNVnXbYg5f` — `READY`**  
**Commit applicatif : `fa983a3`**

## 1. Sources de vérité

- code : branche GitHub `main` ;
- schéma : migrations versionnées sous `supabase/migrations/` ;
- données : projet Supabase canonique ;
- Production : alias Vercel `akarfinder.vercel.app` ;
- statut produit : `docs/SESSION.md` et `docs/ROADMAP.md`.

Un merge GitHub n’est pas une preuve de déploiement. Un déploiement `READY` n’est pas une preuve de comportement métier. Les deux doivent être vérifiés séparément.

## 2. Prérequis

- working tree propre ;
- branche à jour avec `main` ;
- migrations connues et vérifiées ;
- variables d’environnement présentes ;
- tests ciblés verts ;
- TypeScript vert ;
- build Production vert ;
- rollback identifié ;
- autorisation explicite pour toute activation sensible.

## 3. Variables serveur essentielles

Ne jamais committer une valeur secrète.

- `DATABASE_PROVIDER=supabase` ;
- `SUPABASE_URL` ;
- `SUPABASE_SERVICE_ROLE_KEY` — serveur uniquement ;
- `SEARCH_CURSOR_SECRET` lorsque requis ;
- secrets des endpoints planifiés ;
- flags de Source Registry/ingestion selon le LOT ;
- flags Canary/dual-read selon la séquence approuvée.

### Canary ODM

- `ODM_PUBLIC_CANARY_ENABLED` ;
- `ODM_PUBLIC_CANARY_APPROVED` ;
- `ODM_PUBLIC_CANARY_PERCENT` ;
- `ODM_PUBLIC_CANARY_STOP` ;
- `ODM_DUAL_READ_ENABLED` ;
- `ODM_DUAL_READ_SAMPLE_PERCENT`.

Toutes les valeurs absentes ou invalides doivent échouer vers OFF/legacy.

### Sécurité

- aucune `SUPABASE_SERVICE_ROLE_KEY` en `NEXT_PUBLIC_*` ;
- aucune clé serveur dans le bundle client ;
- RLS/revocations sur tables internes ;
- contacts et PII externes non réexposés ;
- logs sans secrets ni payloads bruts inutiles.

## 4. Validation avant merge

Le nombre exact de tests évolue. Ne jamais inscrire un compteur historique comme gate permanent.

Minimum :

```bash
npm ci
npx tsc --noEmit
npm test
npm run build
```

Ajouter les suites ciblées du LOT, puis vérifier :

```bash
git diff --check
git status --short
```

## 5. Flux recommandé

1. créer une branche dédiée ;
2. implémenter un LOT ;
3. exécuter les tests locaux disponibles ;
4. ouvrir une PR ;
5. attendre les gates GitHub Actions ;
6. merger seulement si les preuves sont vertes ;
7. vérifier qu’un déploiement Vercel complet du commit `main` a été créé ;
8. attendre `READY` ;
9. vérifier l’alias Production ;
10. effectuer les smoke tests et contrôles métier ;
11. documenter deployment ID, SHA, limites et rollback.

## 6. Limitation opérationnelle observée

Au 3 août 2026 :

- l’intégration GitHub → Vercel n’a pas toujours déclenché automatiquement un déploiement ;
- le secret GitHub Actions `VERCEL_TOKEN` n’était pas configuré lors d’un essai de workflow ;
- les déploiements partiels contenant seulement quelques fichiers ont échoué et ne doivent pas être utilisés ;
- le déploiement Production réussi a été construit depuis une source complète et authentifiée.

Action durable recommandée : rétablir une intégration Git fiable ou configurer un workflow Vercel sécurisé. Ne jamais contourner ce problème avec un package incomplet.

## 7. Smoke tests publics

Après chaque déploiement :

| Route | Attendu |
|---|---|
| `/` | 200, homepage complète |
| `/acheter` | 200 |
| `/louer` | 200 |
| `/vendre` | 200 |
| `/search?q=appartement%20casablanca` | 200, résultats ou état vide contrôlé |
| `/api/search?...` | JSON valide, fallback maîtrisé |
| `/api/search/gateway?...` | JSON valide, attribution et curseur |
| `/robots.txt` | politique attendue |
| `/sitemap.xml` | réponse valide |
| routes demo | `noindex, nofollow` lorsque prévu |

Vérifier aussi :

- desktop 1280/1440 ;
- tablette 768 ;
- mobile 390/375 ;
- absence d’overflow ;
- console et réseau ;
- liens source HTTP(S) ;
- aucune galerie/contact externe ;
- vraie photo prioritaire sur illustration ;
- fallback legacy si ODM échoue.

## 8. DATA et migrations

- utiliser `apply_migration` ou le flux Supabase prévu pour toute DDL ;
- migrations additives, idempotentes lorsque possible et réversibles ;
- exécuter les audits lecture seule avant et après ;
- ne jamais modifier la Production avec une requête ad hoc non versionnée ;
- différencier migration appliquée, code déployé, flag actif et trafic observé.

## 9. Rollback

### Application

- désactiver le flag concerné ;
- activer le stop switch ;
- redéployer la dernière version saine si nécessaire ;
- vérifier l’alias.

### Canary

- `ODM_PUBLIC_CANARY_STOP=true`, ou désactivation des flags ;
- redéploiement ;
- validation que `/search` et `/api/search` reviennent au legacy.

### DATA

- préférer quarantaine et état inéligible à la suppression ;
- appliquer une migration de rollback versionnée ;
- conserver provenance et audit.

## 10. Définition d’un déploiement terminé

- commit exact connu ;
- deployment ID connu ;
- statut `READY` ;
- alias Production confirmé ;
- routes et contrats vérifiés ;
- métriques critiques contrôlées ;
- aucune erreur bloquante ;
- rollback prêt ;
- documentation mise à jour.
