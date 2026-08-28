import { notFound } from "next/navigation";
import { ProfessionalProfileShell } from "@/components/professional/ProfessionalProfileShell";
import { getPublicProfessionalProfileBySlug } from "@/lib/professional/repository";
import { normalizeProfessionalSlug } from "@/lib/professional/validation";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export default async function ProfessionalProfilePage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = normalizeProfessionalSlug(rawSlug);
  if (!slug) notFound();

  try {
    const profile = await getPublicProfessionalProfileBySlug(slug);
    if (!profile) notFound();
    return <ProfessionalProfileShell profile={profile} />;
  } catch (error) {
    console.error("[professionnels/:slug] profile unavailable", error);
    notFound();
  }
}
