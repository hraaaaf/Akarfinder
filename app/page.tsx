import { GoogleLikeHero } from "@/components/home/GoogleLikeHero";
import { HomeActionGrid } from "@/components/home/HomeActionGrid";
import { HomeListingsSection } from "@/components/home/HomeListingsSection";
import { CityIntentGrid } from "@/components/landing/CityIntentGrid";
import { SignatureMapSection } from "@/components/landing/SignatureMapSection";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default async function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="light" compact />
      <GoogleLikeHero />
      <CityIntentGrid />
      <HomeListingsSection />
      <SignatureMapSection />
      <HomeActionGrid />
      <SiteFooter />
    </main>
  );
}
