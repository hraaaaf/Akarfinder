import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { PropertyVisual } from "@/components/demo/PropertyVisual";
import { NeighborhoodExperience } from "@/components/demo/NeighborhoodExperience";
import { DEMO_AGENCY, DEMO_NEIGHBORHOOD_PROFILE } from "@/lib/demo/demo-data";

export const metadata: Metadata = {
  title: "Exemple page agence — Démo AkarFinder",
  description: "Aperçu illustratif d'une page agence type sur AkarFinder.",
  robots: { index: false, follow: false },
};

export default function DemoAgencyPage() {
  const { name, specialties, zones, listings, performance } = DEMO_AGENCY;

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
            Zones : {zones.join(", ")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {specialties.map((s) => (
              <span key={s} className="rounded-full border border-[#e4e9f2] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Sélection fictive
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {listings.map((listing) => (
              <div key={listing.title} className="flex flex-col overflow-hidden rounded-2xl border border-[#e4e9f2] bg-white shadow-[0_10px_30px_rgba(15,35,65,0.06)]">
                <div className="relative">
                  <PropertyVisual type={listing.visual} ratio="16:10" />
                  <DemoBadge className="absolute left-2 top-2" />
                </div>
                <div className="min-w-0 flex-1 p-4">
                  <h3 className="min-w-0 truncate text-[14px] font-extrabold text-[#0B1F3A]">{listing.title}</h3>
                  <p className="mt-1 text-[12px] font-semibold text-slate-500">
                    {listing.type} · {listing.neighborhood}, {listing.city}
                  </p>
                  <p className="mt-2 text-[13px] text-slate-600">{listing.priceIndicative}</p>
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
              Expérience quartier (exemple)
            </h2>
          </div>
          <p className="mt-2 text-[12.5px] text-slate-500">
            Exemple fictif — lecture indicative de l&apos;environnement d&apos;un bien de la sélection.
          </p>
          <NeighborhoodExperience
            className="mt-4"
            surroundings={DEMO_NEIGHBORHOOD_PROFILE.surroundings}
            sectorTags={DEMO_NEIGHBORHOOD_PROFILE.sectorTags}
            sectorNote={DEMO_NEIGHBORHOOD_PROFILE.sectorNote}
            marketPosition={DEMO_NEIGHBORHOOD_PROFILE.marketPosition}
            infoLevel={DEMO_NEIGHBORHOOD_PROFILE.infoLevel}
          />
        </div>
      </section>

      <section className="bg-white px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2">
            <DemoBadge />
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
              Performance démo
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Demandes reçues (démo)", value: performance.requestsReceived },
              { label: "Recherches associées (démo)", value: performance.associatedSearches },
              { label: "Zones les plus demandées (démo)", value: performance.topZones.join(", ") },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-[#e4e9f2] bg-white p-4 text-center">
                <p className="text-[1.5rem] font-extrabold text-[#0B63CE]">{stat.value}</p>
                <p className="mt-1 text-[11px] leading-tight text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-[16px] font-extrabold text-[#0B1F3A]">
            Voir comment une agence peut recevoir des demandes qualifiées
          </h2>
          <DemoRequestButton className="mx-auto mt-5" />
          <div className="mt-4">
            <Link href="/demo/bien" className="text-[12.5px] font-semibold text-[#0B63CE] underline underline-offset-2 hover:text-[#084BA8]">
              Voir une fiche bien enrichie
            </Link>
          </div>
        </div>
      </section>
    </DemoShell>
  );
}
