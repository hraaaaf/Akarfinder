# AkarFinder — Brand System

Référence officielle : `public/brand/brand-board-reference.png` (brand board).
Ce document décrit l'intégration de l'identité visuelle premium d'AkarFinder.
**Aucune nouvelle direction graphique ne doit être inventée** : la brand board fait foi.

AkarFinder est une plateforme immobilière marocaine **premium, sérieuse, institutionnelle et moderne**.

---

## 1. Couleurs officielles

| Token | HEX | Usage |
|-------|-----|-------|
| **Deep Blue** | `#071B33` | Fond sombre premium, wordmark sur fond clair, headers/footers, theme PWA |
| Deep Blue 700 | `#0C2746` | Survol/profondeur |
| **Bronze premium** | `#9B7838` | Symbole sur fond clair, accents, baseline |
| Bronze clair | `#C2A368` | Symbole + accents **sur fond sombre** |
| **Premium Blanc** | `#F7F5EF` | Fond clair cassé (jamais blanc pur agressif) |
| **Noir monochrome** | `#0B0B0C` | Documents, exports, cas sobres |

### Interdictions
- ❌ Pas de bleu générique (`#2563EB` et dérivés) comme couleur de marque.
- ❌ Pas de doré jaune (le bronze est terreux, pas jaune).
- ❌ Pas de gradients flashy.
- ✅ Les variantes sombres restent premium et très lisibles.

### Où sont définies les couleurs
- **Tailwind** : `tailwind.config.ts` → `deepblue`, `bronze`, `premium`, `mono`.
  Exemples : `bg-deepblue`, `text-bronze-700`, `bg-bronze-500`, `text-premium-white`.
- **CSS variables** : `app/globals.css` → `--brand-deepblue`, `--brand-bronze`,
  `--brand-bronze-light`, `--brand-premium-white`, `--brand-mono`.

Les anciens alias (`navy`, `ink`, `gold`, `primary`, `sand`, `cream`) sont **remappés**
sur la nouvelle palette pour une transition douce — ils pointent désormais vers Deep Blue / Bronze.

---

## 2. Logo & composant `<BrandLogo />`

Tous les emplacements du site **doivent** utiliser `components/ui/BrandLogo.tsx`.
Ne jamais importer les fichiers logo directement dans une page/section.

```tsx
import { BrandLogo } from "@/components/ui/BrandLogo";

<BrandLogo variant="default" size="sm" />        // header / app
<BrandLogo variant="official" size="md" />       // documents, sections premium
<BrandLogo variant="dark" showTagline size="md" /> // footer / fond sombre
<BrandLogo variant="icon" size="sm" />           // badges, loaders, empty states
<BrandLogo variant="monochrome" />               // exports sobres (noir/blanc)
```

### Props
| Prop | Valeurs | Détail |
|------|---------|--------|
| `variant` | `default` \| `official` \| `icon` \| `dark` \| `monochrome` | voir ci-dessous |
| `showTagline` | `boolean` | force/masque la baseline (override) |
| `size` | `sm` \| `md` \| `lg` | `sm` = format compact |
| `onDark` | `boolean` | pose le logo sur fond sombre |

- **default** : logo sans tagline (symbole bronze + wordmark Deep Blue).
- **official** : logo avec baseline « Intelligence immobilière au Maroc ».
- **icon** : monogramme AF seul.
- **dark** : fond sombre — symbole bronze clair + wordmark blanc.
- **monochrome** : tout noir (fond clair) ou tout blanc (fond sombre).

Le monogramme est vectorisé dans `components/ui/brand-mark-path.ts` (rendu inline en
`currentColor`, donc net à toutes les tailles et recolorable). **Ne pas réinterpréter** ce tracé.

### Règles d'usage
- **Header web** : `variant="default"` (jamais de baseline). Symbole bronze + wordmark
  Deep Blue sur fond clair ; sur fond sombre, symbole bronze + wordmark blanc cassé.
- **Footer** : `variant="dark" showTagline` (logo officiel avec baseline) sur fond Deep Blue.
- **Petits formats** : la baseline **n'apparaît jamais** en `size="sm"` — le composant
  bascule automatiquement vers le logo sans tagline.
- Le **symbole reste toujours bronze** (sauf `monochrome`). L'étoile bronze est
  **décorative uniquement** — jamais intégrée au logo principal.

---

## 3. Favicon / App icon / PWA

Monogramme AF bronze sur fond **Deep Blue**, coins arrondis.

- `app/layout.tsx` → `metadata.icons` (favicon.ico + PNG 16/32/512 + apple-touch 180).
- `app/manifest.ts` → manifest PWA (`/manifest.webmanifest`), `theme_color`/`background_color` = `#071B33`.
- Open Graph / Twitter : `public/brand/og-image.png` (1200×630, Deep Blue).

Tailles favicon générées : 16, 32, 48, 64, 128, 256, 512, 1024 + maskable 512.

---

## 4. Assets de production (`public/brand/`)

| Fichier | Usage |
|---------|-------|
| `mark.svg` | Monogramme vectoriel `currentColor` (master) |
| `mark-bronze.svg` / `mark-deepblue.svg` | Monogramme couleur fixe |
| `mark-bronze.png` / `-bronze-light` / `-deepblue` / `-black` / `-white` (1024) | Symbole PNG transparent |
| `logo-official.png` / `logo-official-dark.png` | Lockup avec baseline (clair / sombre) |
| `logo-default.png` / `logo-default-dark.png` | Lockup sans baseline |
| `favicon-*.png`, `favicon.ico`, `apple-touch-icon.png` | Favicons |
| `app-icon-512/1024.png`, `icon-maskable-512.png` | App icons PWA |
| `star-bronze.svg` / `.png` | Élément décoratif (étoile) — usage décoratif uniquement |
| `og-image.png` | Open Graph / partage social |
| `brand-board-reference.png` | Référence brand board officielle |

---

## 5. Composants concernés
- `components/ui/BrandLogo.tsx` — composant central.
- `components/ui/brand-mark-path.ts` — tracé vectoriel du monogramme.
- `components/layout/SiteHeader.tsx` — header (logo sans tagline, accents Deep Blue/Bronze).
- `components/landing/SiteFooter.tsx` — footer (logo officiel + baseline, fond Deep Blue).
- `app/layout.tsx` — metadata, favicon, Open Graph.
- `app/manifest.ts` — PWA.
- `tailwind.config.ts` / `app/globals.css` — tokens couleur.

## 6. Action restante (migration progressive)
Certaines sections produit (cartes annonces, CTA secondaires) utilisent encore le bleu
générique hérité comme **accent fonctionnel**. Migrer ces accents vers les tokens
`deepblue` / `bronze` au fil des évolutions, sans refonte UI globale.
