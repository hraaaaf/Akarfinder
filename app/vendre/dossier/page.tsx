import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { SellerLeadForm } from "@/components/vendre/SellerLeadForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Préparer ma vente — Dossier vendeur indicatif | AkarFinder",
  description:
    "Décrivez votre bien pour recevoir des repères de marché et une demande d'accompagnement à la vente au Maroc. Demande indicative — non contractuelle.",
};

export default function VendreDossierPage() {
  return (
    <main className="min-h-screen bg-[#fffdf8]">
      <SiteHeader variant="light" />

      <section className="pt-12 pb-16 lg:pt-16 lg:pb-20">
        <Container>
          <SellerLeadForm />
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
