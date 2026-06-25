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

type Props = { searchParams: Promise<{ listing?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const { listing } = await searchParams;

  return (
    <main className="min-h-screen bg-[#fffdf8]">
      <SiteHeader variant="light" />

      <section className="pt-12 pb-16 lg:pt-16 lg:pb-20">
        <Container>
          <BuyerOnboardingFlow listingId={listing} />
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
