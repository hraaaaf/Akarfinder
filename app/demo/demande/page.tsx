import type { Metadata } from "next";
import Link from "next/link";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { DemandSummaryCard } from "@/components/demand/DemandSummaryCard";
import { QualifiedDemandPreview } from "@/components/demand/QualifiedDemandPreview";
import { buildSearchDemandProfile } from "@/lib/demand/search-demand-profile";
import { EMPTY_SEARCH_PROFILE } from "@/lib/search-profile/search-profile-types";

export const metadata: Metadata = {
  title: "Exemple demande qualifiée — Démo AkarFinder",
  description:
    "Aperçu illustratif d'une demande qualifiée construite depuis un profil de recherche. Données fictives et non contractuelles.",
  robots: { index: false, follow: false },
};

// Entirely fictional demand, built through the real pure builder so the demo
// demonstrates the actual payload shape. No real contact, no send.
const FICTIONAL_DEMAND = buildSearchDemandProfile(
  {
    ...EMPTY_SEARCH_PROFILE,
    audience: "famille_enfants",
    project: "acheter",
    propertyType: "appartement",
    city: "Casablanca",
    neighborhood: "Maârif",
    budgetTotal: "1 600 000 (fictif)",
    purchaseHorizon: "6 à 12 mois (fictif)",
    minSurface: "90",
    bedrooms: "3",
    elevator: true,
    parking: true,
    securedResidence: true,
    neighborhoodNeeds: ["ecoles", "tram", "supermarche"],
    priorities: ["quartier", "prix"],
  },
  { name: "Profil Démo", reachVia: "Via AkarFinder (fictif)", consent: true },
);

export default function DemoDemandePage() {
  return (
    <DemoShell>
      <section className="bg-gradient-to-b from-[#eef4ff] to-white px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <DemoBadge className="mx-auto" />
          <h1 className="mt-4 text-[2rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.6rem]">
            De la recherche à la demande qualifiée
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-slate-600">
            Exemple fictif : un profil de recherche devient une demande structurée,
            lisible par une agence ou un promoteur partenaire. Aucun envoi réel.
          </p>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2">
            <DemoBadge />
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
              Côté utilisateur — la demande construite
            </h2>
          </div>
          <div className="mt-4">
            <DemandSummaryCard demand={FICTIONAL_DEMAND} />
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2">
            <DemoBadge />
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
              Côté partenaire — ce que reçoit l&apos;agence ou le promoteur
            </h2>
          </div>
          <p className="mt-2 text-[12.5px] text-slate-500">
            Une demande précise fait gagner du temps aux deux côtés : budget, zone,
            intention, urgence et points non négociables sont lisibles d&apos;un coup d&apos;œil.
          </p>
          <div className="mt-4">
            <QualifiedDemandPreview demand={FICTIONAL_DEMAND} />
          </div>
        </div>
      </section>

      <section className="px-4 py-12 text-center">
        <DemoRequestButton label="Demander une démonstration" className="mx-auto" />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <Link href="/profil-recherche" className="text-[12.5px] font-semibold text-[#0B63CE] underline underline-offset-2 hover:text-[#084BA8]">
            Créer mon profil de recherche
          </Link>
          <Link href="/demo" className="text-[12.5px] font-semibold text-[#0B63CE] underline underline-offset-2 hover:text-[#084BA8]">
            Retour au mode exposition
          </Link>
        </div>
      </section>
    </DemoShell>
  );
}
