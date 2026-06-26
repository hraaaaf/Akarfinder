import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calculator,
  FileText,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { PhotoFirstListingCard } from "@/components/listings/PhotoFirstListingCard";
import { searchListings } from "@/lib/search";
import { getListingProximity } from "@/lib/proximity/get-listing-proximity";
import type { NewProject, Promoter } from "@/lib/promoters/types";
import type { Listing } from "@/lib/listings/types";

type ProjectPageShellProps = {
  project: NewProject;
  promoter: Promoter;
  isDemo?: boolean;
};

function SimilarListingGrid({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) return null;
  return (
    <section>
      <h2 className="mb-4 text-[1.2rem] font-extrabold tracking-[-0.03em] text-deepblue">
        Biens similaires à {listings[0]?.city ?? ""}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.slice(0, 3).map((l) => (
          <PhotoFirstListingCard key={l.id} listing={l} />
        ))}
      </div>
      <p className="mt-3 text-[11.5px] text-gray-400">
        Prix observé — repères indicatifs issus des annonces analysées, à compléter
        par votre propre analyse.
      </p>
    </section>
  );
}

export async function ProjectPageShell({ project, promoter, isDemo }: ProjectPageShellProps) {
  // Fetch similar listings — city match, buy, limit 3
  let similarListings: Listing[] = [];
  try {
    const result = await searchListings({
      city: project.city,
      transaction_type: "buy",
      limit: 4,
    });
    // Exclude any listing that might match this project
    similarListings = (result.listings ?? []).slice(0, 3);
  } catch {
    // Silent fallback — no similar listings
  }

  const proximityPoints = getListingProximity(project.city, project.neighborhood);

  const surfaceLabel =
    project.surfaces.min && project.surfaces.max
      ? `${project.surfaces.min} – ${project.surfaces.max} m²`
      : project.surfaces.min
      ? `À partir de ${project.surfaces.min} m²`
      : project.surfaces.max
      ? `Jusqu'à ${project.surfaces.max} m²`
      : "À confirmer";

  const statusLabel =
    project.project_status === "active"
      ? "En cours de commercialisation"
      : project.project_status === "upcoming"
      ? "Lancement à venir"
      : project.project_status === "delivered"
      ? "Livré"
      : "En pause";

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
      {isDemo ? (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-400 bg-amber-400 px-4 py-2.5 text-center text-[12.5px] font-extrabold text-amber-950">
          <span>⚠</span>
          <span>
            Exemple de démonstration — non publié.
            Ces données servent uniquement à illustrer une page projet partenaire AkarFinder.
          </span>
        </div>
      ) : null}
      <SiteHeader />

      {/* Hero */}
      <section className="bg-[#78350f] px-4 py-14 text-white sm:py-18">
        <div className="mx-auto max-w-4xl">
          <Link
            href={isDemo ? `/promoteurs/${promoter.slug}?preview=demo` : `/promoteurs/${promoter.slug}`}
            className="mb-6 inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-300 transition hover:text-white"
          >
            <ArrowLeft size={13} strokeWidth={2.4} aria-hidden="true" />
            {promoter.name}
          </Link>
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-700 text-white">
              <Building2 size={24} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full bg-amber-700/60 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-amber-200">
                {project.partner_badge}
              </span>
              <h1 className="mt-2 text-[2rem] font-extrabold leading-tight tracking-[-0.04em] sm:text-[2.6rem]">
                {project.name}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-white/70">
                <MapPin size={13} strokeWidth={2} aria-hidden="true" />
                {project.neighborhood
                  ? `${project.city}, ${project.neighborhood}`
                  : project.city}
              </p>
              <p className="mt-1 text-[12px] font-bold text-amber-300">{statusLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <Container className="space-y-10 py-10 lg:py-14">

        {/* Prix + typologies + surfaces — bloc synthèse */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_4px_16px_rgba(7,27,51,0.04)]">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-700 text-white">
              <Calculator size={18} strokeWidth={2} aria-hidden="true" />
            </span>
            <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-700">
              Prix à partir de
            </p>
            <p className="text-[1.5rem] font-extrabold tracking-[-0.04em] text-deepblue">
              {project.price_from.toLocaleString("fr-FR")} DH
            </p>
            <p className="text-[11.5px] font-medium text-gray-400">
              Hors frais notariaux et charges
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_4px_16px_rgba(7,27,51,0.04)]">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#92400e] text-white">
              <LayoutGrid size={18} strokeWidth={2} aria-hidden="true" />
            </span>
            <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-700">
              Typologies
            </p>
            <div className="flex flex-wrap gap-1.5">
              {project.typologies.length > 0 ? (
                project.typologies.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-[#eadfca] bg-[#fffdf8] px-2.5 py-1 text-[12px] font-bold text-deepblue"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-[13px] text-gray-400">
                  À confirmer auprès du promoteur
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_4px_16px_rgba(7,27,51,0.04)]">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#78350f] text-white">
              <Ruler size={18} strokeWidth={2} aria-hidden="true" />
            </span>
            <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-700">
              Surfaces
            </p>
            <p className="text-[1.2rem] font-extrabold tracking-[-0.03em] text-deepblue">
              {surfaceLabel}
            </p>
            {project.delivery_date_label ? (
              <p className="text-[11.5px] font-medium text-gray-500">
                Livraison : {project.delivery_date_label}
              </p>
            ) : null}
          </div>
        </section>

        {/* Localisation indicative */}
        <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_4px_16px_rgba(7,27,51,0.04)]">
          <div className="flex items-center gap-3 mb-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-deepblue text-white">
              <MapPin size={18} strokeWidth={2} aria-hidden="true" />
            </span>
            <h2 className="text-[1.1rem] font-extrabold tracking-[-0.02em] text-deepblue">
              Localisation
            </h2>
          </div>
          <p className="text-[14px] leading-6 text-gray-700">
            {project.address_label ??
              (project.neighborhood
                ? `${project.city}, ${project.neighborhood}`
                : project.city)}
          </p>
          <p className="mt-1.5 text-[11.5px] font-medium text-gray-400">
            Repère indicatif — position à confirmer auprès du promoteur.
          </p>
          <Link
            href={`/search?city=${encodeURIComponent(project.city)}&transaction_type=buy`}
            className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-deepblue transition hover:text-amber-700"
          >
            Explorer {project.city} sur la carte
            <ArrowRight size={12} strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </section>

        {/* Brochure */}
        {project.brochure_url ? (
          <section className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-700 text-white">
                <FileText size={18} strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[1rem] font-extrabold tracking-[-0.02em] text-deepblue">
                  Brochure fournie par le promoteur
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-gray-600">
                  Contenu sous la responsabilité du promoteur partenaire.
                </p>
                <a
                  href={project.brochure_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-[12.5px] font-extrabold text-white transition hover:bg-[#78350f]"
                >
                  Télécharger la brochure
                  <ArrowRight size={12} strokeWidth={2.4} aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>
        ) : null}

        {/* Contact — WhatsApp / rappel */}
        <section className="grid gap-4 sm:grid-cols-2">
          {promoter.contact_whatsapp ? (
            <div className="flex flex-col gap-3 rounded-[1.4rem] border border-[#d1fae5] bg-[#f0fdf4] p-5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#25d366] text-white">
                <MessageCircle size={18} strokeWidth={2} aria-hidden="true" />
              </span>
              <h3 className="text-[0.95rem] font-extrabold tracking-[-0.02em] text-deepblue">
                Contact WhatsApp
              </h3>
              <p className="text-[13px] leading-5 text-gray-500">
                Coordonnées fournies par le promoteur partenaire.
              </p>
              <a
                href={`https://wa.me/${promoter.contact_whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#25d366] px-4 py-2.5 text-[12.5px] font-extrabold text-white transition hover:bg-[#1ebe59]"
              >
                <MessageCircle size={14} strokeWidth={2} aria-hidden="true" />
                Contacter par WhatsApp
              </a>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_4px_16px_rgba(7,27,51,0.04)]">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-deepblue text-white">
              <Phone size={18} strokeWidth={2} aria-hidden="true" />
            </span>
            <h3 className="text-[0.95rem] font-extrabold tracking-[-0.02em] text-deepblue">
              Dossier acheteur
            </h3>
            <p className="text-[13px] leading-5 text-gray-500">
              Créez votre profil acheteur indicatif. Transmis au promoteur partenaire
              sans engagement de votre part.
            </p>
            <Link
              href="/onboarding"
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8c8a3] bg-[#fffdf8] px-4 py-2.5 text-[12.5px] font-extrabold text-deepblue transition hover:bg-[#f7f3ea]"
            >
              Créer mon dossier
              <ArrowRight size={12} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Proximité indicative */}
        {proximityPoints.length > 0 ? (
          <section className="rounded-[1.4rem] border border-[#dbeafe] bg-[#f5f9ff] p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#2563eb] text-white">
                <MapPin size={18} strokeWidth={2} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[1rem] font-extrabold tracking-[-0.02em] text-deepblue">
                  Quartier & proximité
                </h2>
                <p className="text-[11.5px] font-medium text-gray-400">
                  Repères indicatifs — à vérifier avant décision
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {proximityPoints.slice(0, 6).map((pt, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-xl border border-[#dbeafe] bg-white px-3 py-2.5"
                >
                  <span className="text-[11.5px] font-bold text-gray-700 flex-1">
                    {pt.label}
                  </span>
                  <span className="text-[11px] font-bold text-[#2563eb]">
                    {pt.distance_minutes} min {pt.mode}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Biens similaires */}
        <SimilarListingGrid listings={similarListings} />

        {/* Disclaimer */}
        <p className="rounded-xl border border-[#eadfca] bg-[#fffdf8] px-4 py-3 text-[12px] leading-5 text-gray-500">
          {project.disclaimer}
          {" "}AkarFinder n'est pas partie à la transaction et ne garantit aucun résultat commercial.
        </p>

      </Container>

      <SiteFooter />
    </main>
  );
}
