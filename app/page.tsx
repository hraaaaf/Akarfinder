import { GoogleLikeHero } from "@/components/home/GoogleLikeHero";
import { MarketPulse } from "@/components/landing/MarketPulse";
import { WhySection } from "@/components/landing/WhySection";
import { DataProofBlock } from "@/components/landing/DataProofBlock";
import { CityIntentGrid } from "@/components/landing/CityIntentGrid";
import { SignatureMapSection } from "@/components/landing/SignatureMapSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MreTrustSection } from "@/components/landing/MreTrustSection";
import { HomeFinalCTA } from "@/components/landing/HomeFinalCTA";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default async function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="transparent" compact />

      {/* ── Hero moteur de recherche (remplace ProductHero) ── */}
      <GoogleLikeHero />

      {/* ── Repères récents (moteur pur — sources autorisées uniquement) ── */}
      <MarketPulse />

      <WhySection />
      <DataProofBlock />
      <CityIntentGrid />
      <SignatureMapSection />

      <HowItWorks />
      <MreTrustSection />
      <HomeFinalCTA />
      <SiteFooter />
    </main>
  );
}
