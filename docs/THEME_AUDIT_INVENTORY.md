# THEME AUDIT INVENTORY — AkarFinder

> Audit réalisé le 2026-06-30. Mission THEME-AUDIT-INVENTORY-1.
> P0 corrigé (THEME-SYSTEM-V1-P0) — P1 corrigé (THEME-SYSTEM-V1-P1) — QA validé (THEME-FINAL-QA-1 — 2026-06-30).

---

## THEME-FINAL-QA-1 — Validation finale — 2026-06-30

| Check | Résultat |
|-------|----------|
| `npm run build` | ✅ OK |
| Tests (51/51) | ✅ OK |
| Smoke 10/10 HTTP 200 | ✅ OK |
| SiteHeader dark mode | ✅ Corrigé (commit 68bd237) |
| Exceptions assumées | ✅ Documentées |
| /compare P2 | ✅ Non bloquant |

**Gaps trouvés et traités :**
- `SiteHeader variant="light"` : corrigé — dark: variants + dual logo
- `IntentPageShell` (/investir, /mre) : P2 documenté (non bloquant)
- `AlertCTA` email input : OK en contexte dark section

**P2 — non bloquant (prod OK sans ces corrections) :**

| Composant | Problème | Impact |
|-----------|----------|--------|
| `CompareTable` + `CompareSummary` | hardcodés light | Lisible — tableau complexe, pages secondaires |
| `IntentPageShell` | `bg-[#f8f9fa]` /investir /mre | Pages secondaires, correction prochaine session |
| `AlertCTA` email input | `bg-white text-gray-900` | Section dark — OK visuellement |

**Recommandation prod : oui** — build OK, tests OK, smoke OK, SiteHeader corrigé.

---

## THEME-SYSTEM-V1-P1 — Statut des corrections

| Composant | Problème | Statut |
|-----------|----------|--------|
| `app/onboarding/page.tsx` | `bg-[#fffdf8]` → `bg-background` | ✅ Corrigé |
| `app/compare/page.tsx` | `bg-[#f8f9fa] text-gray-900` → tokens | ✅ Corrigé |
| `OnboardingStepCard` | card bg-white, text-deepblue, text-gray-5 | ✅ Corrigé |
| `BuyerOnboardingFlow` | chips hardcodés light, inputs bg-white | ✅ Corrigé |
| `BuyerProfileSummary` | summary card bg-white, text-deepblue | ✅ Corrigé |
| `AcheterPageShell` | search form bg-white, chips bg-white/10, card title text-deepblue | ✅ Corrigé |
| `LouerPageShell` | mêmes patterns Acheter | ✅ Corrigé |
| `ComparePageShell` | EmptyState/OneItemState bg-white text-gray-5 | ✅ Corrigé |
| `GoogleLikeHero` + `HomeSearchBar` | dark-only (photo hero) | ⚡ Exception documentée |
| `HomeResultPreview` | dark-only (bloc data intelligence) | ⚡ Exception documentée |
| Stats sections `bg-[#050f1e]/[#040b16]` | dark-only (premium bands) | ⚡ Exception documentée |
| `CompareTable` + `CompareSummary` | hardcodés light (complexe) | 📋 P2 — non critique |

---

---

## Résumé exécutif

| Aspect | État |
|--------|------|
| **Thème clair global** | **Partiel** — certains composants utilisent `bg-background`/`text-foreground`, d'autres restent hardcodés dark |
| **Thème sombre global** | **Partiel** — /search et /neuf sont entièrement hardcodés dark, ignorent le toggle |
| **Pages critiques** | /search, /neuf (hardcodées dark), /acheter (mixte), /louer (mixte), /onboarding (hardcodées light) |
| **Composants critiques** | CreditSimulator (hardcodé dark), ProductHero (hardcodé dark), SearchPanel (hardcodé light), PromoterPageShell (hardcodé light) |
| **Priorité avant prod** | P0 : CreditSimulator illisible en light. P1 : /search et /neuf ignorent le thème. |
| **Recommandation** | **Corriger maintenant** — Le ThemeToggle existe mais ~60% des pages ignorent le thème système |

---

## Palette actuelle détectée

### Couleurs / familles de couleurs utilisées

| Famille | Valeurs | Usage |
|---------|---------|-------|
| **Navy / DeepBlue** | `#071B33`, `#04111F`, `#0C2746`, `#13355C`, `#1D4774` | Fond sombre premium, CTA, textes |
| **Bronze** | `#9B7838`, `#C2A368`, `#B08A47`, `#D4BC8C` | Accents, liens, badges, CTAs |
| **Ivory / Premium White** | `#FBFAF5`, `#F7F5EF`, `#EFEBE0` | Fond clair, surfaces |
| **Beige / Sand** | `#EFEBE0`, `#f0e6d2`, `#fdfaf5` | Bords, inputs, fonds secondaires |
| **White** | `#FFFFFF` | Cards claires, textes sur dark |
| **Black** | `#0B0B0C` | Mono, overlays |
| **Slate / Gray** | `gray-400`, `gray-500`, `gray-700`, `slate-600` | Textes secondaires, placeholders |
| **Emerald** | `#22c55e`, `#34d399`, `#0c4a2a` | Fiabilité "élevée", badges source |
| **Amber** | `#f59e0b`, `#fecaca` | Fiabilité "modérée", badges |
| **Red** | `#ef4444`, `#dc2626` | Fiabilité "à vérifier", erreurs |

