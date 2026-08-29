import { MessageSquareText, PhoneCall, ShieldCheck } from "lucide-react";

import { AccompagnementLeadForm } from "@/components/accompagnement/AccompagnementLeadForm";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Accompagnement immobilier — AkarFinder",
  description: "Demandez à être recontacté par AkarFinder pour une question ou un accompagnement immobilier.",
  robots: { index: false, follow: true },
};

const SUPPORT_POINTS = [
  {
    icon: PhoneCall,
    title: "Être recontacté",
    text: "Laissez un numéro joignable et le contexte utile à votre demande.",
  },
  {
    icon: MessageSquareText,
    title: "Clarifier une question",
    text: "Projet, ville, budget ou point précis : allez directement à l’essentiel.",
  },
  {
    icon: ShieldCheck,
    title: "Sans créer un second profil",
    text: "Cette demande reste séparée de Mon Projet et ne remplace pas votre parcours de recherche.",
  },
] as const;

export default async function AccompagnementPage({ searchParams }: { searchParams: Promise<{ intent?: string }> }) {
  const { intent } = await searchParams;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F4F8FC_0%,#FFFFFF_58%)] text-slate-900">
      <SiteHeader />
      <section className="py-8 sm:py-12 lg:py-14" data-p1-editorial-accompagnement>
        <Container className="max-w-5xl">
          <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-10">
            <div className="pt-1 lg:sticky lg:top-24">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">
                Accompagnement AkarFinder
              </p>
              <h1 className="mt-3 max-w-xl text-[2.15rem] font-extrabold leading-[1.04] tracking-[-0.05em] text-[#0B1F3A] sm:text-[2.7rem]">
                Parler à un conseiller
              </h1>
              <p className="mt-4 max-w-xl text-[14px] leading-6 text-slate-600 sm:text-[15px] sm:leading-7">
                Une demande courte pour être recontacté au sujet de votre projet, sans dupliquer votre profil de recherche ni remplacer Mon Projet.
              </p>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
                {SUPPORT_POINTS.map(({ icon: Icon, title, text }) => (
                  <div
                    key={title}
                    className="flex gap-3 rounded-[18px] border border-[#DCE8F5] bg-white/85 p-4 shadow-[0_8px_24px_rgba(11,31,58,0.045)]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EEF6FF] text-[#0B63CE]">
                      <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-[13px] font-extrabold text-[#0B1F3A]">{title}</h2>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0">
              <AccompagnementLeadForm intent={intent ?? "neuf"} />
            </div>
          </div>
        </Container>
      </section>
      <SiteFooter />
    </main>
  );
}
