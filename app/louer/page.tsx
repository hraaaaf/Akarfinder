import { LouerPageShell } from "@/components/location/LouerPageShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Louer au Maroc — AkarFinder",
  description:
    "Trouvez une location au Maroc selon votre budget mensuel et votre vie quotidienne. Annonces de locations analysées, repères indicatifs à confirmer auprès de la source.",
};

export default function LouerPage() {
  return <LouerPageShell />;
}
