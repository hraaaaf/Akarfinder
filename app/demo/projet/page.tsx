import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MapPin, ShieldCheck } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { PropertyVisual } from "@/components/demo/PropertyVisual";
import { DemoProjectPhaseTimeline } from "@/components/demo/DemoProjectPhaseTimeline";
import { DemoTypologyCard } from "@/components/demo/DemoTypologyCard";
import { DemoFloorPlanCard } from "@/components/demo/DemoFloorPlanCard";
import { DemoPartnerContactPanel } from "@/components/demo/DemoPartnerContactPanel";
import { DemoNearbyPlaces } from "@/components/demo/DemoNearbyPlaces";
import { DEMO_PARTNER_PROJECT } from "@/lib/demo/partner-pages-demo-data";

export const metadata: Metadata = {
  title: "Residence Palmier Demo - Projet promoteur AkarFinder",
  description: "Page projet demo avec tranches, typologies, plans 2D, appartement temoin et quartier indicatif.",
  robots: { index: false, follow: false },
};

export default function DemoProjectPage() {
  const project = DEMO_PARTNER_PROJECT;

  return (
    <DemoShell>
      <section className="bg-gradient-to-b from-[#edf5ff] via-white to-white px-4 py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <DemoBadge />
            <p className="mt-4 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">{project.type}</p>
            <h1 className="mt-3 text-[2.2rem] font-extrabold leading-[1.05] tracking-[-0.045em] text-[#0B1F3A] sm:text-[3.2rem]">
              {project.name}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-500">
              <MapPin size={14} className="text-[#0B63CE]" aria-hidden="true" />
              {project.district}, {project.city} - localisation fictive a titre d'illustration
            </p>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">{project.priceRange}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <DemoRequestButton label="Demander brochure demo" />
              <DemoRequestButton label="Rendez-vous showroom demo" className="bg-[#0B1F3A] hover:bg-[#123458]" />
            </div>
          </div>
          <DemoPartnerContactPanel title="Projet partenaire demo" />
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {project.visuals.map((visual) => (
              <div key={visual} className="relative">
                <PropertyVisual type={visual} ratio="4:3" className="rounded-2xl" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section id="tranches" eyebrow="Tranches du projet" title="Calendrier fictif et lisible">
        <DemoProjectPhaseTimeline phases={project.phases} />
      </Section>

      <Section eyebrow="Typologies" title="Unites types demo">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {project.typologies.map((typology) => (
            <DemoTypologyCard key={typology.name} {...typology} />
          ))}
        </div>
      </Section>

      <Section eyebrow="Plans 2D" title="Plans indicatifs par typologie">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {project.floorPlans.map((plan) => (
            <DemoFloorPlanCard key={plan.title} {...plan} />
          ))}
        </div>
      </Section>

      <Section eyebrow="Appartement temoin" title={project.modelApartment.title}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="relative">
            <PropertyVisual type={project.modelApartment.visual} ratio="16:10" className="rounded-2xl" />
          </div>
          <div className="rounded-2xl border border-[#dbe7f6] bg-white p-6">
            <h3 className="text-[15px] font-extrabold text-[#0B1F3A]">Composition demo</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.modelApartment.composition.map((item) => (
                <span key={item} className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-[12px] font-semibold text-slate-600">{item}</span>
              ))}
            </div>
            <h3 className="mt-5 text-[15px] font-extrabold text-[#0B1F3A]">Points forts demo</h3>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 text-[12.5px] text-slate-600 sm:grid-cols-2">
              {project.modelApartment.strengths.map((item) => <li key={item}>- {item}</li>)}
            </ul>
            <h3 className="mt-5 text-[15px] font-extrabold text-[#0B1F3A]">Points a verifier</h3>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 text-[12.5px] text-slate-600 sm:grid-cols-2">
              {project.modelApartment.pointsToVerify.map((item) => <li key={item}>- {item}</li>)}
            </ul>
            <DemoRequestButton label="Visiter appartement temoin demo" className="mt-5" />
          </div>
        </div>
      </Section>

      <Section eyebrow="Localisation" title="Zone approximative demo">
        <div className="rounded-2xl border border-[#dbe7f6] bg-white p-6">
          <p className="text-[13px] leading-6 text-slate-600">{project.locationLevel}. Un projet reel devrait préciser si la localisation est quartier, zone approximative ou adresse exacte autorisee.</p>
        </div>
      </Section>

      <Section eyebrow="Vie quotidienne" title="A proximite du projet">
        <DemoNearbyPlaces categories={project.nearby} />
      </Section>

      <Section eyebrow="Mobilite" title="Se deplacer depuis la zone">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {project.mobility.map((item) => (
            <article key={item} className="rounded-2xl border border-[#dbe7f6] bg-white p-4 text-[12.5px] font-semibold leading-5 text-slate-600">{item}</article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Quartier" title="Comprendre la zone sans promesse absolue">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InfoList title="Avantages indicatifs" items={project.neighborhood.advantages} />
          <InfoList title="Points a verifier" items={project.neighborhood.checks} />
        </div>
      </Section>

      <Section eyebrow="Checklist avant reservation" title="A confirmer avant engagement">
        <div className="rounded-2xl border border-[#dbe7f6] bg-white p-6">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {project.reservationChecklist.map((item) => (
              <p key={item} className="inline-flex items-center gap-2 rounded-xl bg-[#f8fafc] px-3 py-2 text-[12px] font-semibold text-slate-600">
                <ShieldCheck size={13} className="text-[#0B63CE]" aria-hidden="true" />
                {item}
              </p>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-slate-500">
            Un plan 2D ne remplace jamais la visite, la verification terrain, les documents contractuels ou la confirmation par le partenaire.
          </p>
        </div>
      </Section>

      <section className="px-4 py-14 text-center">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <DemoRequestButton label="Demander brochure demo" />
          <DemoRequestButton label="Demander rendez-vous demo" className="bg-[#0B1F3A] hover:bg-[#123458]" />
          <Link href="/demo/promoteur" className="rounded-xl border border-[#dbe7f6] bg-white px-5 py-3 text-[13.5px] font-extrabold text-[#0B1F3A]">
            Retour promoteur
          </Link>
        </div>
      </section>
    </DemoShell>
  );
}

function Section({ eyebrow, title, children, id }: { eyebrow: string; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="px-4 py-12 odd:bg-white even:bg-[#f8fafc]">
      <div className="mx-auto max-w-6xl">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">{eyebrow}</p>
        <h2 className="mt-2 text-[1.55rem] font-extrabold tracking-[-0.035em] text-[#0B1F3A]">{title}</h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-2xl border border-[#dbe7f6] bg-white p-6">
      <h3 className="text-[15px] font-extrabold text-[#0B1F3A]">{title}</h3>
      <ul className="mt-3 space-y-2 text-[12.5px] text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#0B63CE]" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
