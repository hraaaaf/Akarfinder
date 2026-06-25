# Déploiement AkarFinder — Vercel + Supabase

## Prérequis

- Projet Supabase créé (supabase.com)
- Migration appliquée : `scripts/scrapers/db/supabase-migration.sql`
- Données synchronisées : `npm run sync:supabase`
- Vérification OK : `npm run check:supabase`

---

## Variables d'environnement Vercel

À ajouter dans Vercel > Project > Settings > Environment Variables.

| Variable | Valeur | Visibilité |
|---|---|---|
| `DATABASE_PROVIDER` | `supabase` | All environments |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Server only |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Server only |

### Règles de sécurité

- `SUPABASE_SERVICE_ROLE_KEY` — **jamais de préfixe `NEXT_PUBLIC_`**. Cette clé bypass RLS : si elle est exposée côté client, n'importe qui peut lire/écrire toute la base.
- `SUPABASE_URL` — pas de préfixe `NEXT_PUBLIC_` non plus. L'URL n'est utilisée que dans les API routes (`runtime = "nodejs"`), pas dans le bundle client.
- Aucune clé anon (`SUPABASE_ANON_KEY`) n'est utilisée. Toutes les lectures passent par la service role key côté serveur.

---

## Architecture DB

```
DATABASE_PROVIDER=supabase  →  lib/db/supabase-listings.ts  →  Supabase (cloud)
DATABASE_PROVIDER=sqlite    →  lib/db → dynamic import db-listings.ts → SQLite local
```

Le module `node:sqlite` est chargé **uniquement** si le chemin SQLite est emprunté à l'exécution (import dynamique). En mode Supabase, `node:sqlite` n'est jamais résolu — Vercel peut donc tourner sur Node.js 20+ sans erreur.

Pour le développement local avec SQLite : **Node.js ≥ 22.5.0** requis (node:sqlite est expérimental avant ça).

---

## Node.js

- Production Vercel (Supabase) : Node.js 20+ suffit
- Développement local (SQLite) : Node.js 22.5+ requis
- Réglage Vercel recommandé : **Node.js 22.x** (Settings > General > Node.js Version)

---

## Commandes build

```bash
# Build standard (lit DATABASE_PROVIDER depuis .env.local ou env Vercel)
npm run build

# Vérifier en mode Supabase localement
DATABASE_PROVIDER=supabase npm run build
DATABASE_PROVIDER=supabase npm run start
```

---

## Déploiement Vercel

```bash
# Via CLI Vercel
vercel --prod

# Via Git
git push origin main  # Vercel déploie automatiquement
```

---

## Vérification post-déploiement

Tester ces routes après chaque déploiement :

| Route | Attendu |
|---|---|
| `GET /api/listings` | `{ source: "supabase", listings: [...], total: N }` |
| `GET /api/stats` | `{ total_listings: N, avg_completeness: N, ... }` |
| `GET /` | Homepage avec DataProofBlock visible |
| `GET /search` | Annonces chargées depuis Supabase |
| `GET /listings/[id]` | Fiche listing fonctionnelle |

### Commande de vérification locale avant deploy

```bash
npm run check:supabase   # connexion + données
npm run test:scrapers    # 110/110
npm run test:api         # 34/34
npm run build            # 0 erreur TypeScript
```

### Vérification API en ligne

```bash
curl https://votre-domaine.vercel.app/api/listings?limit=3 | jq '.source'
# Attendu : "supabase"

curl https://votre-domaine.vercel.app/api/stats | jq '.'
# Attendu : { total_listings, avg_completeness, duplicates_detected, avg_reliability }
```

---

## Sécurité — checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` absent du bundle client (vérifier Network tab)
- [ ] `SUPABASE_URL` absent du bundle client
- [ ] Aucun numéro de téléphone dans les réponses `/api/listings` (PII guard actif)
- [ ] Aucun email dans les réponses `/api/listings`
- [ ] RLS activée sur toutes les tables Supabase

---

## Mise à jour des données

Quand la base SQLite locale est enrichie (après `npm run enrich:p6`) :

```bash
npm run sync:supabase    # re-sync SQLite → Supabase (idempotent)
npm run check:supabase   # vérification
```

Pas besoin de redéployer — les données sont lues à la demande depuis Supabase.
