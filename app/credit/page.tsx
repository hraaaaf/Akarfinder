import type { Metadata } from "next";
import { CreditSimulator } from "@/components/credit/CreditSimulator";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Simulateur de financement indicatif — AkarFinder",
  description: "Estimez une mensualité à titre indicatif. Simulation non contractuelle, à confirmer auprès d'un organisme de financement.",
};

export default function CreditPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />
      <section className="py-12 sm:py-16 lg:py-20">
        <Container>
          <div className="mx-auto max-w-2xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-bronze-500">Outil indicatif</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">Simuler une mensualité</h1>
            <p className="mt-4 text-[14px] leading-7 text-muted-foreground">Cette simulation aide à explorer un scénario de financement. Elle ne constitue ni une offre de crédit, ni un taux garanti, ni un pré-accord.</p>
            <div className="mt-8"><CreditSimulator sourcePage="/credit" defaultPrice={1_200_000} /></div>
          </div>
        </Container>
      </section>
      <SiteFooter />
    </main>
  );
}
