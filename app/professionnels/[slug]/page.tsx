import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, Globe, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import {
  getDemoProfessionalProfileView,
  getPublicProfessionalProfileViewBySlug,
} from "@/lib/professional/public-profile";
import { normalizeProfessionalSlug } from "@/lib/professional/validation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

function profileTypeLabel(type: "agency" | "promoter") {
  return type === "promoter" ? "Promoteur" : "Agence immobilière";
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const { preview } = await searchParams;
  const slug = normalizeProfessionalSlug(rawSlug);
  if (!slug) return { title: "Professionnel introuvable — AkarFinder", robots: { index: false, follow: false } };

  if (preview === "demo") {
    const profile = getDemoProfessionalProfileView(slug);
    if (!profile) return { title: "Professionnel introuvable — AkarFinder", robots: { index: false, follow: false } };
    return {
      title: `${profile.display_name} — Exemple de profil partenaire AkarFinder`,
      description: "Exemple fictif et non publié de page agence partenaire AkarFinder.",
      robots: { index: false, follow: false },
    };
  }

  try {
    const profile = await getPublicProfessionalProfileViewBySlug(slug);
    if (!profile) return { title: "Professionnel introuvable — AkarFinder", robots: { index: false, follow: false } };

    const typeLabel = profileTypeLabel(profile.organization_type);
    const description = profile.description?.trim()
      ? profile.description.slice(0, 155)
      : `${typeLabel} validé sur AkarFinder${profile.city ? ` à ${profile.city}` : ""}.`;

    return {
      title: `${profile.display_name} — ${typeLabel} | AkarFinder`,
      description,
      alternates: { canonical: `/professionnels/${profile.slug}` },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "Professionnel — AkarFinder", robots: { index: false, follow: false } };
  }
}

export default async function ProfessionalProfilePage({ params, searchParams }: PageProps) {
  const { slug: rawSlug } = await params;
  const { preview } = await searchParams;
  const slug = normalizeProfessionalSlug(rawSlug);
  if (!slug) notFound();

  const isDemo = preview === "demo";

  try {
    const profile = isDemo
      ? getDemoProfessionalProfileView(slug)
      : await getPublicProfessionalProfileViewBySlug(slug);
    if (!profile) notFound();

    const typeLabel = profileTypeLabel(profile.organization_type);
    const hasPublicContact = Boolean(profile.website_url || profile.public_email || profile.public_phone);

    return (
      <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
        {isDemo ? (
          <div className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-400 bg-amber-400 px-4 py-2.5 text-center text-[12px] font-extrabold text-amber-950">
            <span aria-hidden="true">⚠</span>
            <span>Exemple de démonstration — non publié. Aucune agence réelle n’est représentée.</span>
          </div>
        ) : null}

        <SiteHeader />

        <section className="bg-deepblue px-4 py-10 text-white sm:py-14">
          <Container>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                {profile.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.logo_url}
                    alt={`Logo ${profile.display_name}`}
                    className="h-16 w-16 shrink-0 rounded-2xl border border-white/15 bg-white object-contain p-2 shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
                  />
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10 text-bronze-300 ring-1 ring-white/15">
                    <Building2 size={28} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-400">
                    {typeLabel} · {isDemo ? "exemple partenaire" : "profil public validé"}
                  </p>
                  <h1 className="mt-2 break-words text-[2rem] font-extrabold tracking-[-0.045em] sm:text-[2.8rem]">
                    {profile.display_name}
                  </h1>
                  {profile.city ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white/70">
                      <MapPin size={14} aria-hidden="true" />
                      {profile.city}
                    </p>
                  ) : null}
                </div>
              </div>

              {profile.commercial_badge_label ? (
                <span className="self-start rounded-full border border-bronze-400/35 bg-bronze-700/20 px-4 py-2 text-xs font-extrabold text-bronze-300 sm:self-center">
                  {profile.commercial_badge_label}
                </span>
              ) : null}
            </div>
          </Container>
        </section>

        <Container className="space-y-6 py-8 sm:py-10 lg:py-14">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-[1.6rem] border border-[#dbe7f6] bg-white p-6 shadow-[0_12px_34px_rgba(15,35,65,0.06)] sm:p-8">
              <h2 className="text-xl font-extrabold text-deepblue">À propos</h2>
              <p className="mt-3 max-w-3xl leading-7 text-gray-600">
                {profile.description ?? "Informations de présentation non renseignées."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {profile.website_url ? (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-deepblue px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#0d2a4d]"
                  >
                    <Globe size={15} aria-hidden="true" />
                    Site officiel
                  </a>
                ) : null}
                {profile.public_email ? (
                  <a
                    href={`mailto:${profile.public_email}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#dbe7f6] bg-white px-4 py-3 text-sm font-extrabold text-deepblue transition hover:bg-[#f5f9ff]"
                  >
                    <Mail size={15} aria-hidden="true" />
                    Envoyer un e-mail
                  </a>
                ) : null}
                {profile.public_phone ? (
                  <a
                    href={`tel:${profile.public_phone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#dbe7f6] bg-white px-4 py-3 text-sm font-extrabold text-deepblue transition hover:bg-[#f5f9ff]"
                  >
                    <Phone size={15} aria-hidden="true" />
                    Appeler
                  </a>
                ) : null}
              </div>

              {!hasPublicContact ? (
                <p className="mt-5 rounded-xl bg-[#f8fafc] px-4 py-3 text-[12px] leading-5 text-gray-500">
                  {isDemo
                    ? "Aucune coordonnée réelle dans cette démonstration."
                    : "Coordonnées publiques non renseignées. AkarFinder n’affiche pas de contact déduit ou issu d’une source non autorisée."}
                </p>
              ) : null}
            </article>

            <aside className="rounded-[1.6rem] border border-[#eadfca] bg-[#fffdf8] p-6 shadow-[0_8px_24px_rgba(15,35,65,0.05)]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-500">
                {isDemo ? "Portefeuille illustratif" : "Portefeuille public vérifié"}
              </p>
              <dl className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-[#eadfca] pb-4">
                  <dt className="text-sm text-gray-600">Biens avec ownership confirmé</dt>
                  <dd className="text-xl font-extrabold text-deepblue">{profile.portfolio.verified_listings}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-gray-600">Projets publics</dt>
                  <dd className="text-xl font-extrabold text-deepblue">{profile.portfolio.published_projects}</dd>
                </div>
              </dl>
            </aside>
          </section>

          <section className="rounded-[1.4rem] border border-[#dbe7f6] bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf5ff] text-[#0B63CE]">
                <ShieldCheck size={19} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-extrabold text-deepblue">Ce que signifie ce profil</h2>
                <p className="mt-1 text-[12.5px] leading-6 text-gray-600">
                  {isDemo
                    ? "Cette surface est une démonstration fictive et non indexée. Elle sert uniquement à vérifier la présentation cible d’une agence partenaire, sans créer de statut réel, de contact ni d’annonce publique."
                    : "L’organisation est validée et a choisi de rendre ce profil public. Les compteurs ci-dessus portent uniquement sur des ownerships vérifiés et des projets publiés. Le badge commercial décrit la relation avec AkarFinder : il ne certifie pas une annonce et ne modifie pas la pertinence organique des résultats."}
                </p>
              </div>
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
