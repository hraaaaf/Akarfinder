import { ExternalIndexedResultsSection } from "@/components/search/ExternalIndexedResultsSection";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

function fixtureResult(
  id: string,
  domain: string,
  city: string,
  propertyType: string,
  intent: string,
  title: string,
  priceMad?: number,
  priceToVerify = false,
): SearchGatewayNormalizedResult {
  return {
    id,
    title,
    original_url: `https://${domain}/annonce/${id}`,
    display_url: domain,
    source_id: domain.replace(/\W+/g, "_"),
    source_name: domain,
    domain,
    result_origin: "public_sitemap",
    search_result_display_mode: "thin_indexed_result",
    source_badge: "external_indexed",
    production_allowed: true,
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: "Voir la source originale",
    result_attribution_label: "Résultat indexé externe",
    thumbnail_risk_accepted: false,
    normalized_city: city,
    normalized_property_type: propertyType,
    normalized_intent: intent,
    normalized_price_mad: priceMad,
    quality_score: priceToVerify ? 25 : 35,
    quality_tier: "Q0_link_only",
    display_eligibility: "eligible_secondary",
    display_eligibility_reason: priceToVerify
      ? "external_minimal_index|price_to_verify"
      : "external_minimal_index",
  };
}

const PRIMARY_GROUP = [
  fixtureResult(
    "00000000-0000-4000-8000-000000000001",
    "mubawab.ma",
    "Casablanca",
    "Appartement",
    "buy",
    "Appartement à vendre Maarif Casablanca 120 m2 1800000 DH",
    1_250_000,
    true,
  ),
  fixtureResult(
    "00000000-0000-4000-8000-000000000002",
    "agenz.ma",
    "Casablanca",
    "Appartement",
    "buy",
    "Appartement vente Maarif Casablanca 118 m2 1820000 DH",
    1_820_000,
  ),
  fixtureResult(
    "00000000-0000-4000-8000-000000000003",
    "sarouty.ma",
    "Casablanca",
    "Appartement",
    "buy",
    "Appartement a vendre Maarif Casablanca 121 m2 1790000 DH",
  ),
  fixtureResult(
    "00000000-0000-4000-8000-000000000004",
    "avito.ma",
    "Casablanca",
    "Appartement",
    "buy",
    "Appartement vente Maarif Casablanca 119 m2 1810000 DH",
  ),
];

const PROPERTY_TYPES = ["Villa", "Studio", "Bureau", "Terrain", "Maison", "Appartement"];
const INTENTS = ["buy", "rent", "new"];
const EXTRA_RESULTS = Array.from({ length: 36 }, (_, index) => {
  const n = index + 5;
  const propertyType = PROPERTY_TYPES[index % PROPERTY_TYPES.length];
  const intent = INTENTS[index % INTENTS.length];
  return fixtureResult(
    `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    `source-${String(n).padStart(2, "0")}.ma`,
    "Casablanca",
    propertyType,
    intent,
    `${propertyType} Casablanca ${intent} reference-${n}`,
  );
});

const RESULTS = [...PRIMARY_GROUP, ...EXTRA_RESULTS];

export function M7ExternalSerpVisualQAFixture() {
  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7">
      <div className="mx-auto max-w-[900px]">
        <div className="rounded-2xl border border-border/15 bg-surface/75 p-3.5 dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-bronze-700 dark:text-bronze-300">
                AkarFinder · recherche
              </p>
              <h1 className="mt-1 text-[20px] font-black tracking-[-0.025em] sm:text-[24px]">
                387 pages indexées à Casablanca
              </h1>
              <p className="mt-1 text-[11px] text-muted-foreground sm:text-[12px]">
                15 résultats affichés au départ · regroupement multi-source prudent
              </p>
            </div>
            <button
              type="button"
              className="h-10 rounded-full border border-border/20 bg-card px-4 text-[11px] font-extrabold dark:border-white/10 dark:bg-white/[0.05]"
            >
              Recommandé
            </button>
          </div>
        </div>

        <div className="mt-4">
          <ExternalIndexedResultsSection results={RESULTS} showHeader={false} />
        </div>
      </div>
    </main>
  );
}
