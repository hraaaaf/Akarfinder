import type { Metadata } from "next";
import { ProfessionalAudiencePage } from "@/components/pro/ProfessionalAudiencePage";

export const metadata: Metadata = {
  title: "AkarFinder Pro pour agences immobilières",
  description: "Structurez vos données de biens, leurs droits et leur complétude avant publication dans les expériences AkarFinder.",
};

export default function ProAgencesPage() {
  return <ProfessionalAudiencePage audience="agency" />;
}
