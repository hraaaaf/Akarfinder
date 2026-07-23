"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DemoBadge } from "./DemoBadge";

type DemoShellProps = { children: React.ReactNode };

export function DemoShell({ children }: DemoShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0B1F3A]">
      <div className="sticky top-0 z-50 border-b border-[#60A5FA]/25 bg-[#0B63CE] px-4 py-1.5 text-white sm:py-2.5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1.5 sm:flex-row sm:gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2 text-center text-[11.5px] sm:text-left sm:text-[12px]">
            <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/40 bg-white/10 px-2 py-0.5 font-extrabold uppercase tracking-[0.08em] text-white">Mode démo</span>
            <p className="font-semibold leading-snug text-white/90">Données fictives à titre d’illustration — aucun partenaire réel n’est représenté.</p>
          </div>
          <Link href="/" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-[11px] font-extrabold text-white transition hover:bg-white/20 sm:px-3.5 sm:py-1.5 sm:text-[12px]"><ArrowLeft size={12} aria-hidden="true" />Retour</Link>
        </div>
      </div>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#e4e9f2] bg-[#f8fafc] px-4 py-8 text-center">
        <DemoBadge className="mx-auto" />
        <p className="mx-auto mt-3 max-w-xl text-[12px] leading-5 text-slate-500">Exemple non contractuel — support de démonstration commerciale AkarFinder. Une démonstration ne crée aucun statut partenaire actif.</p>
        <Link href="/pro#contact" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-5 py-3 text-[13px] font-extrabold text-white">Découvrir AkarFinder Pro <ArrowRight size={14} aria-hidden="true" /></Link>
      </footer>
    </div>
  );
}