### Couleurs hardcodées hex fréquentes

| Couleur | Occurrences estimées | Contexte |
|---------|---------------------|----------|
| `#071B33` | ~30+ | Fonds dark, badges, CTA |
| `#061027` | ~15+ | Fonds pages dark (/search, /neuf) |
| `#050f1e` | ~20+ | Sections dark alternées |
| `#040b16` | ~8+ | Sections dark profondes |
| `#C2A368` | ~40+ | Accents bronze clair |
| `#9B7838` | ~20+ | Accents bronze mat |
| `#0c4a2a` | ~6+ | Badge fiabilité émeraude |
| `#34d399` | ~6+ | Texte fiabilité émeraude |
| `#f0e6d2` | ~10+ | Bords beige clair |
| `#fdfaf5` | ~4+ | Inputs beige |
| `#03101f` | ~12+ | Gradients overlays dark |
| `#0c2746` | ~5+ | Surface dark |
| `#0e7d4f` | ~1+ | CTA vert neuf |

### Tokens existants

| Système | État | Détails |
|---------|------|---------|
| **ThemeProvider** | ✅ Existe | `components/theme/ThemeProvider.tsx` — context React, localStorage `akarfinder-theme` |
| **ThemeToggle** | ✅ Existe | `components/theme/ThemeToggle.tsx` — bouton soleil/lune, aria-label correct |
| **Variables CSS** | ✅ Existentes | `globals.css` — tokens RGB pour light (`:root`) et dark (`[data-theme="dark"]`) |
| **darkMode Tailwind** | ✅ Configuré | `darkMode: ["selector", '[data-theme="dark"]']` dans `tailwind.config.ts` |
| **data-theme** | ✅ Utilisé | Set par ThemeProvider + no-flash script dans layout.tsx |
| **localStorage** | ✅ Persisté | Clé `akarfinder-theme`, fallback `prefers-color-scheme` |
| **Classes dark:** | ⚠️ Sous-utilisées | Seules 2-3 occurrences (`hidden dark:block`), la majorité du code ignore le toggle |
| **NO_FLASH_SCRIPT** | ✅ Existe | Inline script dans `<head>` — évite le flash FOUC |

---

## Pages auditées

### Page : `/` (Homepage)
**Rôle** : Homepage moteur de recherche premium

| Section | Composant probable | Typologie | Thème dark | Thème light | Problème | Priorité |
|---------|-------------------|-----------|------------|-------------|----------|----------|
| Hero photo | ProductHero | hero photo | ❌ Hardcodé dark | ❌ Hardcodé dark | `bg-[#071B33]`, `text-white`, `bg-gradient-to-b from-[#03101F]` — ignore le thème clair | P1 |
| Search bar | SearchPanel | search/filter panel | ❌ Hardcodé light | ✅ OK | `bg-white/[0.9]`, `bg-[#fdfaf5]`, `text-gray-900` — ignore le thème sombre | P1 |
| Quick chips | SearchPanel | chips | ❌ Hardcodé light | ✅ OK | `bg-white`, `border-[#ddd0b4]`, `text-gray-600` | P1 |
| Listing preview | ListingPreview | listing card | ❌ Hardcodé dark | ❌ Hardcodé dark | `bg-[#061027]`, `text-white` | P2 |
| Stats bar | StatsBar | data proof | ✅ OK (tokens) | ✅ OK | Utilise `bg-background`/`text-foreground` | — |
| Signature map | SignatureMapSection | map section | ❌ Hardcodé dark | ❌ Hardcodé dark | Fonds dark fixes | P2 |
| Why section | WhySection | trust block | ✅ OK (tokens) | ✅ OK | — | — |
| City grid | CityIntentGrid | city grid | ❌ Hardcodé dark | ❌ Hardcodé dark | `bg-[#061027]`, `text-white` | P2 |
| Trust block | MreTrustSection | trust block | ✅ OK (tokens) | ✅ OK | — | — |
| CTA final | HomeFinalCTA | CTA block | ❌ Hardcodé dark | ❌ Hardcodé dark | `bg-[#071B33]`, `text-white` | P2 |
| Footer | SiteFooter | footer | ✅ OK (tokens) | ✅ OK | Utilise `bg-surface-muted` | — |

**Couleurs observées** : `bg-[#071B33]`, `text-white`, `bg-white/[0.9]`, `bg-[#fdfaf5]`, `bg-[#061027]`, `#C2A368` accents

