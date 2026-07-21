import type { CanonicalFact, MediaAssetV1 } from "./core";

export const PROJECT_SCHEMA_VERSION = "1.0" as const;

export type ProjectStatus = "planned" | "launching" | "under_construction" | "delivering" | "delivered" | "paused" | "cancelled" | "unknown";
export type ProjectType = "residential" | "mixed_use" | "commercial" | "tourism" | "industrial" | "land_subdivision" | "other" | "unknown";

export interface CanonicalProjectV1 {
  project_id: string;
  schema_version: typeof PROJECT_SCHEMA_VERSION;
  project_name: CanonicalFact<string>;
  project_type: CanonicalFact<ProjectType>;
  status: CanonicalFact<ProjectStatus>;
  developer: {
    developer_id: string | null;
    developer_name: CanonicalFact<string>;
    brand_name?: CanonicalFact<string>;
    legal_name?: CanonicalFact<string>;
    partner_status: "partner" | "non_partner" | "unknown";
  };
  location: {
    country: CanonicalFact<string>;
    region?: CanonicalFact<string>;
    city: CanonicalFact<string>;
    district?: CanonicalFact<string>;
    neighborhood?: CanonicalFact<string>;
    address_display?: CanonicalFact<string>;
    latitude?: CanonicalFact<number>;
    longitude?: CanonicalFact<number>;
  };
  timeline: {
    launch_date?: CanonicalFact<string>;
    construction_start_date?: CanonicalFact<string>;
    expected_delivery_date?: CanonicalFact<string>;
    actual_delivery_date?: CanonicalFact<string>;
    phase_count?: CanonicalFact<number>;
    current_phase?: CanonicalFact<string>;
  };
  inventory: {
    total_units?: CanonicalFact<number>;
    available_units?: CanonicalFact<number>;
    reserved_units?: CanonicalFact<number>;
    sold_units?: CanonicalFact<number>;
    unit_property_types?: CanonicalFact<string[]>;
    min_surface_m2?: CanonicalFact<number>;
    max_surface_m2?: CanonicalFact<number>;
    min_price_mad?: CanonicalFact<number>;
    max_price_mad?: CanonicalFact<number>;
    price_status?: CanonicalFact<"published" | "range" | "on_request" | "unknown">;
  };
  product: {
    positioning?: CanonicalFact<string>;
    architecture_style?: CanonicalFact<string>;
    finish_level?: CanonicalFact<string>;
    furnished_options?: CanonicalFact<boolean>;
    parking_model?: CanonicalFact<string>;
    common_areas_description?: CanonicalFact<string>;
    amenities?: CanonicalFact<string[]>;
    services?: CanonicalFact<string[]>;
    security_features?: CanonicalFact<string[]>;
    sustainability_features?: CanonicalFact<string[]>;
  };
  legal: {
    land_title_status?: CanonicalFact<string>;
    building_permit_status?: CanonicalFact<string>;
    subdivision_authorization_status?: CanonicalFact<string>;
    occupancy_permit_status?: CanonicalFact<string>;
    documents_available?: CanonicalFact<string[]>;
    verification_status?: CanonicalFact<string>;
  };
  commercial: {
    sales_status?: CanonicalFact<string>;
    financing_options?: CanonicalFact<string[]>;
    reservation_terms?: CanonicalFact<string>;
    payment_schedule_summary?: CanonicalFact<string>;
    syndic_estimate_mad?: CanonicalFact<number>;
    rental_management_available?: CanonicalFact<boolean>;
  };
  media: MediaAssetV1[];
  unit_property_ids: string[];
  created_at: string;
  updated_at: string;
}
