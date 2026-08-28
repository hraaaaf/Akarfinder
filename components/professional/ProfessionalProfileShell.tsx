import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ExternalLink,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import type { PublicProfessionalProfile } from "@/lib/professional/types";

type Profile = PublicProfessionalProfile & {
  portfolio: { verified_listings: number; published_projects: number };
};

type Props = {
  profile: Profile;
  isDemo?: boolean;
};

function profileMonogram(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "AF";
}

export function ProfessionalProfileShell({ profile, isDemo = false }: Props) {
  const isPromoter = profile.organization_type === "promoter";
  const typeLabel = isPromoter ? "Promoteur immobilier" : "Agence immobilière";
  const primaryCount = isPromoter ? profile.portfolio.published_projects : profile.portfolio.verified_listings;
  const primaryLabel = isPromoter ? "projets publics" : "biens rattachés et vérifiés";
  const secondaryCount = isPromoter ? profile.portfolio.verified_listings : profile.portfolio.published_projects;
  const secondaryLabel = isPromoter ? "biens rattachés et vérifiés" : "projets publics";
  const portfolioCta = isPromoter ? "Voir les projets" : "Voir les biens";
  const citySearchHref = profile.city
    ? `/search?city=${encodeURIComponent(profile.city)}&transaction_type=buy`
    : "/search";
  const monogram = profileMonogram(profile.display_name);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {isDemo ? (
        <div className="bg-[#0B63CE] px-4 py-2 text-white">
          <Container className="flex items-center justify-between gap-4 text-[11px] font-semibold sm:text-xs">
            <span>
              <strong className="mr-2 rounded-full border border-white/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                Mode démo
              </strong>
              Données fictives à titre d’illustration.
            </span>
            <span className="hidden text-white/75 sm:inline">Aucun partenaire réel n’est représenté.</span>
          </Container>
        </div>
      ) : null}

      <SiteHeader />

      <section className="bg-gradient-to-b from-[#edf5ff] via-white to-white px-4 py-12 sm:py-16 lg:py-20">
        <Container>
          <div className="grid gap-9 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
            <div>
              <div className="flex items-center gap-3">
                {profile.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.logo_url}
                    alt={`Logo ${profile.display_name}`}
                    className="h-14 w-14 shrink-0 rounded-2xl border border-[#dbe7f6] bg-white object-contain p-2 shadow-[0_10px_26px_rgba(11,99,206,0.15)]"
                  />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#0B63CE] text-[18px] font-extrabold tracking-tight text-white shadow-[0_10px_26px_rgba(11,99,206,0.30)]">
                    {monogram}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">{typeLabel}</p>
                  {profile.city ? (
                    <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500">
                      <MapPin size={13} className="text-[#0B63CE]" aria-hidden="true" />
                      {profile.city}
                    </p>
                  ) : (
                    <p className="mt-1 text-[12.5px] font-semibold text-slate-400">Profil public AkarFinder</p>
                  )}
                </div>
              </div>

              <h1 className="mt-6 max-w-3xl text-[2.35rem] font-extrabold leading-[1.03] tracking-[-0.05em] text-[#0B1F3A] sm:text-[3.2rem]">
                {profile.display_name}
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-[16px]">
                {profile.description ?? `Profil public ${typeLabel.toLowerCase()} sur AkarFinder.`}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#60A5FA]/35 bg-[#eff6ff] px-3 py-1.5 text-[11.5px] font-extrabold text-[#0B63CE]">
                  <ShieldCheck size={12} aria-hidden="true" />
                  Profil public AkarFinder
                </span>
                <span className="rounded-full border border-[#dbe7f6] bg-white px-3 py-1.5 text-[11.5px] font-extrabold text-slate-600">
                  Portefeuille public
                </span>
                {profile.commercial_badge_label ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe7f6] bg-white px-3 py-1.5 text-[11.5px] font-extrabold text-slate-600">
                    <BadgeCheck size={12} className="text-[#0B63CE]" aria-hidden="true" />
                    {profile.commercial_badge_label}
                  </span>
                ) : null}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="#portefeuille"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-6 py-3.5 text-[14px] font-extrabold text-white shadow-[0_6px_18px_rgba(11,99,206,0.30)] transition hover:bg-[#084BA8]"
                >
                  {portfolioCta}
                  <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </Link>
                {profile.city ? (
                  <Link
                    href={citySearchHref}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#cfe0f5] bg-white px-5 py-3.5 text-[13.5px] font-extrabold text-[#0B1F3A] transition hover:border-[#9fc5ef] hover:bg-[#f8fbff]"
                  >
                    Explorer {profile.city}
                    <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
                  </Link>
                ) : null}
                {profile.website_url ? (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#cfe0f5] bg-white px-5 py-3.5 text-[13.5px] font-extrabold text-[#0B1F3A] transition hover:border-[#9fc5ef] hover:bg-[#f8fbff]"
                  >
                    Site officiel
                    <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-[#dbe7f6] bg-white p-5 shadow-[0_24px_70px_rgba(15,35,65,0.12)] sm:p-7">
              <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#d9ebff] blur-2xl" aria-hidden="true" />
              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#0B63CE]">Portefeuille public</p>
                    <p className="mt-2 text-[12.5px] font-semibold text-slate-500">Données publiées dans AkarFinder</p>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eff6ff] text-[#0B63CE]">
                    <Building2 size={20} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-8 rounded-2xl bg-[#0B1F3A] p-6 text-white">
                  <p className="text-[3rem] font-extrabold leading-none tracking-[-0.055em]">{primaryCount}</p>
                  <p className="mt-2 text-[13px] font-bold text-white/75">{primaryLabel}</p>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-[#dbe7f6] bg-[#f8fbff] p-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Complément</p>
                    <p className="mt-1 text-[12.5px] font-bold text-slate-600">{secondaryLabel}</p>
                  </div>
                  <p className="text-[1.7rem] font-extrabold tracking-[-0.04em] text-[#0B63CE]">{secondaryCount}</p>
                </div>

                <p className="mt-5 text-[11px] leading-5 text-slate-400">
                  Les compteurs proviennent uniquement des rattachements vérifiés et des projets publics enregistrés sur AkarFinder.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-[#eef3fa] bg-white px-4 py-5">
        <Container className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Repères</span>
          <span className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-[12px] font-bold text-slate-600 ring-1 ring-[#dbe7f6]">{typeLabel}</span>
          {profile.city ? (
            <span className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-[12px] font-bold text-slate-600 ring-1 ring-[#dbe7f6]">{profile.city}</span>
          ) : null}
          <span className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-[12px] font-bold text-slate-600 ring-1 ring-[#dbe7f6]">
            {primaryCount} {primaryLabel}
          </span>
        </Container>
      </section>

      <section id="portefeuille" className="px-4 py-12 sm:py-14">
        <Container>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">Portefeuille</p>
              <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2rem]">
                Une présence professionnelle lisible
              </h2>
            </div>
            {profile.city ? (
              <Link href={citySearchHref} className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#0B63CE] hover:text-[#084BA8]">
                Voir les résultats à {profile.city}
                <ArrowRight size={12} strokeWidth={2.4} aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-[#dbe7f6] bg-white p-6 shadow-[0_10px_28px_rgba(15,35,65,0.05)]">
              <p className="text-[2.3rem] font-extrabold tracking-[-0.05em] text-[#0B1F3A]">{profile.portfolio.verified_listings}</p>
              <p className="mt-1 text-[13px] font-extrabold text-slate-700">Biens rattachés et vérifiés</p>
              <p className="mt-2 text-[12px] leading-5 text-slate-500">Rattachements professionnels confirmés dans AkarFinder.</p>
            </article>
            <article className="rounded-2xl border border-[#dbe7f6] bg-white p-6 shadow-[0_10px_28px_rgba(15,35,65,0.05)]">
              <p className="text-[2.3rem] font-extrabold tracking-[-0.05em] text-[#0B1F3A]">{profile.portfolio.published_projects}</p>
              <p className="mt-1 text-[13px] font-extrabold text-slate-700">Projets publics publiés</p>
              <p className="mt-2 text-[12px] leading-5 text-slate-500">Projets visibles publiquement et rattachés à ce profil.</p>
            </article>
          </div>
        </Container>
      </section>

      <section className="bg-[#f8fafc] px-4 py-12 sm:py-14">
        <Container>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <article className="rounded-3xl border border-[#dbe7f6] bg-white p-6 shadow-[0_10px_28px_rgba(15,35,65,0.05)] sm:p-8">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">Présentation</p>
              <h2 className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.035em] text-[#0B1F3A]">À propos</h2>
              <p className="mt-4 max-w-3xl text-[14px] leading-7 text-slate-600">
                {profile.description ?? "Informations de présentation non renseignées."}
              </p>
              {profile.city ? (
                <div className="mt-6">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Zone principale</p>
                  <Link
                    href={citySearchHref}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#dbe7f6] bg-[#f8fbff] px-4 py-2 text-[13px] font-bold text-[#0B1F3A] transition hover:border-[#9fc5ef]"
                  >
                    <MapPin size={12} className="text-[#0B63CE]" aria-hidden="true" />
                    {profile.city}
                  </Link>
                </div>
              ) : null}
            </article>

            <aside className="rounded-3xl border border-[#dbe7f6] bg-white p-6 shadow-[0_10px_28px_rgba(15,35,65,0.05)] sm:p-7">
              <div className="flex items-center gap-2 text-[#0B1F3A]">
                <ShieldCheck size={18} className="text-[#0B63CE]" aria-hidden="true" />
                <h2 className="text-[14px] font-extrabold">Profil professionnel public</h2>
              </div>
              <p className="mt-3 text-[12px] leading-5 text-slate-500">
                Ce profil appartient à l’annuaire professionnel AkarFinder. Les compteurs publics reposent sur les données de portefeuille rattachées à l’organisation.
              </p>

              {profile.commercial_badge_label ? (
                <div className="mt-5 border-t border-[#eef3fa] pt-5">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Relation commerciale</p>
                  <p className="mt-2 text-[13px] font-extrabold text-[#0B1F3A]">{profile.commercial_badge_label}</p>
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">
                    Ce badge décrit la relation commerciale avec AkarFinder. Il ne modifie pas la pertinence des résultats et ne constitue pas une certification des annonces.
                  </p>
                </div>
              ) : null}

              {profile.website_url ? (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-[13px] font-extrabold text-white transition hover:bg-[#084BA8]"
                >
                  Visiter le site officiel
                  <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
                </a>
              ) : null}
            </aside>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
