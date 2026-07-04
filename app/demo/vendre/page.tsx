import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { DEMO_SELLER_FORM_DEFAULTS } from "@/lib/demo/demo-data";

export const metadata: Metadata = {
  title: "Exemple parcours Vendre — Démo AkarFinder",
  description: "Aperçu illustratif d'une expérience propriétaire/vendeur.",
  robots: { index: false, follow: false },
};

export default function DemoVendrePage() {
  const f = DEMO_SELLER_FORM_DEFAULTS;

  return (
    <DemoShell>
      <section className="bg-gradient-to-b from-[#eef4ff] to-white px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <DemoBadge className="mx-auto" />
          <h1 className="mt-4 text-[2rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.6rem]">
            Préparer la mise en vente
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-slate-600">
            Exemple non contractuel d&apos;expérience propriétaire/vendeur.
          </p>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#e4e9f2] bg-white p-6">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-[#0B63CE]" aria-hidden="true" />
            <h2 className="text-[14px] font-extrabold text-[#0B1F3A]">Formulaire fictif</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-[12.5px] text-slate-600">
            <p>Ville : {f.city}</p>
            <p>Quartier : {f.neighborhood}</p>
            <p>Type : {f.type}</p>
            <p>Surface : {f.surface}</p>
            <p className="sm:col-span-2">Horizon de vente : {f.horizon}</p>
          </div>
          <p className="mt-4 rounded-lg bg-[#f8fafc] px-3 py-2 text-[11.5px] text-slate-400">
            Aucune estimation réelle n&apos;est fournie dans cette démo.
          </p>
        </div>
      </section>

      <section className="bg-[#f8fafc] px-4 py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
            <DemoBadge />
            <h3 className="mt-3 text-[13.5px] font-extrabold text-[#0B1F3A]">Exemple de demande vendeur</h3>
            <p className="mt-2 text-[12.5px] leading-5 text-slate-500">
              « Bien de 95 m² à Racine, Casablanca, horizon de vente 3 à 6 mois » — exemple de
              demande, non transmise.
            </p>
          </div>
          <div className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
            <DemoBadge />
            <h3 className="mt-3 text-[13.5px] font-extrabold text-[#0B1F3A]">
              Ce qu&apos;une agence partenaire pourrait recevoir
            </h3>
            <p className="mt-2 text-[12.5px] leading-5 text-slate-500">
              Zone, type de bien, horizon de vente et éléments de contexte — exemple illustratif
              uniquement.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 text-center">
        <DemoRequestButton label="Demander une démonstration" className="mx-auto" />
      </section>
    </DemoShell>
  );
}
