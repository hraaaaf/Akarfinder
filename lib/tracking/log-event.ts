// OVERNIGHT-MVP-HARDENING-1 — Phase 2 : insertion serveur d'un évènement de conversion.
// BEST-EFFORT : ne jette JAMAIS. Si la table n'existe pas ou Supabase échoue,
// on log en console et on continue — les formulaires ne doivent pas être bloqués.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { isConversionEvent, type ConversionEventInput } from "./types";

export async function logConversionEvent(
  input: ConversionEventInput,
  userAgent?: string | null
): Promise<void> {
  try {
    if (!isConversionEvent(input.event_name)) return;
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("conversion_events").insert({
      event_name: input.event_name,
      source_page: input.source_page ?? null,
      source_channel: input.source_channel ?? null,
      intent: input.intent ?? null,
      listing_id: input.listing_id ?? null,
      lead_id: input.lead_id ?? null,
      metadata: input.metadata ?? null,
      user_agent: userAgent ?? null,
    });
    if (error) {
      console.warn("[tracking] insert skipped:", error.message);
    }
  } catch (err) {
    console.warn("[tracking] unexpected error (ignored):", err instanceof Error ? err.message : err);
  }
}
