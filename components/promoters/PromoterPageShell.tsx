import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Building2,
  FileText,
  Globe,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { TrackedLink } from "@/components/tracking/TrackedLink";
import type { Promoter, NewProject } from "@/lib/promoters/types";

type PromoterPageShellProps = {
  promoter: Promoter;
  projects: NewProject[];
  isDemo?: boolean;
};

function ProjectCard({ project }: { project: NewProject }) {
  const surfaceLabel =
    project.surfaces.min && project.surfaces.max
      ? `${project.surfaces.min}–${project.surfaces.max} m²`
      : project.surfaces.min
      ? `À partir de ${project.surfaces.min} m²`
      : project.surfaces.max
      ? `Jusqu'à ${project.surfaces.max} m²`
      : null;

  return (
    <article className="flex flex-col gap-3 rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.05)]">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-amber-800">
          {project.partner_badge}
        </span>
        <span className="text-[11px] font-bold text-gray-400">
          {project.project_status === "active"
            ? "En cours"
            : project.project_status === "upcoming"
            ? "À venir"
            : project.project_status === "delivered"
            ? "Livré"
            : "En pause"}
        </span>
      </div>
      <h3 className="text-[1rem] font-extrabold tracking-[-0.02em] text-deepblue">
        {project.name}
      </h3>
      <p className="text-[12.5px] font-medium text-gray-500">
        {project.neighborhood
          ? `${project.city}, ${project.neighborhood}`
          : project.city}
      </p>
      <p className="text-[1.25rem] font-extrabold tracking-[-0.03em] text-deepblue">
        {project.price_from.toLocaleString("fr-FR")} DH
        <span className="ml-1 text-[11px] font-bold text-gray-400">
          prix à partir de
        </span>
      </p>
      {surfaceLabel ? (
        <p className="text-[12px] font-bold text-amber-700">{surfaceLabel}</p>
      ) : null}
      {project.typologies.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {project.typologies.map((t) => (
            <span
              key={t}
              className="rounded-full border border-[#eadfca] bg-[#fffdf8] px-2.5 py-1 text-[11px] font-bold text-deepblue"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      <Link
        href={`/projets/${project.slug}`}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-deepblue px-4 py-2.5 text-[12.5px] font-extrabold text-white transition hover:bg-[#0d2a4d]"
      >
        Voir le programme
        <ArrowRight size={12} strokeWidth={2.4} aria-hidden="true" />
      </Link>
    </article>
  );
}

export function PromoterPageShell({ promoter, projects, isDemo }: PromoterPageShellProps) {
  const cities = [...new Set(projects.map((p) => p.city))];

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
      {isDemo ? (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-400 bg-amber-400 px-4 py-2.5 text-center text-[12.5px] font-extrabold text-amber-950">
          <span>⚠</span>
          <span>
            Exemple de démonstration — non publié.
            Ces données servent uniquement à illustrer une page promoteur partenaire AkarFinder.
          </span>
        </div>
      ) : null}
      <SiteHeader />

      {/* Hero */}
      <section className="bg-[#78350f] px-4 py-14 text-white sm:py-18">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/promoteurs"
            className="mb-6 inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-300 transition hover:text-white"
          >
            <ArrowLeft size={13} strokeWidth={2.4} aria-hidden="true" />
            Espace promoteurs
          </Link>
          <div className="flex items-start gap-5">
            {promoter.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={promoter.logo_url}
                alt={`Logo ${promoter.name}`}
                className="h-16 w-16 rounded-2xl border border-white/20 bg-white/10 object-contain p-2"
              />
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-700 text-white">
                <Building2 size={28} strokeWidth={1.75} aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-700/60 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-amber-200">
                Projet partenaire
              </span>
              <h1 className="mt-2 text-[2rem] font-extrabold leading-tight tracking-[-0.04em] sm:text-[2.6rem]">
                {promoter.name}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-white/70">
                <MapPin size={13} strokeWidth={2} aria-hidden="true" />
                {promoter.city}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Container className="space-y-10 py-10 lg:py-14">

        {/* Présentation */}
        <section className="rounded-[1.5rem] border border-[#eadfca] bg-white p-6 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
          <p className="mb-3 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-amber-700">
            Données fournies par le promoteur
          </p>
          <p className="text-[14.5px] leading-7 text-gray-700">{promoter.description}</p>
          {promoter.website_url ? (
            <a
              href={promoter.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-deepblue transition hover:text-amber-700"
            >
              <Globe size={13} strokeWidth={2} aria-hidden="true" />
              Site du promoteur
              <ArrowRight size={11} strokeWidth={2.4} aria-hidden="true" />
            </a>
          ) : null}
        </section>

        {/* Projets actifs */}
        <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-deepblue">
              Programmes disponibles
            </h2>
            <span className="text-[12px] font-bold text-gray-400">
              {projects.length} projet{projects.length > 1 ? "s" : ""}
            </span>
          </div>
          {projects.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-[#d8c8a3] bg-white p-8 text-center">
              <p className="text-[14px] font-bold text-gray-400">
                Aucun programme disponible actuellement.
              </p>
            </div>
          )}
        </section>

        {/* Villes / quartiers */}
        {cities.length > 0 ? (
          <section>
            <h2 className="mb-4 text-[1.1rem] font-extrabold tracking-[-0.02em] text-deepblue">
              Villes et quartiers
            </h2>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <Link
                  key={city}
                  href={`/search?city=${encodeURIComponent(city)}&transaction_type=buy`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c8a3] bg-white px-4 py-2 text-[13px] font-bold text-deepblue transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
                >
                  <MapPin size={11} strokeWidth={2.4} aria-hidden="true" />
                  {city}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* CTA contact */}
        {isDemo ? (
          <section className="rounded-[1.7rem] border border-amber-300 bg-amber-50 p-6 sm:p-8">
            <h2 className="mb-1 text-[1.2rem] font-extrabold tracking-[-0.03em] text-deepblue">
              Vous souhaitez votre propre page promoteur ?
            </h2>
            <p className="mb-6 max-w-xl text-[13.5px] leading-6 text-gray-600">
              Cette page est un exemple de démonstration. Demandez à rejoindre l'espace
              promoteurs partenaires AkarFinder — votre profil, vos projets, vos leads.
            </p>
            <TrackedLink
              href="/pro"
              event={{ event_name: "promoter_cta_click", source_page: "/promoteurs", source_channel: "promoter", intent: "promoteur" }}
              className="inline-flex items-center gap-2 rounded-xl bg-deepblue px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-[#0d2a4d]"
            >
              <Building2 size={15} strokeWidth={2} aria-hidden="true" />
              Demander une page promoteur
            </TrackedLink>
          </section>
        ) : (
          <section className="rounded-[1.7rem] border border-amber-200 bg-amber-50 p-6 sm:p-8">
            <h2 className="mb-1 text-[1.2rem] font-extrabold tracking-[-0.03em] text-deepblue">
              Contacter ce promoteur
            </h2>
            <p className="mb-6 max-w-xl text-[13.5px] leading-6 text-gray-600">
              Demande d'information, brochure ou prise de contact — coordonnées fournies
              par le promoteur partenaire.
            </p>
            <div className="flex flex-wrap gap-3">
              {promoter.contact_whatsapp ? (
                <a
                  href={`https://wa.me/${promoter.contact_whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#25d366] px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-[#1ebe59]"
                >
                  <MessageCircle size={16} strokeWidth={2} aria-hidden="true" />
                  Contacter par WhatsApp
                </a>
              ) : null}
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-xl border border-[#d8c8a3] bg-white px-5 py-3 text-[13.5px] font-extrabold text-deepblue transition hover:bg-[#f7f3ea]"
              >
                <FileText size={15} strokeWidth={2} aria-hidden="true" />
                Créer mon dossier acheteur
              </Link>
            </div>
            {!promoter.contact_whatsapp && !promoter.contact_email ? (
              <p className="mt-4 text-[12px] text-gray-400">
                Coordonnées disponibles depuis la fiche de chaque programme.
              </p>
            ) : null}
          </section>
        )}

        {/* Reporting futur */}
        <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_4px_16px_rgba(7,27,51,0.04)]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#1a4a8a] text-white">
              <BarChart2 size={18} strokeWidth={2} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-[0.95rem] font-extrabold tracking-[-0.02em] text-deepblue">
                Reporting projet
              </h3>
              <span className="ml-0 mt-0.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                À venir
              </span>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-6 text-gray-500">
            Suivi des vues, demandes de brochure et contacts générés par vos programmes.
            Disponible dans les prochaines versions de l'espace promoteur.
          </p>
        </section>

        {/* Disclaimer */}
        <p className="rounded-xl border border-[#eadfca] bg-[#fffdf8] px-4 py-3 text-[12px] leading-5 text-gray-500">
          Données fournies par le promoteur partenaire. Informations à confirmer
          directement auprès du promoteur avant tout engagement. AkarFinder n'est pas
          partie à la transaction et ne garantit aucun résultat commercial.
        </p>

      </Container>

      <SiteFooter />
    </main>
  );
}
