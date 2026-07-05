import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { DemoAgencyListingCard } from "@/components/demo/DemoAgencyListingCard";
import { DemoGalleryPhoto } from "@/components/demo/DemoGalleryPhoto";
import { DemoPartnerLeadPreview } from "@/components/demo/DemoPartnerLeadPreview";
import { DemoNeighborhoodExperience } from "@/components/demo/DemoNeighborhoodExperience";
import { PropertyVisual } from "@/components/demo/PropertyVisual";
import { DEMO_PARTNER_AGENCY_EXPERIENCE } from "@/lib/demo/partner-pages-demo-data";

export const metadata: Metadata = {
  title: "Rabat Select Immobilier — Page agence (démo) | AkarFinder",
  description:
    "Exemple fictif de page agence partenaire AkarFinder : biens structurés, repères quartier et demandes qualifiées. Aucune agence réelle représentée.",
  robots: { index: false, follow: false },
};

const NEIGHBORHOOD_SCORES = [
  { label: "Mobilité", value: 82 },
  { label: "Vie quotidienne", value: 88 },
  { label: "Confort famille", value: 80 },
  { label: "Calme urbain", value: 68 },
  { label: "Stationnement", value: 45 },
];

const NEIGHBORHOOD_CHECKS = [
  "Circulation aux heures de pointe",
  "Stationnement visiteurs",
  "Bruit selon rue",
  "Commerces de proximité",
];

