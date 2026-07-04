import Link from "next/link";
import type { Metadata } from "next";
import { Building2, Users, Home, KeyRound, Tag, ArrowRight } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";

export const metadata: Metadata = {
  title: "Mode exposition AkarFinder — Démo",
  description: "Aperçu illustratif de ce qu'AkarFinder peut offrir aux promoteurs, agences et acheteurs.",
  robots: { index: false, follow: false },
};

const CARDS = [
  {
    href: "/demo/promoteur",
    icon: Building2,
    title: "Exemple page promoteur",
    body: "Aperçu d'une page projet autorisée pour un promoteur, avec rapport de demande démo.",
  },
  {
    href: "/demo/agence",
    icon: Users,
    title: "Exemple page agence",
    body: "Aperçu d'une page agence type, spécialités, zones et performance démo.",
  },
  {
    href: "/demo/acheter",
    icon: Home,
    title: "Exemple parcours Acheter",
    body: "Une expérience Acheter bien remplie : profils, repères, sources originales.",
  },
  {
    href: "/demo/louer",
    icon: KeyRound,
    title: "Exemple parcours Louer",
    body: "Une expérience Louer claire avec alerte démo et zones populaires fictives.",
  },
  {
    href: "/demo/vendre",
    icon: Tag,
    title: "Exemple parcours Vendre",
    body: "Une expérience propriétaire/vendeur avec exemple de demande vendeur.",
  },
];

export default function DemoHubPage() {
  return (
    <DemoShell>
      <section className="bg-gradient-to-b from-[#eef4ff] to-white px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <DemoBadge className="mx-auto" />
          <h1 className="mt-5 text-[2.2rem] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#0B1F3A] sm:text-[3rem]">
            Mode exposition AkarFinder
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-slate-600 sm:text-[16px]">
            Un aperçu illustratif de ce qu&apos;AkarFinder peut offrir aux promoteurs, agences et
            acheteurs. Support de démonstration commerciale — exemple non contractuel.
          </p>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col rounded-2xl border border-[#e4e9f2] bg-white p-6 shadow-[0_10px_30px_rgba(15,35,65,0.06)] transition hover:border-[#0B63CE]/30 hover:shadow-[0_16px_40px_rgba(15,35,65,0.10)]"
            >
              <div className="flex items-center justify-between">
                <span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-[#0B63CE]/10 text-[#0B63CE]">
                  <card.icon size={20} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <DemoBadge />
              </div>
              <h2 className="mt-4 text-[16px] font-extrabold text-[#0B1F3A]">{card.title}</h2>
              <p className="mt-2 flex-1 text-[13px] leading-6 text-slate-500">{card.body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-extrabold text-[#0B63CE] transition group-hover:gap-2.5">
                Voir l&apos;exemple
                <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </DemoShell>
  );
}
