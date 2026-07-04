import type { Metadata } from "next";
import Link from "next/link";
import { BarChart2, Building2, FileText, MapPin, QrCode, Users } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { PropertyVisual } from "@/components/demo/PropertyVisual";
import { DemoProjectPhaseTimeline } from "@/components/demo/DemoProjectPhaseTimeline";
import { DemoTypologyCard } from "@/components/demo/DemoTypologyCard";
import { DemoFloorPlanCard } from "@/components/demo/DemoFloorPlanCard";
import { DemoPartnerContactPanel } from "@/components/demo/DemoPartnerContactPanel";
import { DEMO_PARTNER_PROJECT, DEMO_PARTNER_PROMOTER_EXPERIENCE } from "@/lib/demo/partner-pages-demo-data";

export const metadata: Metadata = {
  title: "Page promoteur partenaire - Demo AkarFinder",
  description: "Experience demo d'une page promoteur partenaire enrichie, avec projets, typologies et plans 2D fictifs.",
  robots: { index: false, follow: false },
};

const VALUE_POINTS = [
  { icon: FileText, label: "Page projet autorisee", body: "Une page projet claire, exploitable et separee des resultats web externes." },
  { icon: Users, label: "Demandes qualifiees", body: "Intentions d'achat structurees, toujours en mode demo ici." },
  { icon: QrCode, label: "QR code salon demo", body: "Support commercial pour rendez-vous et evenements." },
  { icon: BarChart2, label: "Quartiers recherches", body: "Lecture indicative des demandes par zone et typologie." },
];

export default function DemoPromoterPage() {
  const promoter = DEMO_PARTNER_PROMOTER_EXPERIENCE;
  const project = DEMO_PARTNER_PROJECT;

  return (
    <DemoShell>
      <section className="bg-gradient-to-b from-[#edf5ff] via-white to-white px-4 py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <DemoBadge />
            <p className="mt-4 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">
              Promoteur partenaire - mode demo
            </p>
            <h1 className="mt-3 text-[2.1rem] font-extrabold leading-[1.05] tracking-[-0.045em] text-[#0B1F3A] sm:text-[3rem]">
              {promoter.promoterName}
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">
              {promoter.tagline} Donnees fictives, aucun partenaire reel represente, aucune disponibilite live.
            </p>
            <p className="mt-4 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-500">
              <MapPin size={14} className="text-[#0B63CE]" aria-hidden="true" />
              Zones couvertes demo : {promoter.zones.join(", ")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/demo/projet"
                className="inline-flex items-center justify-center rounded-xl bg-[#0B63CE] px-5 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(11,99,206,0.35)] hover:bg-[#084BA8]"
              >
                Voir le projet demo
              </Link>
              <DemoRequestButton label="Demander demonstration" />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-[#dbe7f6] bg-white p-3 shadow-[0_24px_70px_rgba(15,35,65,0.12)]">
            <PropertyVisual type="residence-neuve" ratio="16:10" className="rounded-2xl" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/95 p-4 shadow-[0_14px_34px_rgba(15,35,65,0.16)]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">Projet principal demo</p>
              <h2 className="mt-1 text-[18px] font-extrabold text-[#0B1F3A]">{promoter.mainProject}</h2>
              <p className="mt-1 text-[12px] text-slate-500">Typologies, tranches et plans 2D indicatifs.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Projets actifs demo" title="Une vitrine promoteur plus riche qu'une carte resultat" />
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            {promoter.projects.map((item) => (
              <article key={item.name} className="overflow-hidden rounded-2xl border border-[#dbe7f6] bg-white shadow-[0_12px_34px_rgba(15,35,65,0.07)]">
                <div className="relative">
                  <PropertyVisual type={item.visual} ratio="16:10" />
                  <DemoBadge className="absolute left-3 top-3" />
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">{item.status}</p>
                  <h3 className="mt-2 text-[16px] font-extrabold text-[#0B1F3A]">{item.name}</h3>
                  <p className="mt-1 text-[12px] font-semibold text-slate-500">{item.type} - {item.district}, {item.city}</p>
                  <p className="mt-3 text-[12.5px] leading-5 text-slate-600">{item.price}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Pourquoi une page promoteur AkarFinder" title="Un support de decision, pas une promesse commerciale" />
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            {VALUE_POINTS.map((point) => (
              <article key={point.label} className="rounded-2xl border border-[#dbe7f6] bg-white p-5">
                <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-[#0B63CE]/10 text-[#0B63CE]">
                  <point.icon size={18} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[14px] font-extrabold text-[#0B1F3A]">{point.label}</h3>
                <p className="mt-2 text-[12px] leading-5 text-slate-500">{point.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <SectionTitle eyebrow="Apercu projet principal" title={project.name} />
            <div className="mt-6">
              <DemoProjectPhaseTimeline phases={project.phases} />
            </div>
          </div>
          <DemoPartnerContactPanel title="Contact promoteur demo" />
        </div>
      </section>

      <section className="bg-[#f8fafc] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Typologies et plans" title="Unites types avec plan 2D indicatif" />
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {project.typologies.slice(0, 2).map((typology, index) => (
              <div key={typology.name} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <DemoTypologyCard {...typology} />
                <DemoFloorPlanCard {...project.floorPlans[index]} />
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/demo/projet" className="inline-flex rounded-xl bg-[#0B63CE] px-5 py-3 text-[13.5px] font-extrabold text-white hover:bg-[#084BA8]">
              Voir le projet detaille demo
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <SectionTitle eyebrow="Rapport de demande demo" title="Ce qu'un promoteur pourrait comprendre" />
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              ["Recherches", promoter.report.searches],
              ["Budgets declares", promoter.report.budgets],
              ["Quartiers suivis", promoter.report.neighborhoods.join(", ")],
              ["Typologies consultees", promoter.report.typologies.join(", ")],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-[#dbe7f6] bg-white p-5 text-center">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                <p className="mt-2 text-[15px] font-extrabold text-[#0B63CE]">{value}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-center text-[11.5px] text-slate-400">Toutes les valeurs sont fictives et non contractuelles.</p>
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
