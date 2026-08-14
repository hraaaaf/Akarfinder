import Link from "next/link";
import { Bell, CheckCircle2, Search, SlidersHorizontal } from "lucide-react";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";

export const metadata = {
  title: "Alertes immobilières — AkarFinder",
  description: "Configurez votre profil de recherche avant l’activation des alertes automatiques AkarFinder.",
};

export default function AlertsPage() {
  return (
    <main className={`min-h-screen ${ui.pageLight}`}>
      <SiteHeader searchMode fluid />
      <Container>
        <section className="mx-auto flex min-h-[64vh] max-w-3xl items-center justify-center py-8 sm:py-12">
          <div className={`${ui.surfacePremium} w-full overflow-hidden`}>
            <div className="border-b border-slate-200 px-5 py-6 sm:px-8 sm:py-8">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-primary">
                  <Bell aria-hidden="true" size={23} strokeWidth={2} />
                </div>
                <div>
                  <p className={ui.eyebrow}>Alertes</p>
                  <h1 className="mt-1.5 text-[1.8rem] font-extrabold tracking-[-0.045em] text-[#0B1F3A] sm:text-[2.15rem]">
                    Préparez vos critères maintenant
                  </h1>
                  <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-500">
                    Les notifications automatiques ne sont pas encore activées. Votre profil de recherche peut déjà être préparé sans laisser croire qu’une alerte sera envoyée.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 px-5 py-5 sm:grid-cols-3 sm:px-8 sm:py-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <SlidersHorizontal size={18} className="text-primary" aria-hidden="true" />
                <p className="mt-3 text-[13px] font-extrabold text-[#0B1F3A]">1. Définir vos critères</p>
                <p className="mt-1 text-[11.5px] leading-5 text-slate-500">Ville, budget, type de bien et priorités.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <Search size={18} className="text-primary" aria-hidden="true" />
                <p className="mt-3 text-[13px] font-extrabold text-[#0B1F3A]">2. Explorer maintenant</p>
                <p className="mt-1 text-[11.5px] leading-5 text-slate-500">Utilisez la recherche actuelle avec ces critères.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <CheckCircle2 size={18} className="text-primary" aria-hidden="true" />
                <p className="mt-3 text-[13px] font-extrabold text-[#0B1F3A]">3. Activation future</p>
                <p className="mt-1 text-[11.5px] leading-5 text-slate-500">Aucune notification n’est promise tant que la fonction n’est pas active.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-5 sm:flex-row sm:px-8">
              <Link href="/profil-recherche" className={ui.primaryActionPill}>
                Configurer mon profil
              </Link>
              <Link href="/search" className={`${ui.secondaryActionPill} gap-2`}>
                <Search aria-hidden="true" size={16} />
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
