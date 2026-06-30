# AkarFinder — Theme System (Light / Dark)

**Mission:** AKARFINDER THEME SYSTEM LIGHT/DARK
**Date:** 2026-06-29

---

## 1. Architecture (livrée — Phase 1)

Système propre **par tokens CSS**, zéro `theme === "dark"` dispersé dans le JSX.

| Élément | Fichier |
|---|---|
| Tokens sémantiques (light `:root` + dark `[data-theme="dark"]`) | `app/globals.css` |
| Mapping Tailwind → tokens (`bg-background`, `text-foreground`…) | `tailwind.config.ts` |
| Provider (localStorage + prefers-color-scheme + sync) | `components/theme/ThemeProvider.tsx` |
| Script anti-flash (avant paint) + `<ThemeProvider>` | `app/layout.tsx` |
| Bouton toggle soleil/lune (header, a11y) | `components/theme/ThemeToggle.tsx` |

### Tokens disponibles
`background`, `foreground`, `surface`, `surface-muted`, `card`, `card-foreground`,
`border`, `muted`, `muted-foreground`, `accent`, `brand-navy`, `brand-bronze`, `brand-ivory`.

Usage Tailwind : `bg-background text-foreground`, `bg-card text-card-foreground`,
`border-border/15`, `text-muted-foreground`, `bg-accent`, etc. (alpha supporté :
`bg-accent/10`, `border-border/20`).

### Thèmes
- **Light** (défaut) : ivoire `#FBFAF5`, encre navy `#071B33`, cartes blanches, accent bronze mat `#9B7838`.
- **Dark** : navy `#071B33`, ivoire `#F7F5EF`, cartes `#0D2545`, accent bronze clair `#C2A368`.

### Persistance / anti-flash
- Clé localStorage : `akarfinder-theme`.
- Fallback `prefers-color-scheme` si aucun choix stocké.
- Script inline dans `<head>` applique `data-theme` **avant le paint** → pas de flash.
- `<html suppressHydrationWarning>` pour éviter le warning d'hydratation.

### Vérifié
- ✅ build sans régression
- ✅ toggle présent dans le header (desktop + mobile), clavier, `aria-label`/`aria-pressed`
- ✅ light par défaut, toggle → dark, **persisté après refresh** (sans flash)

---

## 2. Bandes sombres intentionnelles (dark dans les deux modes)

Choix design premium assumé — ces surfaces restent sombres en clair ET en sombre
(pattern « dark showcase band » classique sur sites premium) :

- **ProductHero** (`components/landing/ProductHero.tsx`) — hero photo plein écran
- **SignatureMapSection** (`components/landing/SignatureMapSection.tsx`) — carte intelligente
- **HomeFinalCTA** (`components/landing/HomeFinalCTA.tsx`) — CTA final
- **SiteFooter** (`components/landing/SiteFooter.tsx`) — pied de page `#0C0C0C`

→ Aucune conversion nécessaire : volontairement sombres dans les deux thèmes.

---

## 3. Phase 2 — sections homepage converties ✅

Sections de contenu migrées aux tokens (cohérentes light ET dark) :
- [x] `components/landing/WhySection.tsx`
- [x] `components/landing/CityIntentGrid.tsx`
- [x] `components/landing/HowItWorks.tsx`
- [x] `components/landing/ListingPreview.tsx` (CTA via `primary-token`)
- [x] `components/landing/MreTrustSection.tsx`
- [x] `app/page.tsx` (wrapper `bg-background text-foreground`)

Token CTA ajouté : `primary-token` / `primary-token-foreground`
(navy→blanc en light, bronze→navy en dark) pour les boutons primaires.

**Recette de migration** (mécanique, pour les composants restants) :

| Codé en dur | → Token |
|---|---|
| `bg-white`, `bg-[#fafaf7]`, `bg-[#FBFAF5]` | `bg-background` ou `bg-card` |
| `text-gray-900`, `text-[#071B33]` | `text-foreground` / `text-card-foreground` |
| `text-gray-500/600/400` | `text-muted-foreground` |
| `bg-[#F7F5EF]`, `bg-[#f8fafc]`, `bg-[#EFEBE0]` | `bg-surface` / `bg-surface-muted` |
| `border-gray-100/200`, `border-[#e2d9c9]` | `border-border/15` |
| boutons `bg-[#0b2345] text-white` | `bg-primary-token text-primary-token-foreground` |

## 4. Bandes sombres + composants restants (migration ultérieure)

Bandes volontairement sombres (dark dans les 2 modes — voir §2) :
ProductHero, MarketPulse (`#08131D`), DataProofBlock (`#0C0C0C`),
SignatureMapSection, HomeFinalCTA, SiteFooter.

Page Carte `/map` ✅ :
- [x] Style de tuiles MapLibre theme-aware — `liberty` (light) ↔ `dark-matter` (dark),
      les deux gratuits sans clé API. `setStyle` au changement de thème,
      markers HTML conservés (`components/map/MapExperience.tsx`).

Restant à migrer (prochain sprint) :
- [ ] `components/layout/SiteHeader.tsx` — fusionner les variantes light/dark sur les tokens
- [ ] Panneaux de filtres/liste `/map` — déjà lisibles sur les 2 cartes (cartes flottantes),
      tokenisation fine optionnelle

> Hors scope explicite (à ne pas toucher) : Supabase, API, scrapers, Typesense,
> logique métier, routes, données.

---

## 4. Critères d'acceptation — état

| Critère | État |
|---|---|
| Thème sombre actuel intact | ✅ (bandes sombres préservées) |
| Thème clair premium (ivoire/sable, pas blanc clinique) | ✅ tokens chauds |
| Bouton clair/sombre fonctionne | ✅ |
| Choix persisté | ✅ localStorage + anti-flash |
| Foundation propre par tokens (pas de `theme===dark` épars) | ✅ |
| Homepage cohérente dans les 2 modes | ✅ (light premium + dark navy homogène) |
| Page Carte cohérente dans les 2 modes | ✅ (tuiles liberty ↔ dark-matter selon thème) |
| Aucun gros redesign global | ✅ |
| Pas de régression build | ✅ |
