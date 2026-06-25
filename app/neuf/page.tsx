import { Building2, FileText, LayoutGrid, MessageSquare, Phone } from "lucide-react";
import { IntentPageShell } from "@/components/intent/IntentPageShell";

export const metadata = {
  title: "Immobilier neuf au Maroc — AkarFinder",
  description: "Découvrez des projets immobiliers neufs au Maroc. Promoteurs partenaires, programmes résidentiels, informations à confirmer auprès du promoteur.",
};

export default function NeufPage() {
  return (
    <IntentPageShell
      badge="Immobilier neuf"
      badgeColor="text-amber-400"
      title="Programmes neufs & projets promoteurs"
      subtitle="Projets partenaires référencés sur AkarFinder. Informations fournies par les promoteurs, à confirmer directement auprès d'eux avant tout engagement. Prix à partir de, hors frais."
      heroCtas={[
        { label: "Découvrir les projets neufs", href: "/search?type=new", variant: "ghost" },
        { label: "Contacter un promoteur", href: "/promoteurs", variant: "ghost" },
        { label: "Créer une demande acheteur", href: "/onboarding", variant: "ghost" },
      ]}
      whyTitle="Ce que vous trouverez ici"
      blocks={[
        {
          icon: <Building2 size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#b45309]",
          title: "Projets partenaires",
          body: "Programmes résidentiels neufs référencés avec l'accord des promoteurs. Les informations affichées sont fournies par le promoteur et constituent des données partenaires à confirmer.",
          cta: { label: "Voir les projets", href: "/search?type=new" },
        },
        {
          icon: <LayoutGrid size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#92400e]",
          title: "Typologies disponibles",
          body: "Appartements, villas, duplex, commerces. Chaque programme affiche les typologies, surfaces indicatives et prix à partir de. Informations à confirmer auprès du promoteur.",
          cta: { label: "Explorer les typologies", href: "/search?type=new" },
        },
        {
          icon: <FileText size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#78350f]",
          title: "Brochure promoteur",
          body: "Certains projets partenaires proposent une brochure fournie par le promoteur. Téléchargeable directement depuis la fiche projet. Contenu sous la responsabilité du promoteur.",
        },
        {
          icon: <Phone size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#c2410c]",
          title: "Contact direct promoteur",
          body: "Depuis chaque fiche projet partenaire, contactez le promoteur directement via WhatsApp ou formulaire. Les coordonnées sont fournies par le promoteur.",
          cta: { label: "Voir les projets", href: "/search?type=new" },
        },
        {
          icon: <MessageSquare size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#1d4ed8]",
          title: "Demande acheteur qualifiée",
          body: "Créez un dossier acheteur indicatif pour faciliter votre premier contact avec un promoteur partenaire. Le dossier est transmis à titre de repère, sans engagement.",
          cta: { label: "Créer mon dossier", href: "/onboarding" },
        },
      ]}
      callout={{
        title: "Vous êtes promoteur ?",
        body: "Référencez vos projets sur AkarFinder et accédez à des acheteurs qualifiés. Pages projet dédiées, leads ciblés et présence aux événements sectoriels comme Sakan Expo.",
        cta: { label: "Découvrir l'espace promoteurs", href: "/promoteurs" },
      }}
      disclaimer="Les informations affichées sur les projets neufs sont fournies par les promoteurs partenaires (données partenaires). Prix à partir de, hors frais notariaux et charges. À confirmer directement auprès du promoteur avant tout engagement. AkarFinder n'est pas partie à la transaction."
    />
  );
}
