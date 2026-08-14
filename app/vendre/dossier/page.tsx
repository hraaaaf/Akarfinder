import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { SellerSecurePublishForm } from "@/components/vendre/SellerSecurePublishForm";
import { isListingPropertyType } from "@/lib/property-types/presentation";
import type { SellerIntent } from "@/lib/seller/readiness";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Décrire mon bien | AkarFinder",
  description:
    "Préparez un dossier clair et complet pour publier, estimer ou confier votre bien à un professionnel.",
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
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />
      <section className="pb-20 pt-8 sm:pt-12">
        <Container>
          <div className="min-w-0 [&>div]:min-w-0 [&>div>section]:min-w-0">
            <SellerSecurePublishForm
              initialPropertyType={initialPropertyType}
              initialIntent={initialIntent}
            />
          </div>
        </Container>
      </section>
      <SiteFooter />
    </main>
  );
}
