import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, Building2, Calendar, Car, LayoutTemplate, MapPin, Ruler, Sun, Waves } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { PropertyVisual } from "@/components/demo/PropertyVisual";
import { DemoGalleryPhoto } from "@/components/demo/DemoGalleryPhoto";
import { DemoProjectPhaseTimeline } from "@/components/demo/DemoProjectPhaseTimeline";
import { DemoTypologyCard } from "@/components/demo/DemoTypologyCard";
import { DemoFloorPlanCard } from "@/components/demo/DemoFloorPlanCard";
import { DemoNeighborhoodExperience } from "@/components/demo/DemoNeighborhoodExperience";
import { DEMO_PARTNER_PROJECT, DEMO_PARTNER_PROMOTER_EXPERIENCE } from "@/lib/demo/partner-pages-demo-data";

export const metadata: Metadata = {
  title: "Atlas Résidences — Page promoteur (démo) | AkarFinder",
  description:
    "Exemple fictif de page promoteur partenaire AkarFinder : projets, typologies, plans 2D et repères quartier. Aucun promoteur réel représenté.",
  robots: { index: false, follow: false },
};

const NEIGHBORHOOD_SCORES = [
  { label: "Mobilité", value: 82 },
  { label: "Vie quotidienne", value: 88 },
  { label: "Confort famille", value: 80 },
  { label: "Calme urbain", value: 68 },
  { label: "Stationnement", value: 45 },
];

