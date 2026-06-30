import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { BuyerOnboardingFlow } from "@/components/onboarding/BuyerOnboardingFlow";

export const metadata: Metadata = {
  title: "Dossier acheteur indicatif — AkarFinder",
  description:
    "Créez votre profil de recherche immobilière au Maroc en 6 étapes. Budget estimatif, zone, type de bien, timing. Dossier indicatif — non contractuel.",
};

type Props = { searchParams: Promise<{ listing?: string; intent?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const { listing, intent } = await searchParams;

  const sourcePage =
    intent === "acheter" ? "/acheter" :
    intent === "louer"   ? "/louer"   :
    "/onboarding";

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader variant="light" />

      <section className="pt-12 pb-16 lg:pt-16 lg:pb-20">
        <Container>
          <BuyerOnboardingFlow listingId={listing} intent={intent} sourcePage={sourcePage} />
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
