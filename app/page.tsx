import { ProductHero } from "@/components/landing/ProductHero";
import { MarketPulse } from "@/components/landing/MarketPulse";
import { WhySection } from "@/components/landing/WhySection";
import { DataProofBlock } from "@/components/landing/DataProofBlock";
import { CityIntentGrid } from "@/components/landing/CityIntentGrid";
import { SignatureMapSection } from "@/components/landing/SignatureMapSection";
import { ListingPreview } from "@/components/landing/ListingPreview";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MreTrustSection } from "@/components/landing/MreTrustSection";
import { HomeFinalCTA } from "@/components/landing/HomeFinalCTA";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Reveal } from "@/components/ui/Reveal";

export default async function HomePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <SiteHeader variant="transparent" />
      <ProductHero />
      <MarketPulse />
      <Reveal><WhySection /></Reveal>
      <DataProofBlock />
      <Reveal><CityIntentGrid /></Reveal>
      <SignatureMapSection />
      <Reveal><ListingPreview /></Reveal>
      <Reveal><HowItWorks /></Reveal>
      <Reveal><MreTrustSection /></Reveal>
      <HomeFinalCTA />
      <SiteFooter />
    </main>
  );
}
