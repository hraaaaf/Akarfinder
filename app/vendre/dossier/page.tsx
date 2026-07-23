import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { SellerPropertyDraftForm } from "@/components/vendre/SellerPropertyDraftForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Décrire mon bien — Brouillon vendeur | AkarFinder",
  description:
    "Créez un brouillon structuré de votre bien à partir de vos déclarations, distinct de votre demande de contact et jamais publié automatiquement.",
};

export default function VendreDossierPage() {
  return (
    <main className="min-h-screen bg-[#fffdf8]">
      <SiteHeader variant="light" />
      <section className="pb-16 pt-12 lg:pb-20 lg:pt-16">
        <Container>
          <SellerPropertyDraftForm />
        </Container>
      </section>
      <SiteFooter />
    </main>
  );
}
