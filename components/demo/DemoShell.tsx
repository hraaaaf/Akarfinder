"use client";

// DEMO-SHOWCASE-MODE-1 — shared shell for every /demo page: sticky top
// disclaimer banner, demo badge, and a clear "back to live site" exit.
// Deliberately does not reuse SiteHeader/SiteFooter navigation so /demo never
// gets mixed into the live site's primary navigation.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DemoBadge } from "./DemoBadge";

type DemoShellProps = {
  children: React.ReactNode;
};

export function DemoShell({ children }: DemoShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0B1F3A]">
      {/* Sticky disclaimer + exit bar */}
      <div className="sticky top-0 z-50 border-b border-[#60A5FA]/25 bg-[#0B63CE] px-4 py-2.5 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-2 text-center sm:text-left">
            <DemoBadge className="border-white/40 bg-white/10 text-white" />
            <p className="text-[12px] font-semibold leading-snug text-white/90">
              Données fictives à titre d&apos;illustration — aucun partenaire réel n&apos;est représenté.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3.5 py-1.5 text-[12px] font-extrabold text-white transition hover:bg-white/20"
          >
            <ArrowLeft size={13} strokeWidth={2.4} aria-hidden="true" />
            Retour au site live
          </Link>
        </div>
      </div>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#e4e9f2] bg-[#f8fafc] px-4 py-6 text-center">
        <p className="text-[11.5px] text-slate-500">
          Exemple non contractuel — support de démonstration commerciale AkarFinder.
        </p>
      </footer>
    </div>
  );
}
