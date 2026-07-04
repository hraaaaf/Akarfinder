import type { Metadata } from "next";
import { Bell, MapPin } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { NeighborhoodExperience } from "@/components/demo/NeighborhoodExperience";
import { DEMO_RENTER_NEEDS, DEMO_POPULAR_RENT_ZONES, DEMO_RENTAL_NEIGHBORHOOD_PROFILE } from "@/lib/demo/demo-data";

export const metadata: Metadata = {
  title: "Exemple parcours Louer — Démo AkarFinder",
  description: "Aperçu illustratif d'une expérience de location au Maroc.",
  robots: { index: false, follow: false },
};

export default function DemoLouerPage() {
  return (
    <DemoShell>
      <section className="bg-gradient-to-b from-[#eef4ff] to-white px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <DemoBadge className="mx-auto" />
          <h1 className="mt-4 text-[2rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.6rem]">
            Louer au Maroc plus simplement
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-slate-600">
            Exemple non contractuel d&apos;expérience Louer.
          </p>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#e4e9f2] bg-white p-6">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[#0B63CE]" aria-hidden="true" />
              <h2 className="text-[14px] font-extrabold text-[#0B1F3A]">Formulaire d&apos;alerte location (démo)</h2>
            </div>
            <div className="mt-4 space-y-3 text-[12.5px] text-slate-600">
              <p>Budget : {DEMO_RENTER_NEEDS.budget}</p>
              <p>Ville : {DEMO_RENTER_NEEDS.city}</p>
              <p>Quartier : {DEMO_RENTER_NEEDS.neighborhood}</p>
              <p>Surface : {DEMO_RENTER_NEEDS.surface}</p>
            </div>
            <p className="mt-4 rounded-lg bg-[#f8fafc] px-3 py-2 text-[11.5px] text-slate-400">
              Cette démonstration n&apos;active aucune alerte réelle.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e4e9f2] bg-white p-6">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#0B63CE]" aria-hidden="true" />
              <h2 className="text-[14px] font-extrabold text-[#0B1F3A]">Zones populaires (exemple)</h2>
            </div>
            <div className="mt-4 space-y-2">
              {DEMO_POPULAR_RENT_ZONES.map((z) => (
                <div key={`${z.city}-${z.neighborhood}`} className="flex items-center justify-between rounded-lg border border-[#e4e9f2] px-3 py-2 text-[12.5px]">
                  <span className="font-bold text-[#0B1F3A]">{z.neighborhood}</span>
                  <span className="text-slate-500">{z.city}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2">
            <DemoBadge />
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
              Expérience quartier (exemple)
            </h2>
          </div>
          <p className="mt-2 text-[12.5px] text-slate-500">
            Exemple fictif — lecture indicative de l&apos;environnement d&apos;une location.
          </p>
          <NeighborhoodExperience
            className="mt-4"
            surroundings={DEMO_RENTAL_NEIGHBORHOOD_PROFILE.surroundings}
            sectorTags={DEMO_RENTAL_NEIGHBORHOOD_PROFILE.sectorTags}
            sectorNote={DEMO_RENTAL_NEIGHBORHOOD_PROFILE.sectorNote}
            marketPosition={DEMO_RENTAL_NEIGHBORHOOD_PROFILE.marketPosition}
            infoLevel={DEMO_RENTAL_NEIGHBORHOOD_PROFILE.infoLevel}
          />
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#e4e9f2] bg-white p-6 text-center">
          <DemoBadge className="mx-auto" />
          <h2 className="mt-3 text-[14px] font-extrabold text-[#0B1F3A]">Exemple de relance de recherche</h2>
          <p className="mt-2 text-[12.5px] leading-5 text-slate-500">
            « De nouveaux résultats correspondant à votre recherche sont disponibles depuis leurs
            sources originales. » — exemple de message, non envoyé.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 text-center">
        <DemoRequestButton label="Demander une démonstration" className="mx-auto" />
      </section>
    </DemoShell>
  );
}