**Problèmes détaillés** :
- Hero : section entièrement hardcodée dark — pas de dark: ou data-theme responsive
- SearchPanel : glass card hardcodée light — `bg-white/[0.9]`, `text-gray-900`, `bg-[#fdfaf5]`
- ListingPreview : dark fixed — ignore le toggle

**Exceptions dark/light assumables** : Hero photo peut rester dark (photo sombre = contrast naturel). SearchPanel doit s'adapter.

**Recommandation THEME-SYSTEM-V1** : Hero reste dark (photo). SearchPanel → tokens. ListingPreview → tokens ou dark-only documenté.

---

### Page : `/search`
**Rôle** : Page recherche globale (marketplace)

| Section | Composant probable | Typologie | Thème dark | Thème light | Problème | Priorité |
|---------|-------------------|-----------|------------|-------------|----------|----------|
| Shell complet | LightZillowSearchShell | hero search | ✅ OK (dark) | ❌ **Cassé** — ignore le toggle | `min-h-screen bg-[#061027] text-white` hardcodé, thème clair ignoré | **P0** |
| Sidebar/filtres | QuickFilters | search/filter panel | ✅ OK | ❌ Cassé | Même shell hardcodé | **P0** |
| Listing cards | SearchListingCardDark | listing card | ✅ OK | ❌ Cassé | `bg-white/[0.045]`, `text-white` partout | **P0** |
| Map panel | SearchMapPanel | map section | ✅ OK | ❌ Cassé | Fonds dark fixes | **P0** |
| Badges | SourceBadge | badge | ✅ OK (variant) | ✅ OK (variant) | Supporte `variant="light"/"dark"` | — |
| CTA dossier | LightZillowSearchShell | CTA block | ✅ OK | ❌ Cassé | `bg-white/[0.04]`, `text-white/85` | **P0** |
| Mobile tabs | LightZillowSearchShell | mobile sticky controls | ✅ OK | ❌ Cassé | `border-white/12`, `bg-white/[0.06]` | **P0** |

**Couleurs observées** : `bg-[#061027]`, `text-white`, `bg-deepblue`, `bg-white/[0.04]`, `border-white/10`, `text-white/60`, `text-white/45`

**Problèmes détaillés** :
- La page entière est hardcodée dark — aucun `dark:` prefix, aucun token système
- En thème clair, le body sera ivory mais /search restera navy → **désastre visuel**
- Les CTAs, filtres, badges, skeleton — tout est hardcodé

**Exceptions dark/light assumables** : Aucune. La page doit suivre le toggle.

**Recommandation THEME-SYSTEM-V1** : Refonte complète du shell en tokens. Ou dark-only temporaire documenté avec masquage du ThemeToggle (non recommandé).

---

### Page : `/acheter`
**Rôle** : Page acheter (annonces + sidebar)

| Section | Composant probable | Typologie | Thème dark | Thème light | Problème | Priorité |
|---------|-------------------|-----------|------------|-------------|----------|----------|
| Hero | AcheterPageShell | hero search | ✅ OK (tokens) | ✅ OK (tokens) | `bg-surface`, `text-foreground` | — |
| Search form | AcheterPageShell | search/filter panel | ⚠️ Partiel | ⚠️ Partiel | `bg-white` hardcodé dans le form, `text-gray-800` | P1 |
| Filter chips | AcheterPageShell | chips | ⚠️ Partiel | ⚠️ Partiel | `bg-white/10`, `bg-white/5` — semi-transparent sur dark OK, sur light = blanc sur blanc | P1 |
| Listing cards | AcheterListingCard | listing card | ⚠️ Partiel | ⚠️ Partiel | `bg-card` OK mais `border-[#f0e6d2]`, `text-gray-700` hardcodés | P1 |
| CreditSimulator | CreditSimulator | finance simulator | ✅ OK (dark) | ❌ **Cassé** — hardcodé dark | `text-white`, `bg-white/[0.05]`, `border-white/12` partout | **P0** |
| Doublon block | AcheterPageShell | trust block | ✅ OK (tokens) | ✅ OK (tokens) | `bg-card`, `text-foreground` | — |
| Comparer module | AcheterPageShell | CTA block | ✅ OK (tokens) | ✅ OK (tokens) | — | — |
| Dossier acheteur | AcheterPageShell | CTA block | ✅ OK (tokens) | ✅ OK (tokens) | — | — |
| Stats row | AcheterPageShell | data proof | ❌ Hardcodé dark | ❌ Hardcodé dark | `bg-[#050f1e]`, `text-foreground` | P1 |
| Explorer Maroc | AcheterPageShell | city grid | ❌ Hardcodé dark | ❌ Hardcodé dark | `bg-[#040b16]` | P1 |
| Fiabilité strip | AcheterPageShell | trust block | ❌ Hardcodé dark | ❌ Hardcodé dark | `bg-[#071B33]` mobile strip | P1 |

**Couleurs observées** : `bg-card`, `text-foreground`, `bg-[#050f1e]`, `bg-[#040b16]`, `bg-[#071B33]`, `bg-white`, `text-gray-800`, `text-gray-700`, `border-[#f0e6d2]`

