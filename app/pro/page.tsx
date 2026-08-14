import type { Metadata } from "next";
import { ProPageV2 } from "@/components/pro/ProPageV2";

export const metadata: Metadata = {
  title: "AkarFinder Pro — Données immobilières structurées pour agences et promoteurs",
  description:
    "Programme pilote AkarFinder Pro pour structurer des données immobilières autorisées, améliorer les fiches et la recherche, puis qualifier la demande sans promesse de résultat.",
  alternates: { canonical: "/pro" },
};

type Props = {
  searchParams: Promise<{ type?: string; source?: string }>;
};

export default async function ProPage({ searchParams }: Props) {
  const { type, source } = await searchParams;
  const initialType = type === "agence" || type === "promoteur" || type === "exposant" ? type : undefined;
  const sourcePage = source === "agency" ? "/pro/agences" : source === "promoter" ? "/promoteurs" : "/pro";
  return <ProPageV2 initialType={initialType} sourcePage={sourcePage} />;
}
