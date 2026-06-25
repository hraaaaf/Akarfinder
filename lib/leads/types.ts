// P11D/P11D-C — types shared between client and server lead flows.
import type {
  ImagePermissionStatus,
  SourceAccessLevel,
} from "@/lib/listings/types";

export type LeadApiPayload = {
  profile: {
    project?: string;
    city?: string;
    neighborhood?: string;
    acceptedZones?: string;
    budgetTotal?: number;
    apport?: number;
    needsCredit?: boolean;
    monthlyCible?: number;
    currency?: string;
    propertyType?: string;
    surface?: number;
    bedrooms?: number;
    condition?: string;
    timing?: string;
    name?: string;
    phone?: string;
    country?: string;
    message?: string;
    consentContact?: boolean;
    consentIndicatif?: boolean;
  };
  source_channel: string;
  source_page?: string;
  listing_id?: string;
};

export type LeadApiResponse =
  | { ok: true; lead_id: string; next: string }
  | { ok: false; error: string };

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "visit_confirmed"
  | "reschedule_requested"
  | "archived";
export type LeadTemperature = "chaud" | "tiède" | "froid";
export type LeadType = "buyer_profile" | "visit_request" | "contact_request";
export type VisitStatus =
  | "pending"
  | "contacted"
  | "confirmed"
  | "reschedule_requested"
  | "cancelled"
  | "archived";

export type VisitDaypart =
  | "Matin"
  | "Midi"
  | "Après-midi"
  | "Soir"
  | "Flexible";

export type VisitRequestApiPayload = {
  listing_id: string;
  full_name: string;
  phone_whatsapp: string;
  preferred_slot_1?: string;
  preferred_slot_2?: string;
  visit_preferred_daypart?: VisitDaypart;
  visit_message?: string;
  consent_contact: boolean;
  source_page?: string;
};

export type VisitRequestApiResponse =
  | { ok: true; lead_id: string; status: "pending" }
  | { ok: false; error: string };

// Shape returned from Supabase for the Pro inbox
export type BuyerLeadRow = {
  id: string;
  created_at: string;
  updated_at: string;
  lead_type?: LeadType | null;
  source_channel: string;
  source_page: string | null;
  listing_id: string | null;
  project_type: string | null;
  city: string | null;
  neighborhood: string | null;
  budget_total: number | null;
  currency: string | null;
  property_type: string | null;
  timing: string | null;
  is_mre: boolean;
  residence_country: string | null;
  full_name: string | null;
  phone_whatsapp: string;
  message: string | null;
  consent_contact: boolean;
  consent_indicative: boolean;
  lead_temperature: LeadTemperature;
  lead_score: number | null;
  status: LeadStatus;
  visit_status?: VisitStatus | null;
  visit_preferred_slot_1?: string | null;
  visit_preferred_slot_2?: string | null;
  visit_preferred_daypart?: VisitDaypart | null;
  visit_message?: string | null;
  listing_title?: string | null;
  listing_city?: string | null;
  listing_neighborhood?: string | null;
  listing_price?: number | null;
  listing_source_url?: string | null;
  listing_source_access_level?: SourceAccessLevel | null;
  listing_image_permission_status?: ImagePermissionStatus | null;
  // P11D-D: CRM fields
  internal_notes?: string | null;
  last_contacted_at?: string | null;
  next_follow_up_at?: string | null;
};