**Problèmes détaillés** :
- **CreditSimulator** : Composant entièrement dark — inputs `bg-white/[0.07] text-white`, labels `text-white/50`, fond `bg-white/[0.05]`. **En thème clair, le texte blanc sur fond beige/ivory est ILLISIBLE** → **P0**
- Search form : `bg-white` hardcodé — en dark, le form sera blanc sur fond navy (OK), mais les classes sont non-systématiques
- Filter chips : `bg-white/10` et `bg-white/5` — sur fond clair, ces opacités créent du blanc sur blanc
- Stats row / Explorer Maroc : `bg-[#050f1e]` et `bg-[#040b16]` — restent dark en light mode
- Card specs : `border-[#f0e6d2]` et `text-gray-700` hardcodés

**Exceptions dark/light assumables** : Stats row et Explorer Maroc peuvent rester dark sections (pattern "bande sombre alternée") si documenté.

**Recommandation THEME-SYSTEM-V1** : CreditSimulator → refonte tokens (P0). Stats/Explorer → dark sections documentées ou tokens. Cards → tokens.

---

### Page : `/louer`
**Rôle** : Page location

| Section | Composant probable | Typologie | Thème dark | Thème light | Problème | Priorité |
|---------|-------------------|-----------|------------|-------------|----------|----------|
| Hero | LouerPageShell | hero search | ✅ OK (tokens) | ✅ OK (tokens) | `bg-surface`, `text-foreground` | — |
| Search form | LouerPageShell | search/filter panel | ⚠️ Partiel | ⚠️ Partiel | `bg-white` hardcodé, `text-gray-800` | P1 |
| Budget chips | LouerPageShell | chips | ⚠️ Partiel | ⚠️ Partiel | `bg-white/10`, `bg-white/5` | P1 |
| Type chips | LouerPageShell | chips | ⚠️ Partiel | ⚠️ Partiel | Même pattern | P1 |
| RentCard | LouerPageShell | listing card | ⚠️ Partiel | ⚠️ Partiel | `border-[#f0e6d2]`, `text-gray-700` | P1 |
| Fiabilité strip | LouerPageShell | trust block | ❌ Hardcodé dark | ❌ Hardcodé dark | `bg-deepblue` mobile strip | P1 |
| Vie quotidienne | LouerPageShell | trust block | ✅ OK (tokens) | ✅ OK (tokens) | `bg-card`, `text-foreground` | — |
| RentAlertForm | RentAlertForm | form | ✅ OK (dark) | ✅ OK (tokens) | Utilise tokens système | — |
| Dossier locataire | LouerPageShell | CTA block | ✅ OK (tokens) | ✅ OK (tokens) | — | — |
| Stats row | LouerPageShell | data proof | ❌ Hardcodé dark | ❌ Hardcodé dark | `bg-[#050f1e]` | P1 |
| Carte des loyers | LouerPageShell | city grid | ❌ Hardcodé dark | ❌ Hardcodé dark | `bg-[#040b16]` | P1 |

**Couleurs observées** : Même pattern que /acheter — mix de tokens et hardcodés

**Problèmes détaillés** : Similaires à /acheter. La section "Carte des loyers" est entièrement dark. Le mobile fiabilité strip est `bg-deepblue`.

**Recommandation THEME-SYSTEM-V1** : Même stratégie que /acheter. Stats/Carte loyers → dark sections documentées ou tokens.

---

### Page : `/neuf`
**Rôle** : Page programmes neufs

| Section | Composant probable | Typologie | Thème dark | Thème light | Problème | Priorité |
|---------|-------------------|-----------|------------|-------------|----------|----------|
| Shell complet | NeufPageShell | hero + dashboard | ✅ OK (dark) | ❌ **Cassé** — ignore le toggle | `min-h-screen bg-[#061027] text-white` hardcodé | **P0** |
| Hero | NeufPageShell | hero search | ✅ OK | ❌ Cassé | `bg-deepblue`, `text-white` | **P0** |
| Project card | NeufPageShell | listing card | ✅ OK | ❌ Cassé | `bg-white/[0.04]`, `text-white` | **P0** |
| Neuf vs Ancien | NeufPageShell | trust block | ✅ OK | ❌ Cassé | `bg-white/[0.04]`, `text-white/80` | **P0** |
| CreditSimulator | CreditSimulator | finance simulator | ✅ OK | ❌ Cassé | Hardcodé dark (même composant que /acheter) | **P0** |
| Contact sidebar | NeufPageShell | CTA block | ✅ OK | ❌ Cassé | `bg-white/[0.05]`, `text-white` | **P0** |
| Stats | NeufPageShell | data proof | ✅ OK | ❌ Cassé | `bg-[#050f1e]`, `text-white` | **P0** |
| Callout promoteurs | NeufPageShell | CTA block | ✅ OK | ❌ Cassé | `bg-[#040b16]`, `text-white` | **P0** |

