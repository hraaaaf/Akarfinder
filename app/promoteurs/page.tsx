import { PromoteursPageShell } from "@/components/promoteurs/PromoteursPageShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Promoteurs — Présentez vos projets sur AkarFinder",
  description:
    "Pages de projets premium, leads qualifiés, reporting indicatif et présence salon. Données fournies par le promoteur — sans promesse de volume ni garantie de résultats.",
};

export default function PromoteursPage() {
  return <PromoteursPageShell />;
}
