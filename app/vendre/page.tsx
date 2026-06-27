import { VendrePageShell } from "@/components/vendre/VendrePageShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendre au Maroc — Préparez votre vente | AkarFinder",
  description:
    "Estimation indicative, prix observés, annonces similaires et repères de marché pour préparer la vente de votre bien au Maroc. Repères indicatifs — à confirmer avant décision.",
};

export default function VendrePage() {
  return <VendrePageShell />;
}