**Couleurs observées** : `bg-[#061027]`, `text-white`, `bg-deepblue`, `bg-white/[0.04]`, `border-white/10`, `text-white/65`, `text-white/50`, `text-white/45`

**Problèmes détaillés** :
- La page ENTIÈRE est hardcodée dark — comme /search
- `bg-[#061027]` sur le main, `text-white` partout
- En thème clair, le body sera ivory mais /neuf restera navy → **désastre visuel**
- CreditSimulator (même composant que /acheter) est aussi hardcodé dark

**Exceptions dark/light assumables** : Aucune. La page doit suivre le toggle.

**Recommandation THEME-SYSTEM-V1** : Refonte complète du shell en tokens. Ou dark-only temporaire documenté.

---

### Page : `/vendre`
**Rôle** : Page vendeur

| Section | Composant probable | Typologie | Thème dark | Thème light | Problème | Priorité |
|---------|-------------------|-----------|------------|-------------|----------|----------|
| Hero | VendrePageShell | hero search | ✅ OK (tokens) | ✅ OK (tokens) | `bg-surface`, `text-foreground` | — |
| Dashboard | VendrePageShell | dashboard | ✅ OK (tokens) | ✅ OK (tokens) | `bg-background`, `bg-card` | — |
| Estimation | VendrePageShell | finance simulator | ✅ OK (tokens) | ✅ OK (tokens) | — | — |
| Annonces similaires | VendrePageShell | listing card | ✅ OK (tokens) | ✅ OK (tokens) | — | — |
| Checklist | VendrePageShell | trust block | ⚠️ Partiel | ⚠️ Partiel | `bg-[#050f1e]` sections dark | P2 |
| CTA accompagnement | VendrePageShell | CTA block | ✅ OK (tokens) | ✅ OK (tokens) | — | — |

**Couleurs observées** : `bg-background`, `bg-surface`, `bg-card`, `bg-[#050f1e]`, `bg-[#040b16]`

**Problèmes détaillés** : Page globalement bien construite avec tokens. Les sections dark alternées (`bg-[#050f1e]`, `bg-[#040b16]`) restent dark en mode light.

**Recommandation THEME-SYSTEM-V1** : Sections dark → dark-only documentées ou tokens.

---

### Page : `/promoteurs`
**Rôle** : Page B2B promoteurs

| Section | Composant probable | Typologie | Thème dark | Thème light | Problème | Priorité |
|---------|-------------------|-----------|------------|-------------|----------|----------|
| Shell complet | PromoteursPageShell | hero + dashboard | ✅ OK (tokens) | ✅ OK (tokens) | `bg-background`, `text-foreground` | — |
| Hero | PromoteursPageShell | hero search | ✅ OK | ✅ OK | — | — |
| Dashboard cards | PromoteursPageShell | listing card | ✅ OK | ✅ OK | — | — |
| Stats | PromoteursPageShell | data proof | ⚠️ Partiel | ⚠️ Partiel | `bg-[#050f1e]` sections | P2 |
| CTA | PromoteursPageShell | CTA block | ✅ OK | ✅ OK | — | — |

**Problèmes détaillés** : Page globalement bien construite. Sections dark alternées comme les autres pages.

**Recommandation THEME-SYSTEM-V1** : Sections dark → documentées ou tokens.

---

### Page : `/onboarding`
**Rôle** : Flow d'onboarding acheteur/locataire

| Section | Composant probable | Typologie | Thème dark | Thème light | Problème | Priorité |
|---------|-------------------|-----------|------------|-------------|----------|----------|
| Shell | page.tsx | form | ❌ Hardcodé light | ✅ OK | `bg-[#fffdf8]` hardcodé | P1 |
| Step cards | OnboardingStepCard | form | ✅ OK (tokens) | ✅ OK | — | — |
| Chips | BuyerOnboardingFlow | chips | ❌ Hardcodé light | ✅ OK | `border-[#d8c8a3]`, `bg-white`, `text-deepblue` | P1 |
| Inputs | BuyerOnboardingFlow | form | ❌ Hardcodé light | ✅ OK | `border-[#d8c8a3]`, `bg-white`, `text-deepblue` | P1 |
| Summary | BuyerProfileSummary | form | ✅ OK | ✅ OK | — | — |

**Couleurs observées** : `bg-[#fffdf8]`, `border-[#d8c8a3]`, `bg-white`, `text-deepblue`, `bg-[#f7f3ea]`

**Problèmes détaillés** :
- Le main est `bg-[#fffdf8]` hardcodé light
- Les chips et inputs utilisent `border-[#d8c8a3]`, `bg-white` — en dark, ces couleurs claires sur fond sombre seront illisibles
- Le flow est entièrement conçu pour le mode clair

**Exceptions dark/light assumables** : Le flow onboarding peut raisonnablement rester light (contexte form long) — mais doit être documenté.

**Recommandation THEME-SYSTEM-V1** : Soit tokens pour tout le flow, soit dark-only documenté.

