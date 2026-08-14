import type { Metadata } from "next";
import { ProfessionalAudiencePage } from "@/components/pro/ProfessionalAudiencePage";

export const metadata: Metadata = {
  title: "AkarFinder Pro pour promoteurs immobiliers",
  description: "Structurez projets, typologies, prix, plans, médias et droits avant publication dans les expériences AkarFinder.",
  alternates: { canonical: "/promoteurs" },
};

export default function PromoteursPage() {
  return <ProfessionalAudiencePage audience="promoter" />;
}
