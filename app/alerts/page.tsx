import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Alertes immobilières — AkarFinder",
  description: "Configurez votre profil de recherche avant l’activation des alertes automatiques AkarFinder.",
};

export default function AlertsPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] text-[#0B2545]">
      <SiteHeader />
      <Container>
        <section className="mx-auto flex min-h-[62vh] max-w-xl items-center justify-center py-12">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-[#0B63CE]">
              <Bell aria-hidden="true" size={26} strokeWidth={2} />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Alertes immobilières</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              Les notifications automatiques ne sont pas encore activées. Configurez votre profil de recherche pour préparer vos critères sans fausse promesse de notification.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/profil-recherche"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#0B63CE] px-5 text-sm font-semibold text-white transition hover:bg-[#0958b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2"
              >
                Configurer mon profil
              </Link>
              <Link
                href="/search"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-[#0B2545] transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2"
              >
                <Search aria-hidden="true" size={17} />
                Explorer les annonces
              </Link>
            </div>
          </div>
        </section>
      </Container>
      <SiteFooter />
    </main>
  );
}