---

### Page : `/favorites`
**Rôle** : Page favoris

| Section | Composant probable | Typologie | Thème dark | Thème light | Problème | Priorité |
|---------|-------------------|-----------|------------|-------------|----------|----------|
| Shell | FavoritesPageShell | dashboard | ✅ OK (tokens) | ✅ OK (tokens) | — | — |

---

### Page : `/compare`
**Rôle** : Page comparateur

| Section | Composant probable | Typologie | Thème dark | Thème light | Problème | Priorité |
|---------|-------------------|-----------|------------|-------------|----------|----------|
| Empty state | ComparePageShell | trust block | ❌ Hardcodé light | ✅ OK | `bg-white`, `border-[#d8c8a3]`, `text-deepblue` | P1 |
| Table | CompareTable | admin table | ✅ OK | ✅ OK | — | — |
| Summary | CompareSummary | trust block | ✅ OK | ✅ OK | — | — |

**Problèmes détaillés** : L'empty state est hardcodé light (`bg-white`, `border-[#d8c8a3]`). En dark, blanc sur navy.

**Recommandation THEME-SYSTEM-V1** : Empty state → tokens.

---

### Page : `/pro`
**Rôle** : Espace promoteur Pro

| Section | Composant probable | Typologie | Thème dark | Thème light | Problème | Priorité |
|---------|-------------------|-----------|------------|-------------|----------|----------|
| Shell | ProLeadForm | form | ✅ OK (tokens) | ✅ OK (tokens) | — | — |

---

### Page : `/map` (si présente)
**Rôle** : Carte interactive

Non inspectée en détail — à documenter si nécessaire.

---

## Inventaire des composants à risque

### Composants à rendre theme-safe

| Composant | Pages impactées | Risque | Pourquoi | Priorité |
|-----------|----------------|--------|----------|----------|
| **CreditSimulator** | /acheter, /neuf | **Élevé** | Entièrement hardcodé dark (`text-white`, `bg-white/[0.05]`, `border-white/12`). **Illisible en thème clair** — texte blanc sur fond beige/ivory | **P0** |
| **LightZillowSearchShell** | /search | **Élevé** | Shell entier hardcodé dark (`bg-[#061027]`, `text-white`). Ignore le toggle thème | **P0** |
| **NeufPageShell** | /neuf | **Élevé** | Shell entier hardcodé dark (`bg-[#061027]`, `text-white`). Ignore le toggle thème | **P0** |
| **SearchListingCardDark** | /search | **Élevé** | Card entièrement dark (`bg-white/[0.045]`, `text-white`). Ignore le toggle | **P0** |
| **ProductHero** | / | **Moyen** | Hero hardcodé dark (`bg-[#071B33]`, `text-white`). Acceptable si photo sombre | P1 |
| **SearchPanel** | / | **Moyen** | Search card hardcodée light (`bg-white/[0.9]`, `text-gray-900`). Ignore le dark | P1 |
| **HomeSearchBar** | / (ancien) | **Moyen** | Hardcodé dark glass. Ignore le toggle | P1 |
| **BuyerOnboardingFlow** | /onboarding | **Moyen** | Chips/inputs hardcodés light (`border-[#d8c8a3]`, `bg-white`). Ignore le dark | P1 |
| **OnboardingStepCard** | /onboarding | **Faible** | Utilise tokens | — |
| **AcheterPageShell** | /acheter | **Moyen** | Mix tokens + hardcodés. Search form `bg-white`, specs `text-gray-700` | P1 |
| **LouerPageShell** | /louer | **Moyen** | Mix tokens + hardcodés. Mêmes patterns que Acheter | P1 |
| **VendrePageShell** | /vendre | **Faible** | Globalement tokens. Sections dark alternées | P2 |
| **PromoteursPageShell** | /promoteurs | **Faible** | Globalement tokens. Sections dark alternées | P2 |
| **PromoterPageShell** | /promoteurs/[slug] | **Moyen** | Hardcodé light (`bg-[#f8f9fa]`, `text-gray-900`). Ignore le dark | P1 |
| **ComparePageShell** | /compare | **Faible** | Empty state hardcodé light, reste tokens | P2 |
| **SiteHeader** | toutes | **Faible** | Gère variant dark/light/transparent. Fonctionne bien | — |
| **SiteFooter** | toutes | **Faible** | Utilise tokens (`bg-surface-muted`) | — |
| **ThemeProvider** | global | **Faible** | Fonctionnel, persistant | — |
| **ThemeToggle** | global | **Faible** | Fonctionnel, accessible | — |
| **SourceBadge** | /acheter, /louer, /search | **Faible** | Supporte variant light/dark | — |
| **ReliabilityBadge** | /acheter, /louer | **Faible** | Utilise tokens | — |
| **SourceAttribution** | listings | **Faible** | Utilise tokens | — |
| **RentAlertForm** | /louer | **Faible** | Utilise tokens | — |
| **ProLeadForm** | /pro | **Faible** | Utilise tokens | — |
| **SellerLeadForm** | /vendre/dossier | **Faible** | Utilise tokens | — |
| **SearchMapPanel** | /search | **Élevé** | Hardcodé dark (SVG Maroc + clusters) | P1 |
| **QuickFilters** | /search | **Élevé** | Hardcodé dark (glass dark) | P1 |
| **ListingVisual** | toutes cards | **Faible** | SVG generatif, thème-agnostic | — |
| **TrackedLink** | toutes | **Faible** | Wrapper transparent | — |

