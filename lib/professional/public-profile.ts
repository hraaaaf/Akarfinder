import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { commercialTierBadgeLabel } from "./permissions";
import type { ProfessionalCommercialTier, ProfessionalOrganizationType } from "./types";

export type PublicProfessionalProfileView = {
  id: string;
  slug: string;
  organization_type: ProfessionalOrganizationType;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  city: string | null;
  public_email: string | null;
  public_phone: string | null;
  commercial_tier: ProfessionalCommercialTier;
  commercial_badge_label: string | null;
  portfolio: {
    verified_listings: number;
    published_projects: number;
  };
};

/**
 * Public profile projection only.
 *
 * Truth boundary:
 * - validated + public organizations only;
 * - only explicitly public contact fields are exposed;
 * - portfolio counters use verified ownership / published public projects;
 * - no scraped contact, inferred entitlement or unverified listing is returned.
 */
export const getPublicProfessionalProfileViewBySlug = cache(
  async (slug: string): Promise<PublicProfessionalProfileView | null> => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("professional_organizations")
      .select(
        "id, slug, organization_type, display_name, description, logo_url, website_url, city, public_email, public_phone, commercial_tier",
      )
      .eq("slug", slug)
      .eq("validation_status", "validated")
      .eq("public_visibility", "public")
      .maybeSingle();

    if (error) throw new Error(`[professional] public profile: ${error.message}`);
    if (!data) return null;

    const [{ count: verifiedListings, error: ownershipError }, { count: publishedProjects, error: projectsError }] =
      await Promise.all([
        supabase
          .from("professional_listing_ownership")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", data.id)
          .eq("status", "verified"),
        supabase
          .from("professional_projects")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", data.id)
          .eq("status", "published")
          .eq("public_visibility", "public"),
      ]);

    if (ownershipError) throw new Error(`[professional] public ownership stats: ${ownershipError.message}`);
    if (projectsError) throw new Error(`[professional] public project stats: ${projectsError.message}`);

    const commercialTier = data.commercial_tier as ProfessionalCommercialTier;

    return {
      id: data.id as string,
      slug: data.slug as string,
      organization_type: data.organization_type as ProfessionalOrganizationType,
      display_name: data.display_name as string,
      description: (data.description as string | null) ?? null,
      logo_url: (data.logo_url as string | null) ?? null,
      website_url: (data.website_url as string | null) ?? null,
      city: (data.city as string | null) ?? null,
      public_email: (data.public_email as string | null) ?? null,
      public_phone: (data.public_phone as string | null) ?? null,
      commercial_tier: commercialTier,
      commercial_badge_label: commercialTierBadgeLabel(commercialTier),
      portfolio: {
        verified_listings: verifiedListings ?? 0,
        published_projects: publishedProjects ?? 0,
      },
    };
  },
);
