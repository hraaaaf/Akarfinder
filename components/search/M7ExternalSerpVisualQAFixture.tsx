import { ExternalIndexedResultsSection } from "@/components/search/ExternalIndexedResultsSection";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

function fixtureResult(
  id: string,
  domain: string,
  city: string,
  propertyType: string,
  intent: string,
): SearchGatewayNormalizedResult {
  return {
    id,
    title: "",
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
    quality_tier: "Q0_link_only",
    display_eligibility: "eligible_secondary",
    display_eligibility_reason: "external_minimal_index",
  };
}

const RESULTS = [
  fixtureResult("00000000-0000-4000-8000-000000000001", "source-immo-a.ma", "Casablanca", "Appartement", "buy"),
  fixtureResult("00000000-0000-4000-8000-000000000002", "source-immo-b.ma", "Casablanca", "Villa", "buy"),
  fixtureResult("00000000-0000-4000-8000-000000000003", "source-immo-c.ma", "Casablanca", "Appartement", "rent"),
  fixtureResult("00000000-0000-4000-8000-000000000004", "source-immo-d.ma", "Casablanca", "Studio", "buy"),
  fixtureResult("00000000-0000-4000-8000-000000000005", "source-immo-e.ma", "Casablanca", "Bureau", "rent"),
  fixtureResult("00000000-0000-4000-8000-000000000006", "source-immo-f.ma", "Casablanca", "Terrain", "buy"),
  fixtureResult("00000000-0000-4000-8000-000000000007", "source-immo-g.ma", "Casablanca", "Maison", "buy"),
  fixtureResult("00000000-0000-4000-8000-000000000008", "source-immo-h.ma", "Casablanca", "Appartement", "new"),
];

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
                387 résultats à Casablanca
              </h1>
              <p className="mt-1 text-[11px] text-muted-foreground sm:text-[12px]">
                100 affichés · résultats indexés externes
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

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            className="rounded-full border border-bronze-500/35 bg-bronze-500/10 px-5 py-2.5 text-[12px] font-extrabold text-bronze-700 dark:text-bronze-300"
          >
            Afficher 100 résultats suivants
          </button>
        </div>
      </div>
    </main>
  );
}