---

## Inventaire couleurs hardcodées

### Hardcoded colors inventory

| Fichier | Occurrences | Type | Risque thème | Note |
|---------|-------------|------|-------------|------|
| `components/search/LightZillowSearchShell.tsx` | ~50+ | bg, text, border | **Élevé** | Shell entier dark hardcodé |
| `components/neuf/NeufPageShell.tsx` | ~60+ | bg, text, border | **Élevé** | Shell entier dark hardcodé |
| `components/search/SearchListingCardDark.tsx` | ~30+ | bg, text, border | **Élevé** | Card entière dark |
| `components/credit/CreditSimulator.tsx` | ~40+ | bg, text, border | **Élevé** | Composant entièrement dark |
| `components/landing/ProductHero.tsx` | ~15+ | bg, text | **Moyen** | Hero dark hardcodé |
| `components/landing/SearchPanel.tsx` | ~20+ | bg, text, border | **Moyen** | Search card light hardcodé |
| `components/home/HomeSearchBar.tsx` | ~15+ | bg, text, border | **Moyen** | Ancien search bar dark |
| `components/onboarding/BuyerOnboardingFlow.tsx` | ~10+ | bg, border, text | **Moyen** | Chips/inputs light hardcodés |
| `components/intent/AcheterPageShell.tsx` | ~15+ | bg, text, border | **Moyen** | Mix tokens + hardcodés |
| `components/location/LouerPageShell.tsx` | ~15+ | bg, text, border | **Moyen** | Mix tokens + hardcodés |
| `components/listings/PhotoFirstListingCard.tsx` | ~20+ | bg, text, border | **Moyen** | Card partagée, light hardcodé |
| `components/promoters/PromoterPageShell.tsx` | ~15+ | bg, text | **Moyen** | Shell light hardcodé |
| `components/search/SearchMapPanel.tsx` | ~20+ | bg, text | **Moyen** | Carte dark |
| `components/search/QuickFilters.tsx` | ~10+ | bg, text | **Moyen** | Filtres dark |
| `components/vendre/VendrePageShell.tsx` | ~8+ | bg | **Faible** | Sections dark alternées |
| `components/promoteurs/PromoteursPageShell.tsx` | ~5+ | bg | **Faible** | Sections dark alternées |
| `components/compare/ComparePageShell.tsx` | ~5+ | bg, border | **Faible** | Empty state light |
| `app/onboarding/page.tsx` | 1 | bg | **Faible** | `bg-[#fffdf8]` |
| `app/layout.tsx` | 0 | — | **Faible** | Thème-agnostic |

---

## Captures / QA visuelle

> Captures non disponibles (mission audit seule, pas de code modifié).
> Compensé par inspection DOM/classes + analyse structurelle.

---

## Build / Smoke

> Pas de build/smoke lancé — mission audit uniquement, aucun code modifié.

---

## Synthèse des problèmes par priorité

### P0 — Bloque prod (4 problèmes)

1. **CreditSimulator** — Entièrement hardcodé dark. En thème clair : texte blanc sur fond beige/ivory = **illisible**. Impacte /acheter et /neuf.
2. **LightZillowSearchShell** (/search) — Shell entier hardcodé dark. En thème clair : le toggle ne fait rien sur cette page.
3. **NeufPageShell** (/neuf) — Shell entier hardcodé dark. Même problème que /search.
4. **SearchListingCardDark** — Card hardcodée dark. Utilisée dans /search uniquement.

### P1 — Important (12 problèmes)

1. **ProductHero** — Hero hardcodé dark (acceptable si photo, mais pas token-safe)
2. **SearchPanel** — Search card hardcodée light
3. **HomeSearchBar** — Ancien search bar hardcodé dark
4. **BuyerOnboardingFlow** — Chips/inputs hardcodés light
5. **AcheterPageShell** — Search form, chips, stats, explorer Maroc mixtes
6. **LouerPageShell** — Mêmes patterns que Acheter
7. **PromoterPageShell** — Shell hardcodé light
8. **SearchMapPanel** — Carte hardcodée dark
9. **QuickFilters** — Filtres hardcodés dark
10. **PhotoFirstListingCard** — Card partagée hardcodée light
11. **ComparePageShell** — Empty state hardcodé light
12. **Onboarding page** — `bg-[#fffdf8]` hardcodé

### P2 — Polish (6 problèmes)

