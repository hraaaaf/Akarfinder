import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Building2, FileText, Users } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoPartnerResultStack } from "@/components/demo/DemoPartnerResultStack";

export const metadata: Metadata = {
  title: "Démonstrations AkarFinder Pro",
  description: "Trois démonstrations fictives : agence, promoteur et fiche bien enrichie.",
  robots: { index: false, follow: false },
};

const CARDS = [
  {
    href: "/demo/agence",
    icon: Users,
    title: "Expérience agence",
    body: "Portefeuille, données structurées, contexte quartier et aperçu d’une demande qualifiée.",
  },
  {
    href: "/demo/promoteur",
    icon: Building2,
    title: "Expérience promoteur",
    body: "Projets, typologies, plans, médias et présentation structurée d’un programme neuf.",
  },
  {
    href: "/demo/bien",
    icon: FileText,
    title: "Fiche bien enrichie",
    body: "Exemple de ce qu’une donnée plus complète peut rendre plus clair et comparable.",
  },
] as const;

export default function DemoHubPage() {
  return (
    <DemoShell>
      <section className="bg-gradient-to-b from-[#eef4ff] to-white px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <DemoBadge className="mx-auto" />
          <h1 className="mt-5 text-[2.2rem] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#0B1F3A] sm:text-[3rem]">Trois démonstrations pour comprendre AkarFinder Pro</h1>
          <p className="mt-4 text-[15px] leading-7 text-slate-600 sm:text-[16px]">Toutes les données sont fictives. Ces écrans montrent le produit cible ; ils ne représentent aucun partenaire actif, aucun résultat commercial réel et aucune promesse de performance.</p>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {CARDS.map((card) => (
            <Link key={card.href} href={card.href} className="group flex flex-col rounded-2xl border border-[#e4e9f2] bg-white p-6 shadow-[0_10px_30px_rgba(15,35,65,0.06)] transition hover:border-[#0B63CE]/30 hover:shadow-[0_16px_40px_rgba(15,35,65,0.10)]">
              <div className="flex items-center justify-between"><span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-[#0B63CE]/10 text-[#0B63CE]"><card.icon size={20} aria-hidden="true" /></span><DemoBadge /></div>
              <h2 className="mt-4 text-[17px] font-extrabold text-[#0B1F3A]">{card.title}</h2>
              <p className="mt-2 flex-1 text-[13px] leading-6 text-slate-500">{card.body}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-[#0B63CE]">Voir l’exemple <ArrowRight size={14} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section id="resultats-partenaires" className="bg-[#f8fafc] px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 max-w-3xl"><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">Logique de résultat · démonstration</p><h2 className="mt-2 text-2xl font-extrabold text-[#0B1F3A]">La richesse de donnée n’achète pas la pertinence organique</h2><p className="mt-2 text-[13.5px] leading-6 text-slate-600">Cette pile fictive illustre les différents régimes de résultat. Une option commerciale ne doit jamais transformer un résultat moins pertinent en meilleur résultat organique.</p></div>
          <DemoPartnerResultStack />
        </div>
      </section>
    </DemoShell>
  );
}
