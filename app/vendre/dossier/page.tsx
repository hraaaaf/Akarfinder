import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { SellerPropertyDraftForm } from "@/components/vendre/SellerPropertyDraftForm";
import { isListingPropertyType } from "@/lib/property-types/presentation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Décrire mon bien — Brouillon vendeur | AkarFinder",
  description:
    "Créez un brouillon structuré de votre bien à partir de vos déclarations, distinct de votre demande de contact et jamais publié automatiquement.",
};

export default async function VendreDossierPage({
  searchParams,
}: {
  searchParams?: Promise<{ property_type?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const initialPropertyType = isListingPropertyType(params.property_type)
    ? params.property_type
    : undefined;

  return (
    <main className="min-h-screen bg-[#fffdf8]">
      <SiteHeader variant="light" />
      <section className="pb-16 pt-12 lg:pb-20 lg:pt-16">
        <Container>
          <SellerPropertyDraftForm initialPropertyType={initialPropertyType} />
        </Container>
      </section>
      <SiteFooter />
    </main>
  );
}