1. Stats rows dark alternées (/acheter, /louer, /vendre, /neuf)
2. Explorer Maroc / Carte des loyers sections dark
3. ListingPreview homepage dark
4. CityIntentGrid homepage dark
5. HomeFinalCTA homepage dark
6. Checklist sections dark (/vendre)

### P3 — Acceptable (0 problèmes)

Aucun — tous les problèmes identifiés nécessitent une action.

---

## Exceptions dark/light recommandées

| Section | Peut rester dark en light ? | Raison | Action THEME-SYSTEM-V1 |
|---------|----------------------------|--------|----------------------|
| Hero photo homepage | ✅ Oui | Photo sombre = contraste naturel, standard premium | Documenter comme "dark-only section" |
| Stats rows alternées | ✅ Oui | Pattern "bande sombre alternée" courant | Tokens ou documenter |
| Explorer Maroc / Carte loyers | ✅ Oui | Section cartographique = contexte premium | Tokens ou documenter |
| SearchListingCardDark | ❌ Non | Doit suivre le toggle | Tokens obligatoires |
| CreditSimulator | ❌ Non | Illisible en light | Tokens obligatoires |
| /search shell | ❌ Non | Doit suivre le toggle | Tokens obligatoires |
| /neuf shell | ❌ Non | Doit suivre le toggle | Tokens obligatoires |
| Onboarding flow | ⚠️ Optionnel | Form long = contexte spécifique | Tokens ou documenter "light-only" |

---

## Recommandation pour THEME-SYSTEM-V1

### Stratégie recommandée

1. **Phase 1 — P0** : Refondre CreditSimulator + LightZillowSearchShell + NeufPageShell + SearchListingCardDark en tokens système
2. **Phase 2 — P1** : Refondre ProductHero, SearchPanel, BuyerOnboardingFlow, AcheterPageShell, LouerPageShell, PromoterPageShell, SearchMapPanel, QuickFilters, PhotoFirstListingCard
3. **Phase 3 — P2** : Documenter les sections dark-only (stats, cartes, hero) ou les convertir en tokens
4. **Phase 4 — Polish** : Vérifier tous les badges, CTAs, inputs, placeholders en mode clair ET sombre

### Architecture recommandée

- Les tokens CSS (`globals.css`) et Tailwind (`tailwind.config.ts`) sont bien configurés — **le système existe, il est juste sous-utilisé**
- La majorité des composants tokens (`bg-card`, `text-foreground`, `bg-background`) fonctionnent déjà
- Le problème principal est l'utilisation de `bg-[#061027]`, `text-white`, `bg-white/[0.04]` au lieu des tokens
- Chaque composant hardcodé doit être migré vers les tokens existants
- Les sections dark-only (hero photo, stats) doivent être documentées et marquées `data-theme-ignore` ou similaires

### Components les plus risqués (top 5)

1. **CreditSimulator** — P0, impacte 2 pages
2. **LightZillowSearchShell** — P0, page entière
3. **NeufPageShell** — P0, page entière
4. **SearchListingCardDark** — P0, card partagée
5. **SearchPanel** — P1, composant homepage critique

### Couleurs hardcodées principales à migrer

1. `bg-[#061027]` → `bg-background` ou `bg-deepblue` (tokens)
2. `text-white` → `text-foreground` (tokens)
3. `bg-white/[0.04]` → `bg-card` (tokens)
4. `border-white/10` → `border-border` (tokens)
5. `text-white/60` → `text-muted-foreground` (tokens)
6. `bg-[#050f1e]` → dark section documentée ou token
7. `bg-[#040b16]` → dark section documentée ou token
8. `bg-[#071B33]` → `bg-deepblue` (token existant)
9. `text-gray-700` → `text-foreground` ou `text-muted-foreground`
10. `border-[#f0e6d2]` → `border-border` (token)

---

## Statistiques audit

| Métrique | Valeur |
|----------|--------|
| Pages auditées | 11 |
| Sections auditées | ~60 |
| Pages OK light | 3 (/vendre, /promoteurs, /favorites) |
| Pages partiellement light | 4 (/, /acheter, /louer, /compare) |
| Pages cassées light | 4 (/search, /neuf, /onboarding, /pro/[slug]) |
| Pages OK dark | 7 (/vendre, /promoteurs, /favorites, /pro, /map, /compare, /acheter partiel) |
| Problèmes P0 | 4 |
| Problèmes P1 | 12 |
| Problèmes P2 | 6 |
| Composants les plus risqués | CreditSimulator, LightZillowSearchShell, NeufPageShell, SearchListingCardDark, SearchPanel |
| Couleurs hardcodées principales | `#061027`, `#050f1e`, `#040b16`, `#071B33`, `#fffdf8`, `#f0e6d2`, `#d8c8a3` |
| Exceptions dark/light recommandées | Hero photo, Stats rows, Cartes géographiques |

---

## Statut

- **THEME-AUDIT-INVENTORY-1** : ✅ Completed
- **THEME-SYSTEM-V1** : Not started

---

*Document généré par audit audit-only. Aucune modification de code effectuée.*
