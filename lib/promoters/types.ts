export type PartnerStatus = "none" | "partner" | "featured";
export type VisibilityStatus = "draft" | "demo" | "active";
export type ProjectStatus = "upcoming" | "active" | "delivered" | "paused";
export type LeadCtaType = "whatsapp" | "callback" | "form";
export type SourceAccessLevel = "public" | "partner_full";
export type ImagePermissionStatus = "no_permission" | "partner_full" | "fallback_visual";

export type Promoter = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string;
  city: string;
  description: string;
  contact_whatsapp?: string;
  contact_email?: string;
  website_url?: string;
  partner_status: PartnerStatus;
  visibility_status: VisibilityStatus;
  source_note: string;
  created_at: string;
  updated_at: string;
};

export type ProjectSurfaces = {
  min?: number;
  max?: number;
  unit: "m²";
};

export type NewProject = {
  id: string;
  slug: string;
  promoter_id: string;
  name: string;
  city: string;
  neighborhood?: string;
  address_label?: string;
  price_from: number;
  currency: "MAD";
  property_types: string[];
  typologies: string[];
  surfaces: ProjectSurfaces;
  delivery_date_label?: string;
  brochure_url?: string;
  main_image_url?: string;
  gallery_urls?: string[];
  latitude?: number;
  longitude?: number;
  project_status: ProjectStatus;
  visibility_status: VisibilityStatus;
  partner_badge: "Projet partenaire" | "Données fournies par le promoteur";
  lead_cta_type: LeadCtaType;
  source_access_level: SourceAccessLevel;
  image_permission_status: ImagePermissionStatus;
  disclaimer: string;
};
