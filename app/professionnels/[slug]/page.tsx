import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
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

    const typeLabel = profile.organization_type === "promoter" ? "Promoteur" : "Agence immobilière";
    return (
      <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
        <SiteHeader />
        <Container className="py-10 lg:py-14">
          <section className="overflow-hidden rounded-[1.7rem] border border-[#eadfca] bg-white shadow-[0_14px_42px_rgba(7,27,51,0.08)]">
            <div className="bg-deepblue px-6 py-8 text-white sm:px-9">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-400">{typeLabel}</p>
                  <h1 className="mt-2 text-[2rem] font-extrabold tracking-[-0.045em] sm:text-[2.7rem]">{profile.display_name}</h1>
                  {profile.city ? <p className="mt-2 text-sm font-semibold text-white/70">{profile.city}</p> : null}
                </div>
                {profile.commercial_badge_label ? (
                  <span className="rounded-full border border-bronze-400/35 bg-bronze-700/20 px-4 py-2 text-xs font-extrabold text-bronze-300">
                    {profile.commercial_badge_label}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-6 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <h2 className="text-lg font-extrabold text-deepblue">À propos</h2>
                <p className="mt-3 leading-7 text-gray-600">{profile.description ?? "Informations de présentation non renseignées."}</p>
                {profile.website_url ? (
                  <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex text-sm font-extrabold text-deepblue underline underline-offset-4">
                    Site du professionnel →
                  </a>
                ) : null}
              </div>

              <aside className="rounded-2xl border border-[#efe3cd] bg-[#fffdf8] p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Portefeuille public</p>
                <dl className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-gray-600">Biens avec ownership confirmé</dt>
                    <dd className="font-extrabold text-deepblue">{profile.portfolio.verified_listings}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-gray-600">Projets publics</dt>
                    <dd className="font-extrabold text-deepblue">{profile.portfolio.published_projects}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-[11px] leading-5 text-gray-500">
                  Le badge commercial décrit la relation avec AkarFinder. Il ne modifie pas la pertinence des résultats de recherche et ne constitue pas une certification des annonces.
                </p>
              </aside>
            </div>
          </section>
        </Container>
        <SiteFooter />
      </main>
    );
  } catch (error) {
    console.error("[professionnels/:slug] profile unavailable", error);
    notFound();
  }
}
