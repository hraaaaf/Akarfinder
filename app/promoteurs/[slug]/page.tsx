import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { PromoterPageShell } from "@/components/promoters/PromoterPageShell";
import {
  getActivePromoter,
  getActivePromoterProjects,
  getAllActivePromoterSlugs,
  getDemoPromoter,
  getDemoPromoterProjects,
} from "@/lib/promoters/get-promoter";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateStaticParams() {
  return getAllActivePromoterSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;

  if (preview === "demo") {
    const promoter = getDemoPromoter(slug);
    if (!promoter) return { title: "Promoteur introuvable — AkarFinder" };
    return {
      title: `${promoter.name} — Exemple de page promoteur AkarFinder`,
      robots: { index: false, follow: false },
    };
  }

  const promoter = getActivePromoter(slug);
  if (!promoter) return { title: "Promoteur introuvable — AkarFinder" };
  return {
    title: `${promoter.name} — Promoteur partenaire AkarFinder`,
    description: `${promoter.description.slice(0, 155)}`,
    robots: { index: true, follow: true },
  };
}

export default async function PromoterPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;

  if (preview === "demo") {
    const promoter = getDemoPromoter(slug);
    if (!promoter) notFound();
    const projects = getDemoPromoterProjects(promoter.id);
    return <PromoterPageShell promoter={promoter} projects={projects} isDemo />;
  }

  const promoter = getActivePromoter(slug);
  if (!promoter) notFound();
  const projects = getActivePromoterProjects(promoter.id);
  return <PromoterPageShell promoter={promoter} projects={projects} />;
}
