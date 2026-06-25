import { BarChart2, Building2, CalendarDays, FileText, Users } from "lucide-react";
import { IntentPageShell } from "@/components/intent/IntentPageShell";

export const metadata = {
  title: "Promoteurs partenaires — AkarFinder",
  description: "AkarFinder référence des projets immobiliers neufs de promoteurs partenaires au Maroc. Pages projet dédiées, leads qualifiés, présence à Sakan Expo.",
};

export default function PromoteursPage() {
  return (
    <IntentPageShell
      badge="Espace Promoteurs"
      badgeColor="text-amber-300"
      title="Rejoindre l'écosystème AkarFinder"
      subtitle="AkarFinder propose aux promoteurs immobiliers marocains un espace dédié pour référencer leurs projets, accéder à des acheteurs qualifiés et préparer leur présence aux événements sectoriels."
      heroCtas={[
        { label: "Découvrir AkarFinder Pro", href: "/pro", variant: "ghost" },
        { label: "Demander une page promoteur", href: "/pro", variant: "ghost" },
        { label: "Préparer une campagne Sakan Expo", href: "/pro", variant: "ghost" },
      ]}
      whyTitle="Ce qu'AkarFinder propose aux promoteurs"
      blocks={[
        {
          icon: <Building2 size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#92400e]",
          title: "Page projet dédiée",
          body: "Chaque projet partenaire dispose d'une fiche dédiée : typologies, prix à partir de, brochure, photos et formulaire de contact direct. Contenu fourni et validé par le promoteur.",
          cta: { label: "Voir l'espace Pro", href: "/pro" },
        },
        {
          icon: <Users size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#b45309]",
          title: "Leads qualifiés",
          body: "Les acheteurs qui consultent les projets neufs ont une intention déclarée. Leurs demandes de contact ou de brochure sont transmises directement au promoteur partenaire.",
          cta: { label: "Voir l'espace Pro", href: "/pro" },
        },
        {
          icon: <BarChart2 size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#78350f]",
          title: "Reporting projet",
          body: "Suivez les vues, demandes de brochure et contacts générés par votre page projet. Reporting simple et lisible, accessible depuis l'espace Pro. Disponible dans les prochaines versions.",
        },
        {
          icon: <CalendarDays size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#1d4ed8]",
          title: "Sakan Expo & événements",
          body: "Participez aux prochaines éditions de Sakan Expo avec AkarFinder comme partenaire digital. Visibilité pré-événement, page projet dédiée et présence sur les supports de l'événement.",
          cta: { label: "Préparer une campagne", href: "/pro" },
        },
        {
          icon: <FileText size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#c2410c]",
          title: "Brochure & supports numériques",
          body: "Mettez à disposition votre brochure projet, plans et visuels directement depuis votre page AkarFinder. Téléchargeable par les acheteurs intéressés à tout moment.",
        },
      ]}
      callout={{
        title: "Référencez votre projet sur AkarFinder",
        body: "Contactez l'équipe AkarFinder pour discuter du référencement de vos projets neufs, de la création de votre page promoteur et de vos objectifs de visibilité auprès des acheteurs qualifiés.",
        cta: { label: "Accéder à l'espace Pro", href: "/pro" },
      }}
      disclaimer="AkarFinder ne garantit aucun volume de leads, aucun résultat commercial et aucune exclusivité territoriale. Les conditions d'accès à l'espace promoteurs sont définies dans les conditions générales de service. Les informations de projets sont publiées sous la responsabilité du promoteur."
    />
  );
}