export default function DemoAgencyPage() {
  const agency = DEMO_PARTNER_AGENCY_EXPERIENCE;
  const featured = agency.listings[0];

  return (
    <DemoShell>
      {/* Hero agence premium */}
      <section className="bg-gradient-to-b from-[#edf5ff] via-white to-white px-4 py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0B63CE] text-[20px] font-extrabold tracking-tight text-white shadow-[0_10px_26px_rgba(11,99,206,0.35)]">
                {agency.monogram}
              </span>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">
                  Agence immobilière
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500">
                  <MapPin size={13} className="text-[#0B63CE]" aria-hidden="true" />
                  {agency.zones.join(" · ")}
                </p>
              </div>
            </div>
            <h1 className="mt-6 text-[2.3rem] font-extrabold leading-[1.03] tracking-[-0.045em] text-[#0B1F3A] sm:text-[3.2rem]">
              {agency.agencyName}
            </h1>
            <p className="mt-4 max-w-xl text-[16px] leading-7 text-slate-600">
              {agency.tagline}
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {agency.badges.map((badge) => (
                <li key={badge} className="rounded-full border border-[#60A5FA]/40 bg-[#0B63CE]/8 px-3 py-1.5 text-[11.5px] font-extrabold text-[#0B63CE]">
                  {badge}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#biens"
                className="inline-flex items-center justify-center rounded-xl bg-[#0B63CE] px-6 py-3.5 text-[14px] font-extrabold text-white shadow-[0_6px_18px_rgba(11,99,206,0.35)] transition hover:bg-[#084BA8]"
              >
                Voir les biens
              </a>
              <DemoRequestButton label="Envoyer une demande qualifiée" />
              <DemoRequestButton label="Demander une présentation" className="bg-[#0B1F3A] hover:bg-[#123458]" />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-[#dbe7f6] bg-white p-3 shadow-[0_24px_70px_rgba(15,35,65,0.12)]">
            <PropertyVisual type="villa-premium" ratio="16:10" className="rounded-2xl" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/95 p-4 shadow-[0_14px_34px_rgba(15,35,65,0.16)]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">Sélection du moment</p>
              <h2 className="mt-1 text-[18px] font-extrabold text-[#0B1F3A]">Villa contemporaine — Harhoura</h2>
              <p className="mt-1 text-[12px] text-slate-500">280 m² · 4 chambres · jardin · fourchette indicative.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Spécialités en chips compactes */}
      <section className="border-y border-[#eef3fa] bg-white px-4 py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Spécialités</span>
          {agency.specialties.map((s) => (
            <span key={s} className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-[12px] font-bold text-slate-600 ring-1 ring-[#dbe7f6]">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* Biens présentés */}
      <section id="biens" className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Nos biens" title="Une sélection présentée au standard AkarFinder" />
          <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {agency.listings.map((listing) => (
              <DemoAgencyListingCard key={listing.title} {...listing} detailHref="/demo/bien" />
            ))}
          </div>
        </div>
      </section>

      {/* Annonce type AkarFinder */}
      <section className="bg-[#f8fafc] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Annonce type" title="Une annonce structurée en dit plus qu'une annonce classique" />
          <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="grid grid-cols-2 gap-3">
              <DemoGalleryPhoto src="/demo/properties/gallery/apartment-modern-entree.jpg" ratio="4:3" className="col-span-2 rounded-2xl" />
              <DemoGalleryPhoto src="/demo/properties/gallery/apartment-modern-salon.jpg" ratio="4:3" className="rounded-2xl" />
              <DemoGalleryPhoto src="/demo/properties/gallery/apartment-modern-balcon.jpg" ratio="4:3" className="rounded-2xl" />
            </div>
            <div className="rounded-2xl border border-[#dbe7f6] bg-white p-6 shadow-[0_12px_34px_rgba(15,35,65,0.07)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[17px] font-extrabold text-[#0B1F3A]">{featured.title}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500">
                    <MapPin size={13} className="text-[#0B63CE]" aria-hidden="true" />
                    {featured.neighborhood}, {featured.city}
                  </p>
                </div>
                <DemoBadge />
              </div>
              <p className="mt-3 text-[19px] font-extrabold tracking-[-0.02em] text-[#0B1F3A]">{featured.price}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px] text-slate-600">
                <span className="rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">{featured.surface}</span>
                <span className="rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">{featured.bedrooms}</span>
                {featured.features.slice(0, 2).map((f) => (
                  <span key={f} className="rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">{f}</span>
                ))}
              </div>
              <p className="mt-3 text-[12px] font-bold text-[#0B63CE]">{featured.infoLevel}</p>
              <div className="mt-4 rounded-xl bg-[#f8fafc] p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Repère quartier</p>
                <p className="mt-1.5 text-[12.5px] leading-5 text-slate-600">
                  Agdal — quartier central, commerces et écoles dans le secteur, desserte tram à confirmer selon rue.
                </p>
              </div>
              <Link
                href="/demo/bien"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#0B63CE] px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-[#084BA8]"
              >
                Voir la fiche type complète
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Expérience quartier */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Nos quartiers" title="Agdal et Hay Riad, en repères lisibles" />
          <div className="mt-6">
            <DemoNeighborhoodExperience
              zoneLabel="Agdal / Hay Riad — Rabat"
              scores={NEIGHBORHOOD_SCORES}
              checks={NEIGHBORHOOD_CHECKS}
            />
          </div>
        </div>
      </section>

      {/* Demande qualifiée reçue */}
      <section className="bg-[#f8fafc] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Demandes qualifiées" title="Des contacts qui arrivent déjà qualifiés" />
          <div className="mt-6">
            <DemoPartnerLeadPreview leads={agency.qualifiedRequests} />
          </div>
        </div>
      </section>

      {/* Méthode d'accompagnement */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Notre méthode" title="Un accompagnement en trois temps" />
          <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-2xl border border-[#dbe7f6] bg-white p-6 shadow-[0_10px_28px_rgba(15,35,65,0.06)]">
              <DemoBadge />
              <h3 className="mt-4 text-[18px] font-extrabold text-[#0B1F3A]">{agency.advisor.name}</h3>
              <p className="mt-1 text-[13px] font-semibold text-[#0B63CE]">{agency.advisor.role}</p>
              <p className="mt-3 text-[12.5px] leading-6 text-slate-500">{agency.advisor.note}</p>
              <div className="mt-5">
                <DemoRequestButton label="Demander un rappel" className="w-full" />
              </div>
            </article>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {agency.method.map((item) => (
                <article key={item.step} className="rounded-2xl border border-[#dbe7f6] bg-white p-5">
                  <p className="text-[22px] font-extrabold text-[#0B63CE]/30">{item.step}</p>
                  <h3 className="mt-2 text-[14px] font-extrabold text-[#0B1F3A]">{item.title}</h3>
                  <p className="mt-2 text-[12px] leading-5 text-slate-500">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-[#f8fafc] px-4 py-14">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[#dbe7f6] bg-white p-8 text-center shadow-[0_12px_36px_rgba(15,35,65,0.06)]">
          <DemoBadge className="mx-auto" />
          <h2 className="mt-4 text-[1.5rem] font-extrabold tracking-[-0.03em] text-[#0B1F3A]">
            Vos annonces, présentées comme ça
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[13.5px] leading-6 text-slate-500">
            Fiches structurées, repères quartier et demandes qualifiées — dans une expérience claire pour vos clients.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <DemoRequestButton label="Demander une présentation" />
            <Link href="/demo/bien" className="rounded-xl border border-[#dbe7f6] bg-white px-5 py-3 text-[13.5px] font-extrabold text-[#0B1F3A]">
              Voir la fiche type
            </Link>
            <Link href="/demo" className="rounded-xl border border-[#dbe7f6] bg-white px-5 py-3 text-[13.5px] font-extrabold text-[#0B1F3A]">
              Retour au mode exposition
            </Link>
          </div>
          <p className="mt-5 text-[11px] text-slate-400">
            Exemple de présentation partenaire — contenu fictif, non contractuel.
          </p>
        </div>
      </section>
    </DemoShell>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">{eyebrow}</p>
      <h2 className="mt-2 text-[1.55rem] font-extrabold tracking-[-0.035em] text-[#0B1F3A]">{title}</h2>
    </div>
  );
}
