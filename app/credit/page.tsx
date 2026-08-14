import type { Metadata } from "next";

import { CreditSimulator } from "@/components/credit/CreditSimulator";
import { SecondaryPageShell } from "@/components/layout/SecondaryPageShell";

export const metadata: Metadata = {
  title: "Simulateur de financement indicatif — AkarFinder",
  description: "Estimez une mensualité à titre indicatif. Simulation non contractuelle, à confirmer auprès d'un organisme de financement.",
};

export default function CreditPage() {
  return (
    <SecondaryPageShell
      eyebrow="Outil indicatif"
      title="Simuler une mensualité"
      intro="Explorez un scénario de financement à titre indicatif. Cette simulation ne constitue ni une offre de crédit, ni un taux garanti, ni un pré-accord."
    >
      <CreditSimulator sourcePage="/credit" defaultPrice={1_200_000} />
    </SecondaryPageShell>
  );
}
