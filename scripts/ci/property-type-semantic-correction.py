from pathlib import Path


def replace_exact(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"expected block missing in {path}")
    p.write_text(text.replace(old, new, 1))


replace_exact(
    "scripts/scrapers/types.ts",
    'export type PropertyTypeP0 = "apartment" | "villa" | "land" | "office" | "unknown";',
    'export type PropertyTypeP0 = "apartment" | "villa" | "land" | "office" | "riad" | "unknown";',
)

replace_exact(
    "scripts/scrapers/normalizers/normalize-type.ts",
    '  if (/appartement|appart\\b|apartment|flat|studio|duplex/.test(s)) return "apartment";\n'
    '  if (/villa|riad|maison|house|townhouse/.test(s)) return "villa";\n'
    '  if (/terrain|land|lot\\b|parcelle|ferme|farm/.test(s)) return "land";\n'
    '  if (/bureau|local|office|plateau|commerce|magasin|shop|depot/.test(s)) return "office";\n\n'
    '  return "unknown";',
    '  const candidates: Array<{ type: PropertyTypeP0; index: number }> = [];\n'
    '  const patterns: Array<[PropertyTypeP0, RegExp]> = [\n'
    '    ["apartment", /appartement|appart\\b|apartment|flat|studio|duplex/],\n'
    '    ["land", /terrain|land|lot\\b|parcelle|ferme|farm/],\n'
    '    ["riad", /riad/],\n'
    '    ["villa", /villa|maison|house|townhouse/],\n'
    '    ["office", /bureau|local|office|plateau|commerce|magasin|shop|depot/],\n'
    '  ];\n\n'
    '  for (const [type, pattern] of patterns) {\n'
    '    const match = pattern.exec(s);\n'
    '    if (match?.index != null) candidates.push({ type, index: match.index });\n'
    '  }\n\n'
    '  candidates.sort((a, b) => a.index - b.index);\n'
    '  return candidates[0]?.type ?? "unknown";',
)

replace_exact(
    "lib/listings/map-db-listing.ts",
    '    case "land":\n      return "Terrain";\n    case "office":',
    '    case "land":\n      return "Terrain";\n    case "riad":\n      return "Riad";\n    case "office":',
)

replace_exact(
    "lib/listings/db-listings.ts",
    '    case "terrain":\n    case "land":\n      return "land";\n    case "bureau":',
    '    case "terrain":\n    case "land":\n      return "land";\n    case "riad":\n      return "riad";\n    case "bureau":',
)

replace_exact(
    "lib/db/supabase-listings.ts",
    '  if (n === "terrain" || n === "land") return "land";\n  if (n === "bureau" || n === "office") return "office";',
    '  if (n === "terrain" || n === "land") return "land";\n  if (n === "riad") return "riad";\n  if (n === "bureau" || n === "office") return "office";',
)

replace_exact(
    "lib/search/database-search.ts",
    '  if (n === "land" || n === "terrain") return "Terrain";\n  if (n === "office" || n === "bureau") return "Bureau";',
    '  if (n === "land" || n === "terrain") return "Terrain";\n  if (n === "riad") return "Riad";\n  if (n === "office" || n === "bureau") return "Bureau";',
)

Path("scripts/scrapers/__tests__/property-type-semantic-correction.test.ts").write_text('''import { describe, it } from "node:test";\nimport assert from "node:assert/strict";\n\nimport { normalizeType } from "../normalizers/normalize-type.js";\nimport { mapDbRowToListing } from "../../../lib/listings/map-db-listing.js";\nimport type { DbListingRow } from "../../../lib/listings/db-listings.js";\n\nfunction row(propertyType: string, title: string): DbListingRow {\n  return {\n    id: 1, canonical_fingerprint: "cert-property-type", title, price_mad: 1000000,\n    city: "Marrakech", district: null, property_type: propertyType, transaction_type: "sale",\n    surface_m2: 300, rooms_count: null, bedrooms_count: null, bathrooms_count: null,\n    description_snippet: null, images_count: null, thumbnail_url: null, seller_name: null,\n    data_completeness_score: 80, field_confidence: null, created_at: "2026-09-01T00:00:00Z",\n    updated_at: "2026-09-01T00:00:00Z", duplicate_group_id: "cert-property-type",\n    duplicate_score: 0, reliability_score: 80, reliability_badge: "Bonne", reliability_reasons: "[]",\n    built_surface_m2: null, plot_surface_m2: null, condition: null, property_age_range: null,\n    orientation: null, floor_type: null, floors_count: null, garden_m2: null, terrace_m2: null,\n    garage_spaces: null, has_pool: 0, has_concierge: 0, has_moroccan_living_room: 0,\n    has_european_living_room: 0, has_equipped_kitchen: 0, premium_features: null,\n    source_name: "mubawab", listing_url: "https://example.test/listing", source_url: "https://example.test",\n  };\n}\n\ndescribe("property type semantic precedence", () => {\n  it("classifies the LIVE Terrain pour villa case as land", () => {\n    assert.equal(normalizeType("Terrain pour villa à sonaba agadir"), "land");\n  });\n  it("keeps a real villa when villa is the primary title concept", () => {\n    assert.equal(normalizeType("Villa à rénover en vente à Hay Riad – 741 m² terrain"), "villa");\n  });\n  it("classifies terrain before contextual villa mentions", () => {\n    assert.equal(normalizeType("Terrain titré 12H zone permettant 4 villas maximum par hectare"), "land");\n  });\n  it("preserves Riad as its own property type", () => {\n    assert.equal(normalizeType("Riad A vendre Guéliz 8 chambres et piscine"), "riad");\n    assert.equal(normalizeType("Type de bien riad"), "riad");\n    assert.equal(mapDbRowToListing(row("riad", "Riad à vendre")).property_type, "Riad");\n  });\n});\n''')
