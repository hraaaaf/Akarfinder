import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { PromoterPageShell } from "@/components/promoters/PromoterPageShell";
import {
  getDemoPromoter,
  getDemoPromoterProjects,
} from "@/lib/promoters/get-promoter";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export function generateStaticParams() {
  return [];
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

  return {
    title: "Profil promoteur — AkarFinder",
    alternates: { canonical: `/professionnels/${slug}` },
    robots: { index: false, follow: true },
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

  permanentRedirect(`/professionnels/${encodeURIComponent(slug)}`);
}
