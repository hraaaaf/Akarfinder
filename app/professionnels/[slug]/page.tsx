import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfessionalProfileShell } from "@/components/professional/ProfessionalProfileShell";
import { getPublicProfessionalProfileBySlug } from "@/lib/professional/repository";
import type { PublicProfessionalProfile } from "@/lib/professional/types";
import { normalizeProfessionalSlug } from "@/lib/professional/validation";

export const dynamic = "force-dynamic";

type Profile = PublicProfessionalProfile & {
  portfolio: { verified_listings: number; published_projects: number };
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

const DEMO_AGENCY_PROFILE: Profile = {
  id: "demo-agency-canonical",
  slug: "agence-demo-akarfinder",
  organization_type: "agency",
  display_name: "Rabat Select Immobilier",
  description: "Spécialiste Rabat & Harhoura — villas et appartements familiaux, achat et location longue durée.",
  logo_url: null,
  website_url: null,
  city: "Rabat",
  commercial_tier: "partner",
  commercial_badge_label: "Partenaire démo",
  portfolio: {
    verified_listings: 24,
    published_projects: 0,
  },
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const { preview } = await searchParams;
  const slug = normalizeProfessionalSlug(rawSlug);

  if (preview === "demo" && slug === DEMO_AGENCY_PROFILE.slug) {
    return {
      title: `${DEMO_AGENCY_PROFILE.display_name} — Exemple de profil professionnel AkarFinder`,
      robots: { index: false, follow: false },
    };
  }

  return {
    title: "Profil professionnel — AkarFinder",
    alternates: slug ? { canonical: `/professionnels/${slug}` } : undefined,
  };
}

export default async function ProfessionalProfilePage({ params, searchParams }: PageProps) {
  const { slug: rawSlug } = await params;
  const { preview } = await searchParams;
  const slug = normalizeProfessionalSlug(rawSlug);
  if (!slug) notFound();

  if (preview === "demo") {
    if (slug !== DEMO_AGENCY_PROFILE.slug) notFound();
    return <ProfessionalProfileShell profile={DEMO_AGENCY_PROFILE} isDemo />;
  }

  try {
    const profile = await getPublicProfessionalProfileBySlug(slug);
    if (!profile) notFound();
    return <ProfessionalProfileShell profile={profile} />;
  } catch (error) {
    console.error("[professionnels/:slug] profile unavailable", error);
    notFound();
  }
}
