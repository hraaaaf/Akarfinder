SEARCH-LIVE-DB-PUBLICATION-FIX-1
================================

## Diagnostic

### Architecture de la chaîne

```
/search → LightZillowSearchShell → fetch /api/search
       → searchListings() → searchDatabase()
       → queryListings({ limit:200, city, property_type, transaction_type })
       → querySupabaseListings() [si DATABASE_PROVIDER=supabase + keys]
       → mapToDbRow() + mapDbRowToListing()
       → matchesFilters() [text, budget, surface côté client]
       → SearchListingCardDark [guards production_allowed + can_show_result]
```

### Variables d'environnement requises

| Variable | Valeur | Impact si absente |
|---|---|---|
| `DATABASE_PROVIDER` | `supabase` | Fallback SQLite silencieux → 0 résultats |
| `SUPABASE_URL` | URL Supabase | `isSupabaseConfigured()` = false → SQLite |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service | Idem |

**Vérifier dans Vercel Dashboard → Project → Settings → Environment Variables.**

### Guards de visibilité (`SearchListingCardDark.tsx`)

```ts
if (listing.can_show_result === false) return null;
if (process.env.NODE_ENV === "production" && listing.production_allowed === false) return null;
```

- `can_show_result` : toujours `true` pour Mubawab/Agenz/LogicImmo
- `production_allowed` : `false` uniquement pour Avito (market signal)

---

## Bugs corrigés

### Bug 1 — `matchesFilters` comparaison stricte `property_type`

**Avant :** `listing.property_type !== query.property_type`

- `listing.property_type` = "Appartement" (mappé par `mapPropertyType`)
- `query.property_type` = "apartment" (depuis deep-link URL)
- Résultat : `"Appartement" !== "apartment"` → 0 résultats

**Après :** `toMappedPropertyType("apartment")` → "Appartement" → match

```
"apartment" / "appartement" → "Appartement"
"villa"                     → "Villa"
"land" / "terrain"          → "Terrain"
"office" / "bureau"         → "Bureau"
```

### Bug 2 — `matchesFilters` comparaison stricte `transaction_type`

Même pattern pour `transaction_type` : "sale" → "buy", "location" → "rent".
Désormais géré par `toMappedTransactionType()`.

### Bug 3 — `searchDatabase` ne poussait aucun filtre vers Supabase

**Avant :**
```ts
const base = await queryListings({ limit: 100, offset: 0 });
```

**Après :**
```ts
const base = await queryListings({
  city: query.city,
  property_type: query.property_type,
  transaction_type: query.transaction_type,
  limit: 200,
  offset: 0,
});
```

Supabase normalise en interne (`normalizePropertyType`, `normalizeTransactionType`)
avant d'appliquer les filtres `.eq()`. Les filtres client-side (`matchesFilters`)
continuent pour le texte libre, budget et surface.

### Bug 4 — Cap Supabase 100 rows bloquait les requêtes internes

`querySupabaseListings` plafonnait à 100 rows. Le `limit: 200` envoyé
par `searchDatabase` était silencieusement tronqué.

**Corrigé :** cap relevé à 500 pour les requêtes internes.

### Bug 5 — Logs diagnostiques absents

**Ajouté dans `lib/db/index.ts` :**
```
[db] provider=supabase supabase_configured=true via=supabase
[db] supabase returned 82/82 rows
```

Ces logs apparaissent dans **Vercel → Project → Logs → Functions** à chaque
requête `/api/search`. Si on voit `via=sqlite` ou `supabase_configured=false`,
les env vars ne sont pas configurées.

---

## Checklist de vérification production

- [ ] Vercel env : `DATABASE_PROVIDER=supabase` présent
- [ ] Vercel env : `SUPABASE_URL` présent
- [ ] Vercel env : `SUPABASE_SERVICE_ROLE_KEY` présent
- [ ] Vercel logs Function `/api/search` → `via=supabase` visible
- [ ] Vercel logs → `supabase returned X/Y rows` avec X > 0
- [ ] `/search` sans filtre → listings AkarFinder visibles
- [ ] `/search?city=Casablanca` → listings filtrés
- [ ] `/search?property_type=apartment` → deep-link fonctionne
- [ ] `/listings/[id]` → page détail accessible
- [ ] `reliability_badge` visible sur les cartes
- [ ] `source_name` / CTA "Voir l'annonce" présent avec `listing_url`

---

## Ce qui n'a pas été changé

- Schéma DB : aucune migration
- Search Gateway : non touché
- Frontend (au-delà des guards déjà en place) : non modifié
- Scrapers : non touchés
- PII guards : inchangés (`can_show_contact=false` hors partenaire)
