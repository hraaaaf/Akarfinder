import type { Metadata } from "next";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { DEMO_BUYER_PROFILES } from "@/lib/demo/demo-data";

export const metadata: Metadata = {
  title: "Exemple parcours Acheter — Démo AkarFinder",
  description: "Aperçu illustratif d'une expérience Acheter au Maroc.",
  robots: { index: false, follow: false },
};

const EXAMPLE_RESULTS = [
  { title: "Appartement 3 chambres — Exemple", city: "Casablanca", source: "Exemple de source externe" },
  { title: "Villa avec jardin — Exemple", city: "Marrakech", source: "Exemple de source externe" },
  { title: "Duplex standing — Exemple", city: "Rabat", source: "Exemple de source externe" },
];

export default function DemoAcheterPage() {
  return (
    <DemoShell>
      <section className="bg-gradient-to-b from-[#eef4ff] to-white px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <DemoBadge className="mx-auto" />
          <h1 className="mt-4 text-[2rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.6rem]">
            Acheter au Maroc avec plus de clarté
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-slate-600">
            Exemple non contractuel d&apos;expérience Acheter.
          </p>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Profils de recherche (exemple)
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {DEMO_BUYER_PROFILES.map((p) => (
              <div key={p.label} className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
                <DemoBadge />
                <p className="mt-3 text-[14px] font-extrabold text-[#0B1F3A]">{p.label}</p>
                <p className="mt-1 text-[12.5px] text-slate-500">{p.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Résultats d&apos;exemple
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {EXAMPLE_RESULTS.map((r) => (
              <div key={r.title} className="flex flex-col rounded-2xl border border-[#e4e9f2] bg-white p-5">
                <DemoBadge className="self-start" />
                <h3 className="mt-3 text-[14px] font-extrabold text-[#0B1F3A]">{r.title}</h3>
                <p className="mt-1 text-[12px] font-semibold text-slate-500">{r.city}</p>
                <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-[#0B63CE]">
                  <ExternalLink size={12} aria-hidden="true" />
                  {r.source}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
            <h3 className="text-[13.5px] font-extrabold text-[#0B1F3A]">Dossier acheteur démo</h3>
            <p className="mt-2 text-[12.5px] leading-5 text-slate-500">
              Exemple de dossier préparé avant contact : budget, zone, type, horizon d&apos;achat.
            </p>
          </div>
          <div className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
            <h3 className="text-[13.5px] font-extrabold text-[#0B1F3A]">Sources originales</h3>
            <p className="mt-2 text-[12.5px] leading-5 text-slate-500">
              Chaque résultat renvoie toujours vers sa source originale — aucune donnée hébergée.
            </p>
          </div>
          <div className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#0B63CE]" aria-hidden="true" />
              <h3 className="text-[13.5px] font-extrabold text-[#0B1F3A]">Points à vérifier avant contact</h3>
            </div>
            <p className="mt-2 text-[12.5px] leading-5 text-slate-500">
              Prix, disponibilité et charges sont à confirmer directement auprès de la source.
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
