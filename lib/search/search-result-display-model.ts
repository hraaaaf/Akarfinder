// SEARCH-RESULT-DISPLAY-MODEL-1
// Computes SERP display policy for search results based on source and content characteristics.

export type SearchResultDisplayPolicy = {
  search_result_display_mode: "full" | "limited" | "blocked";
  result_origin: string;
  can_show_result: boolean;
  can_show_thumbnail: boolean;
  can_show_snippet: boolean;
  can_show_contact: boolean;
  can_show_gallery: boolean;
  primary_cta?: string;
  production_allowed: boolean;
  production_block_reason?: string;
};

export type SearchResultDisplayInput = {
  source_id: string | null;
  source_name: string | null;
  source_display_type: string | null;
  source_badge: string | null;
  display_depth: string | null;
  result_origin: string;
  original_url: string | null;
  is_partner: boolean;
  has_title: boolean;
  has_snippet: boolean;
  has_thumbnail: boolean;
};

export function computeSearchResultDisplayPolicy(
  input: SearchResultDisplayInput
): SearchResultDisplayPolicy {
  const sourceId = input.source_id?.toLowerCase().trim() ?? null;

  if (input.source_badge === "external_web_result") {
    return {
      search_result_display_mode: "limited",
      result_origin: input.result_origin,
      can_show_result: true,
      can_show_thumbnail: input.has_thumbnail,
      can_show_snippet: input.has_snippet,
      can_show_contact: false,
      can_show_gallery: false,
      primary_cta: "view_original",
      production_allowed: true,
    };
  }

  // Market signal sources (Avito) - limited display
  if (sourceId === "avito") {
    return {
      search_result_display_mode: "limited",
      result_origin: input.result_origin,
      can_show_result: true,
      can_show_thumbnail: false, // No images for market signals
      can_show_snippet: false,
      can_show_contact: false,
      can_show_gallery: false,
      primary_cta: "view_source",
      production_allowed: false,
      production_block_reason: "Avito market signal - limited preview only",
    };
  }

  // Public indexed sources (Mubawab, Agenz, LogicImmo) - limited preview allowed in production
  if (["mubawab", "agenz", "logicimmo", "logic-immo"].includes(sourceId ?? "")) {
    return {
      search_result_display_mode: "limited",
      result_origin: input.result_origin,
      can_show_result: true,
      can_show_thumbnail: input.has_thumbnail,
      can_show_snippet: input.has_snippet,
      can_show_contact: false,
      can_show_gallery: false,
      primary_cta: "view_original",
      production_allowed: true,
    };
  }

  // Default: full display allowed
  return {
    search_result_display_mode: "full",
    result_origin: input.result_origin,
    can_show_result: true,
    can_show_thumbnail: input.has_thumbnail,
    can_show_snippet: input.has_snippet,
    can_show_contact: true,
    can_show_gallery: true,
    primary_cta: "view_listing",
    production_allowed: true,
  };
}
