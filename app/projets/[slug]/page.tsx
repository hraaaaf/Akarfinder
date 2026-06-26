import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { ProjectPageShell } from "@/components/promoters/ProjectPageShell";
import {
  getActiveProject,
  getProjectPromoter,
  getAllActiveProjectSlugs,
  getDemoProject,
} from "@/lib/promoters/get-project";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateStaticParams() {
  return getAllActiveProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;

  if (preview === "demo") {
    const project = getDemoProject(slug);
    if (!project) return { title: "Programme introuvable — AkarFinder" };
    return {
      title: `${project.name} — Exemple de programme neuf AkarFinder`,
      robots: { index: false, follow: false },
    };
  }

  const project = getActiveProject(slug);
  if (!project) return { title: "Programme introuvable — AkarFinder" };
  return {
    title: `${project.name} — Programme neuf à ${project.city} — AkarFinder`,
    description: `${project.partner_badge} — Prix à partir de ${project.price_from.toLocaleString("fr-FR")} DH. ${project.city}${project.neighborhood ? `, ${project.neighborhood}` : ""}. Informations à confirmer auprès du promoteur.`,
    robots: { index: true, follow: true },
  };
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;

  if (preview === "demo") {
    const project = getDemoProject(slug);
    if (!project) notFound();
    const promoter = getProjectPromoter(project.promoter_id);
    if (!promoter) notFound();
    return <ProjectPageShell project={project} promoter={promoter} isDemo />;
  }

  const project = getActiveProject(slug);
  if (!project) notFound();
  const promoter = getProjectPromoter(project.promoter_id);
  if (!promoter) notFound();
  return <ProjectPageShell project={project} promoter={promoter} />;
}