export default function DemoPromoterPage() {
  const promoter = DEMO_PARTNER_PROMOTER_EXPERIENCE;
  const project = DEMO_PARTNER_PROJECT;
  const model = project.modelApartment;

  return (
    <DemoShell>
      {/* Hero promoteur premium */}
      <section className="bg-gradient-to-b from-[#edf5ff] via-white to-white px-4 py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0B1F3A] text-[20px] font-extrabold tracking-tight text-white shadow-[0_10px_26px_rgba(11,31,58,0.35)]">
                {promoter.monogram}
              </span>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">
                  Promoteur résidentiel premium
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500">
                  <MapPin size={13} className="text-[#0B63CE]" aria-hidden="true" />
                  {promoter.zones.join(" · ")}
                </p>
              </div>
            </div>
            <h1 className="mt-6 text-[2.3rem] font-extrabold leading-[1.03] tracking-[-0.045em] text-[#0B1F3A] sm:text-[3.2rem]">
              {promoter.promoterName}
            </h1>
            <p className="mt-4 max-w-xl text-[16px] leading-7 text-slate-600">
              {promoter.tagline}
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {promoter.badges.map((badge) => (
                <li key={badge} className="rounded-full border border-[#60A5FA]/40 bg-[#0B63CE]/8 px-3 py-1.5 text-[11.5px] font-extrabold text-[#0B63CE]">
                  {badge}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#projets"
                className="inline-flex items-center justify-center rounded-xl bg-[#0B63CE] px-6 py-3.5 text-[14px] font-extrabold text-white shadow-[0_6px_18px_rgba(11,99,206,0.35)] transition hover:bg-[#084BA8]"
              >
                Voir les projets
              </a>
              <DemoRequestButton label="Recevoir une brochure exemple" />
              <DemoRequestButton label="Demander une présentation" className="bg-[#0B1F3A] hover:bg-[#123458]" />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-[#dbe7f6] bg-white p-3 shadow-[0_24px_70px_rgba(15,35,65,0.12)]">
            <PropertyVisual type="project-facade" ratio="16:10" className="rounded-2xl" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/95 p-4 shadow-[0_14px_34px_rgba(15,35,65,0.16)]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">Projet phare</p>
              <h2 className="mt-1 text-[18px] font-extrabold text-[#0B1F3A]">{promoter.mainProject}</h2>
              <p className="mt-1 text-[12px] text-slate-500">Anfa / Casablanca Finance City — tranche 1 en commercialisation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Identité — zones + spécialités en chips compactes */}
      <section className="border-y border-[#eef3fa] bg-white px-4 py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Spécialités</span>
          {promoter.specialties.map((s) => (
            <span key={s} className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-[12px] font-bold text-slate-600 ring-1 ring-[#dbe7f6]">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* Projets */}
      <section id="projets" className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Nos projets" title="Deux adresses, deux styles de vie" />
          <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {promoter.projects.map((item) => (
              <article key={item.name} className="overflow-hidden rounded-3xl border border-[#dbe7f6] bg-white shadow-[0_14px_40px_rgba(15,35,65,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(15,35,65,0.12)]">
                <div className="relative">
                  <PropertyVisual type={item.visual} ratio="16:10" />
                  <span className="absolute left-4 top-4 rounded-full bg-[#0B1F3A]/85 px-3 py-1.5 text-[11px] font-extrabold text-white backdrop-blur-sm">
                    {item.status}
                  </span>
                  <DemoBadge className="absolute right-4 top-4" />
                </div>
                <div className="p-6">
                  <h3 className="text-[20px] font-extrabold tracking-[-0.02em] text-[#0B1F3A]">{item.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500">
                    {item.name.includes("Rivage") ? (
                      <Waves size={13} className="text-[#0B63CE]" aria-hidden="true" />
                    ) : (
                      <Building2 size={13} className="text-[#0B63CE]" aria-hidden="true" />
                    )}
                    {item.district}, {item.city} · {item.type}
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-2 text-[12.5px] text-slate-600 sm:grid-cols-2">
                    <span className="rounded-lg bg-[#f8fafc] px-3 py-2 font-semibold">{item.typologies}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-3 py-2 font-semibold">
                      <Ruler size={13} className="text-[#0B63CE]" aria-hidden="true" />
                      {item.surfaces}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-3 py-2 font-semibold">
                      <Calendar size={13} className="text-[#0B63CE]" aria-hidden="true" />
                      {item.delivery}
                    </span>
                    <span className="rounded-lg bg-[#f8fafc] px-3 py-2 font-semibold">{item.infoLevel}</span>
                  </div>
                  <p className="mt-4 text-[16px] font-extrabold text-[#0B1F3A]">{item.price}</p>
                  <Link
                    href="/demo/projet"
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#0B63CE] px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-[#084BA8]"
                  >
                    Voir le projet
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Tranches / livraisons */}
      <section className="bg-[#f8fafc] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow={project.name} title="Tranches et livraisons indicatives" />
          <div className="mt-6">
            <DemoProjectPhaseTimeline phases={project.phases} />
          </div>
        </div>
      </section>

      {/* Typologies + plans 2D */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Typologies" title="Unités types avec plan 2D" />
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {project.typologies.slice(0, 2).map((typology, index) => (
              <div key={typology.name} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <DemoTypologyCard {...typology} />
                <DemoFloorPlanCard {...project.floorPlans[index]} />
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/demo/projet" className="inline-flex rounded-xl bg-[#0B63CE] px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-[#084BA8]">
              Toutes les typologies du projet
            </Link>
          </div>
        </div>
      </section>

      {/* Appartement témoin */}
      <section className="bg-[#f8fafc] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow={project.name} title={model.title} />
          <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid grid-cols-2 gap-3">
              <DemoGalleryPhoto src={model.gallery[0]} ratio="4:3" className="col-span-2 rounded-2xl" />
              <DemoGalleryPhoto src={model.gallery[1]} ratio="4:3" className="rounded-2xl" />
              <DemoGalleryPhoto src={model.gallery[2]} ratio="4:3" className="rounded-2xl" />
            </div>
            <div className="rounded-2xl border border-[#dbe7f6] bg-white p-6 shadow-[0_12px_34px_rgba(15,35,65,0.07)]">
              <ul className="grid grid-cols-2 gap-2 text-[12.5px] text-slate-600">
                {model.specs.map((spec) => (
                  <li key={spec} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2 font-semibold">
                    {spec.includes("m²") && !spec.includes("chambre") ? <Ruler size={13} className="shrink-0 text-[#0B63CE]" aria-hidden="true" /> : null}
                    {spec.includes("chambre") ? <BedDouble size={13} className="shrink-0 text-[#0B63CE]" aria-hidden="true" /> : null}
                    {spec.includes("parking") ? <Car size={13} className="shrink-0 text-[#0B63CE]" aria-hidden="true" /> : null}
                    {spec.includes("Orientation") ? <Sun size={13} className="shrink-0 text-[#0B63CE]" aria-hidden="true" /> : null}
                    {spec.includes("Plan") ? <LayoutTemplate size={13} className="shrink-0 text-[#0B63CE]" aria-hidden="true" /> : null}
                    {spec}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Points à vérifier</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {model.pointsToVerify.map((point) => (
                    <li key={point} className="rounded-full bg-[#f8fafc] px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 ring-1 ring-[#dbe7f6]">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/demo/bien"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#0B63CE] px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-[#084BA8]"
              >
                Voir la fiche type
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Expérience quartier */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Autour du projet" title="Le quartier, en repères lisibles" />
          <div className="mt-6">
            <DemoNeighborhoodExperience
              zoneLabel="Anfa / Casablanca Finance City — Casablanca"
              scores={NEIGHBORHOOD_SCORES}
              checks={project.neighborhood.checks}
            />
          </div>
        </div>
      </section>

      {/* Module commercial court + CTA final */}
      <section className="bg-[#f8fafc] px-4 py-14">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[#dbe7f6] bg-white p-8 text-center shadow-[0_12px_36px_rgba(15,35,65,0.06)]">
          <DemoBadge className="mx-auto" />
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-slate-600">
            Une page promoteur AkarFinder permet de présenter vos projets, vos typologies,
            vos plans 2D et les repères quartier dans une expérience claire pour l&apos;acheteur.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <DemoRequestButton label="Demander une présentation" />
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
      <h2 className="mt-2 text-[1.6rem] font-extrabold tracking-[-0.035em] text-[#0B1F3A]">{title}</h2>
    </div>
  );
}
