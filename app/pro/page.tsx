import type { Metadata } from "next";
import { ProPageV2 } from "@/components/pro/ProPageV2";

export const metadata: Metadata = {
  title: "AkarFinder Pro — Données immobilières structurées pour agences et promoteurs",
  description:
    "Programme pilote AkarFinder Pro pour structurer des données immobilières autorisées, améliorer les fiches et la recherche, puis qualifier la demande sans promesse de résultat.",
  alternates: { canonical: "/pro" },
};

export default function ProPage() {
  return <ProPageV2 />;
}
