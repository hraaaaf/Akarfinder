import { AccompagnementLeadForm } from "@/components/accompagnement/AccompagnementLeadForm";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Accompagnement immobilier — AkarFinder",
  description: "Demandez à être recontacté par AkarFinder pour une question ou un accompagnement immobilier.",
  robots: { index: false, follow: true },
};

export default async function AccompagnementPage({ searchParams }: { searchParams: Promise<{ intent?: string }> }) {
  const { intent } = await searchParams;
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <section className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          <div className="mb-7 text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">Accompagnement AkarFinder</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-4xl">Parler à un conseiller</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">Cette demande sert uniquement à être recontacté. Elle ne crée pas un deuxième profil de recherche et ne remplace pas Mon Projet.</p>
          </div>
          <AccompagnementLeadForm intent={intent ?? "neuf"} />
        </Container>
      </section>
      <SiteFooter />
    </main>
  );
}
