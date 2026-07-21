import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "AkarFinder Pro — Accès professionnel sécurisé",
  robots: "noindex, nofollow",
};

/**
 * Legacy P11D query-token inbox retired by #19C.
 * Lead data is no longer read from a token in the URL. Professional clients must
 * use the Supabase-Auth Bearer APIs scoped to their organization membership.
 */
export default function LegacyProLeadsRetiredPage() {
  return (
    <div className="min-h-screen bg-[#fffdf8]">
      <SiteHeader />
      <Container className="py-20">
        <div className="mx-auto max-w-xl rounded-[1.5rem] border border-[#eadfca] bg-white p-8 shadow-sm">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-bronze-700">AkarFinder Pro</p>
          <h1 className="mt-3 text-2xl font-extrabold text-deepblue">Accès sécurisé requis</h1>
          <p className="mt-4 text-sm leading-6 text-gray-600">
            L’ancienne boîte de réception protégée par un lien avec token a été retirée. Les données professionnelles et les leads sont désormais isolés par organisation, utilisateur et rôle.
          </p>
          <Link href="/pro" className="mt-6 inline-flex rounded-xl bg-deepblue px-5 py-3 text-sm font-extrabold text-white">
            Retour à AkarFinder Pro
          </Link>
        </div>
      </Container>
    </div>
  );
}
