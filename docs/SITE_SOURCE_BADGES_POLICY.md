# Site Source Badges Policy

## Principe fondamental

**Source Badge ≠ Reliability Score** — deux concepts orthogonaux.

| Concept | Mesure | Composant |
|---|---|---|
| Source Badge | Origine + statut + droits d'affichage | `SourceBadge` |
| Reliability Score | Qualité / complétude / cohérence / fraîcheur | `ReliabilityBadge` |

Un score de fiabilité élevé ne peut **jamais** augmenter les droits d'affichage.
Un badge source élevé ne dit **rien** sur la qualité des données.

## Mapping sources actives

### Mubawab → `public_index_source`

```
source_display_type:      "public_index_source"
source_badge:             "public_indexed"
display_depth:            "limited_preview"
thumbnail_policy:         "single_thumbnail_allowed"
original_source_required: true
allowed_ctas:             ["view_original", "view_source", "compare"]
display_images.policy:    "single_thumbnail_allowed"
display_images.urls:      [] (DB n'a pas de tableau d'URLs)
```

**Interdit pour Mubawab :** contact, whatsapp, request_visit, request_brochure,
full_gallery_allowed, premium_partner, authorized_source par fallback.

### Avito → `audit_source`

```
source_display_type:      "audit_source"
source_badge:             "market_signal"
display_depth:            "market_signal_only"
thumbnail_policy:         "no_listing_image"
original_source_required: true
allowed_ctas:             ["view_market_signal", "view_source"]
display_images.policy:    "no_listing_image"
display_images.urls:      []
```

**Interdit pour Avito :** fiche annonce, photo annonce, contact, whatsapp, gallery,
view_full_listing. Avito reste signal marché / audit-only.

### Source inconnue / null → `{}`

Aucun badge, aucun CTA, aucun droit d'affichage par défaut.
`SourceBadge` retourne `null` → rien n'est affiché.

## Image policy

`image_urls` (interne DB) n'est jamais muté.
`display_images` est un champ séparé qui décide ce qui est affiché :

| `display_images.policy` | Comportement |
|---|---|
| `"full_gallery_allowed"` | Galerie complète (partenaire uniquement) |
| `"single_thumbnail_allowed"` | Maximum 1 image (Mubawab) |
| `"no_listing_image"` | Aucune image listing — `ListingVisual` SVG |

Le guard dans `SearchListingCardDark` et `PhotoFirstListingCard` force
`fallback_visual` quand `display_images.policy === "no_listing_image"`,
même si `getListingImageMode()` retourne autre chose.

## Contact / WhatsApp

Contact, WhatsApp, et demande de visite ne sont **jamais** exposés sauf
pour `partner_source` explicite (aucun partenaire actif en DB actuellement).
Aucun fallback ne peut créer ces CTAs.

## Invariants couverts par tests

Fichier : `scripts/scrapers/__tests__/source-display-policy.test.ts`
31 tests, 4 suites.

- Mubawab → public_index_source / public_indexed / limited_preview
- Mubawab → single_thumbnail_allowed / display_images.urls.length <= 1
- Mubawab → original_source_required true
- Mubawab → allowed_ctas sans contact/whatsapp
- Avito → audit_source / market_signal_only / no_listing_image
- Avito → display_images.urls = []
- Avito → allowed_ctas sans contact/whatsapp/view_full_listing
- Source inconnue/null → {}
- Score élevé ne change pas display_depth
- premium_partner jamais assigné par fallback
- authorized_source jamais assigné par fallback
- display_policy_reason présent pour sources connues

## Ce qui reste à faire

- SOURCE-POLICY-FOUNDATION-1 Data Engine : **COMPLÉTÉE côté Engine (repo séparé)**
- SITE-SOURCE-BADGES-HARDENING-1 : COMPLÉTÉE 2026-06-30 (commit acffa1a, 534 tests PASS)
- Mapper nouvelles sources (Yakeey, Sarouty) dès qu'elles entrent en DB
  → Ajouter `if (src === "yakeey") { ... }` dans `deriveSourceDisplayPolicy()`
- Peupler `display_images.urls` quand la DB expose des tableaux d'URLs
  → `display_images.urls: []` correct tant que DB n'expose que `images_count`
- Tests UI d'intégration badges (extension Chrome requise)

## Prochaine étape recommandée

1. PROD-DEPLOY — `vercel --prod` après validation Achraf
2. MVP-RC-1 final — validation release candidate complète
