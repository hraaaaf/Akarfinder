import { NeufPageShellV2 } from "@/components/neuf/NeufPageShellV2";
import "./p1-polish.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Immobilier neuf au Maroc — AkarFinder",
  description:
    "Recherchez les offres immobilières neuves disponibles dans le moteur AkarFinder. Les démonstrations promoteur restent séparées de l'inventaire réel et clairement identifiées comme exemples.",
};

export default function NeufPage() {
  return (
    <div data-p1-neuf>
      <NeufPageShellV2 />
    </div>
  );
}
