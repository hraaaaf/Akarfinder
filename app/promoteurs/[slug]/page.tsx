import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { PromoterPageShell } from "@/components/promoters/PromoterPageShell";
import { getDemoPromoter, getDemoPromoterProjects } from "@/lib/promoters/get-promoter";
import { normalizeProfessionalSlug } from "@/lib/professional/validation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const { preview } = await searchParams;
  const slug = normalizeProfessionalSlug(rawSlug);

  if (preview === "demo") {
    const promoter = slug ? getDemoPromoter(slug) : null;
    if (!promoter) return { title: "Promoteur introuvable — AkarFinder", robots: { index: false, follow: false } };
    return {
      title: `${promoter.name} — Exemple de page promoteur AkarFinder`,
      robots: { index: false, follow: false },
    };
  }

  return {
    title: "Profil professionnel — AkarFinder",
    robots: { index: false, follow: false },
    alternates: slug ? { canonical: `/professionnels/${slug}` } : undefined,
  };
}

export default async function PromoterPage({ params, searchParams }: Props) {
  const { slug: rawSlug } = await params;
  const { preview } = await searchParams;
  const slug = normalizeProfessionalSlug(rawSlug);
  if (!slug) notFound();

  if (preview === "demo") {
    const promoter = getDemoPromoter(slug);
    if (!promoter) notFound();
    const projects = getDemoPromoterProjects(promoter.id);
    return <PromoterPageShell promoter={promoter} projects={projects} isDemo />;
  }

  redirect(`/professionnels/${slug}`);
}
