import Link from "next/link";
import { ArrowRight, Building2, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import type { PublicProfessionalProfile } from "@/lib/professional/types";

type Profile = PublicProfessionalProfile & {
  portfolio: { verified_listings: number; published_projects: number };
};

export function ProfessionalProfileShell({ profile }: { profile: Profile }) {
  const isPromoter = profile.organization_type === "promoter";
  const typeLabel = isPromoter ? "Promoteur" : "Agence immobilière";
  const primaryCount = isPromoter ? profile.portfolio.published_projects : profile.portfolio.verified_listings;
  const primaryLabel = isPromoter ? "projets publics" : "biens avec ownership confirmé";
  const citySearchHref = profile.city
    ? `/search?city=${encodeURIComponent(profile.city)}&transaction_type=buy`
    : "/search";

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <SiteHeader />

      <section className="bg-deepblue px-4 py-12 text-white sm:py-16">
        <Container>
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-5">
              {profile.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logo_url}
                  alt={`Logo ${profile.display_name}`}
                  className="h-20 w-20 shrink-0 rounded-2xl border border-white/15 bg-white object-contain p-2 shadow-lg"
                />
              ) : (
                <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10">
                  <Building2 size={32} strokeWidth={1.7} aria-hidden="true" />
                </span>
              )}

              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-300">{typeLabel}</p>
                <h1 className="mt-2 text-[2rem] font-extrabold leading-tight tracking-[-0.045em] sm:text-[2.8rem]">
                  {profile.display_name}
                </h1>
                {profile.city ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-white/70">
                    <MapPin size={14} strokeWidth={2} aria-hidden="true" />
                    {profile.city}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="#portefeuille"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[13px] font-extrabold text-deepblue transition hover:bg-[#f5f0e7]"
              >
                Voir le portefeuille
                <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </Link>
              {profile.website_url ? (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-[13px] font-extrabold text-white transition hover:bg-white/15"
                >
                  Site officiel
                  <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-8 lg:py-12">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-7">
            <section id="portefeuille" className="rounded-[1.6rem] border border-[#eadfca] bg-white p-6 shadow-[0_8px_28px_rgba(7,27,51,0.05)] sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.15em] text-bronze-700">Portefeuille public</p>
                  <h2 className="mt-2 text-[1.45rem] font-extrabold tracking-[-0.035em] text-deepblue">
                    {primaryCount} {primaryLabel}
                  </h2>
                </div>
                {profile.city ? (
                  <Link
                    href={citySearchHref}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-deepblue hover:text-bronze-700"
                  >
                    Explorer l’immobilier à {profile.city}
                    <ArrowRight size={12} strokeWidth={2.4} aria-hidden="true" />
                  </Link>
                ) : null}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#efe3cd] bg-[#fffdf8] p-5">
                  <p className="text-[2rem] font-extrabold tracking-[-0.05em] text-deepblue">{profile.portfolio.verified_listings}</p>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-gray-500">Biens avec ownership confirmé</p>
                </div>
                <div className="rounded-2xl border border-[#efe3cd] bg-[#fffdf8] p-5">
                  <p className="text-[2rem] font-extrabold tracking-[-0.05em] text-deepblue">{profile.portfolio.published_projects}</p>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-gray-500">Projets publics publiés</p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-[#eadfca] bg-white p-6 shadow-[0_8px_28px_rgba(7,27,51,0.04)] sm:p-8">
              <h2 className="text-[1.25rem] font-extrabold tracking-[-0.03em] text-deepblue">À propos</h2>
              <p className="mt-4 max-w-3xl text-[14px] leading-7 text-gray-600">
                {profile.description ?? "Informations de présentation non renseignées."}
              </p>
            </section>

            {profile.city ? (
              <section className="rounded-[1.6rem] border border-[#eadfca] bg-white p-6 shadow-[0_8px_28px_rgba(7,27,51,0.04)] sm:p-8">
                <h2 className="text-[1.1rem] font-extrabold tracking-[-0.025em] text-deepblue">Zone principale</h2>
                <Link
                  href={citySearchHref}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d8c8a3] bg-[#fffdf8] px-4 py-2 text-[13px] font-bold text-deepblue transition hover:border-bronze-400 hover:bg-[#fff8ea]"
                >
                  <MapPin size={12} strokeWidth={2.3} aria-hidden="true" />
                  {profile.city}
                </Link>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-[1.5rem] border border-[#eadfca] bg-[#fffdf8] p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
              <div className="flex items-center gap-2 text-deepblue">
                <ShieldCheck size={17} strokeWidth={2} aria-hidden="true" />
                <h2 className="text-[13px] font-extrabold">Profil professionnel public</h2>
              </div>
              <p className="mt-3 text-[12px] leading-5 text-gray-500">
                Ce profil est publié dans l’annuaire professionnel AkarFinder. Les compteurs de portefeuille reposent sur les relations d’ownership et projets enregistrées sur la plateforme.
              </p>
            </section>

            {profile.commercial_badge_label ? (
              <section className="rounded-[1.5rem] border border-bronze-300/50 bg-white p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-400">Relation commerciale</p>
                <p className="mt-2 font-extrabold text-deepblue">{profile.commercial_badge_label}</p>
                <p className="mt-3 text-[11px] leading-5 text-gray-500">
                  Ce badge décrit la relation commerciale avec AkarFinder. Il ne modifie pas la pertinence des résultats et ne constitue pas une certification des annonces.
                </p>
              </section>
            ) : null}

            {profile.website_url ? (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-deepblue px-5 py-3 text-[13px] font-extrabold text-white transition hover:bg-[#0d2a4d]"
              >
                Visiter le site officiel
                <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
              </a>
            ) : null}
          </aside>
        </div>
      </Container>

      <SiteFooter />
    </main>
  );
}
