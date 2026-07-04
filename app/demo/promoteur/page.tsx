import type { Metadata } from "next";
import { MapPin, FileText, QrCode, ClipboardList, BarChart2 } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { PropertyVisual } from "@/components/demo/PropertyVisual";
import { NeighborhoodExperience } from "@/components/demo/NeighborhoodExperience";
import { DEMO_PROMOTER, DEMO_PROMOTER_NEIGHBORHOOD } from "@/lib/demo/demo-data";

export const metadata: Metadata = {
  title: "Exemple page promoteur — Démo AkarFinder",
  description: "Aperçu illustratif d'une page projet autorisée pour un promoteur.",
  robots: { index: false, follow: false },
};

const VALUE_POINTS = [
  { icon: FileText, label: "Page projet autorisée" },
  { icon: QrCode, label: "QR code salon" },
  { icon: ClipboardList, label: "Formulaire lead" },
  { icon: BarChart2, label: "Rapport de demande" },
];

export default function DemoPromoterPage() {
  const { name, zones, projects, report } = DEMO_PROMOTER;

  return (
    <DemoShell>
      <section className="bg-gradient-to-b from-[#eef4ff] to-white px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <DemoBadge />
          <h1 className="mt-4 text-[2rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.6rem]">
            {name}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-500">
            <MapPin size={14} className="text-[#0B63CE]" aria-hidden="true" />
            Zones couvertes : {zones.join(", ")}
          </p>
          <p className="mt-4 max-w-xl text-[14px] leading-6 text-slate-600">
            Exemple non contractuel — cette page illustre à quoi pourrait ressembler la présence
            autorisée d&apos;un promoteur partenaire sur AkarFinder.
          </p>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Projets fictifs
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.name}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#e4e9f2] bg-white shadow-[0_10px_30px_rgba(15,35,65,0.06)]"
              >
                <div className="relative">
                  <PropertyVisual type={project.visual} ratio="16:10" />
                  <DemoBadge className="absolute left-2 top-2" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-[15px] font-extrabold text-[#0B1F3A]">{project.name}</h3>
                  <p className="mt-1 text-[12.5px] font-semibold text-slate-500">{project.type} · {project.city}</p>
                  <p className="mt-3 text-[13px] text-slate-600">{project.priceIndicative}</p>
                  <p className="mt-1 text-[12px] text-slate-400">{project.deliveryIndicative}</p>
                  <DemoRequestButton label="Demander des informations" className="mt-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2">
            <DemoBadge />
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
              Expérience quartier autour du projet (exemple)
            </h2>
          </div>
          <p className="mt-2 text-[12.5px] text-slate-500">
            Exemple fictif — lecture indicative de l&apos;environnement d&apos;un projet neuf.
          </p>
          <NeighborhoodExperience
            className="mt-4"
            surroundings={DEMO_PROMOTER_NEIGHBORHOOD.surroundings}
            sectorTags={DEMO_PROMOTER_NEIGHBORHOOD.sectorTags}
            sectorNote={DEMO_PROMOTER_NEIGHBORHOOD.sectorNote}
            positioning={DEMO_PROMOTER_NEIGHBORHOOD.positioning}
            targetAudience={DEMO_PROMOTER_NEIGHBORHOOD.targetAudience}
          />
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Ce qu&apos;un partenariat pourrait inclure (exemple)
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {VALUE_POINTS.map((point) => (
              <div key={point.label} className="flex items-center gap-3 rounded-xl border border-[#e4e9f2] bg-white p-4">
                <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0B63CE]/10 text-[#0B63CE]">
                  <point.icon size={16} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <p className="text-[13px] font-bold text-[#0B1F3A]">{point.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2">
            <DemoBadge />
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
              Mini rapport de demande (démo)
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Recherches reçues (démo)", value: report.searchesReceived },
              { label: "Clics vers la source (démo)", value: report.sourceClicks },
              { label: "Demandes d'information (démo)", value: report.infoRequests },
              { label: "Quartiers recherchés (démo)", value: report.topNeighborhoods.join(", ") },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-[#e4e9f2] bg-white p-4 text-center">
                <p className="text-[1.5rem] font-extrabold text-[#0B63CE]">{stat.value}</p>
                <p className="mt-1 text-[11px] leading-tight text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11.5px] text-slate-400">
            Toutes les valeurs de ce rapport sont fictives et fournies à titre d&apos;illustration.
          </p>
        </div>
      </section>
    </DemoShell>
  );
}
