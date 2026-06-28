// OVERNIGHT-MVP-HARDENING-1 — Phase 2 : types + allowlist tracking conversion.

export const CONVERSION_EVENTS = [
  "hero_search_submit",
  "buyer_cta_click",
  "renter_cta_click",
  "seller_cta_click",
  "promoter_cta_click",
  "credit_simulator_open",
  "credit_lead_submit",
  "alert_submit",
  "lead_submit_success",
  // SEARCH-RELOOKING-1 — évènements page /search
  "search_filter_change",
  "search_result_click",
  "search_credit_click",
  "search_alert_click",
  "search_map_pin_click",
  "search_save_click",
] as const;

export type ConversionEventName = (typeof CONVERSION_EVENTS)[number];

export function isConversionEvent(value: unknown): value is ConversionEventName {
  return typeof value === "string" && (CONVERSION_EVENTS as readonly string[]).includes(value);
}

export type ConversionEventInput = {
  event_name: ConversionEventName;
  source_page?: string | null;
  source_channel?: string | null;
  intent?: string | null;
  listing_id?: string | null;
  lead_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ConversionEventRow = ConversionEventInput & {
  id: string;
  created_at: string;
  user_agent: string | null;
};
