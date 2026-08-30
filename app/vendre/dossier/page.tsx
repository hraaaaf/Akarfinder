import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { SellerSecurePublishForm } from "@/components/vendre/SellerSecurePublishForm";
import { isListingPropertyType } from "@/lib/property-types/presentation";
import type { SellerIntent } from "@/lib/seller/readiness";
import "./p0-polish.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Créer mon annonce AkarFinder | AkarFinder",
  description:
    "Construisez une annonce immobilière riche, structurée et vérifiable avant toute mise en ligne.",
};

const SELLER_INTENTS: SellerIntent[] = ["publish", "estimate", "professional"];

export default async function VendreDossierPage({
  searchParams,
}: {
  searchParams?: Promise<{ property_type?: string; intent?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const initialPropertyType = isListingPropertyType(params.property_type)
    ? params.property_type
    : undefined;
  const initialIntent = SELLER_INTENTS.includes(params.intent as SellerIntent)
    ? (params.intent as SellerIntent)
    : "publish";

  return (
    <main className="min-h-screen bg-[#F6FAFD] text-foreground">
      <SiteHeader compact />
      <section className="pb-20 pt-5 sm:pt-8">
        <Container fluid>
          <SellerSecurePublishForm
            initialPropertyType={initialPropertyType}
            initialIntent={initialIntent}
          />
        </Container>
      </section>
      <SiteFooter />
    </main>
  );
}
