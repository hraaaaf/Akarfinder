import { NeufPageShell } from "@/components/neuf/NeufPageShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Programmes neufs au Maroc — AkarFinder",
  description:
    "Projets partenaires, typologies, prix à partir de et contact promoteur. Informations fournies par les promoteurs, à confirmer directement auprès d'eux avant engagement.",
};

export default function NeufPage() {
  return <NeufPageShell />;
}
