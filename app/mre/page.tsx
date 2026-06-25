import { Calendar, Heart, MessageCircle, Scale, Shield } from "lucide-react";
import { IntentPageShell } from "@/components/intent/IntentPageShell";

export const metadata = {
  title: "Acheter au Maroc depuis l'étranger — AkarFinder MRE",
  description: "AkarFinder aide les Marocains résidant à l'étranger à acheter à distance : shortlist, comparateur, WhatsApp, demande de visite et dossier acheteur indicatif.",
};

export default function MrePage() {
  return (
    <IntentPageShell
      badge="MRE — Achat à distance"
      badgeColor="text-violet-300"
      title="Acheter au Maroc depuis l'étranger"
      subtitle="Constituez votre shortlist à distance, comparez les biens et contactez directement les vendeurs ou agences via WhatsApp. AkarFinder est pensé pour les acheteurs qui ne peuvent pas se déplacer à chaque visite."
      heroCtas={[
        { label: "Créer mon dossier acheteur", href: "/onboarding", variant: "ghost" },
        { label: "Comparer des biens", href: "/compare", variant: "ghost" },
        { label: "Demander une visite", href: "/search", variant: "ghost" },
      ]}
      whyTitle="Acheter à distance avec plus de confiance"
      blocks={[
        {
          icon: <Heart size={20} strokeWidth={2.2} />,
          iconBg: "bg-red-500",
          title: "Shortlist depuis l'étranger",
          body: "Sauvegardez les biens qui vous correspondent dans votre shortlist personnelle. Retrouvez-les à tout moment pour comparer, partager ou demander une visite à distance.",
          cta: { label: "Mes favoris", href: "/favorites" },
        },
        {
          icon: <Scale size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#4c1d95]",
          title: "Comparer avant de se déplacer",
          body: "Comparez jusqu'à 4 biens sur surface, prix/m² et signaux de fiabilité avant de prendre l'avion. Évitez les déplacements non qualifiés grâce au comparateur.",
          cta: { label: "Ouvrir le comparateur", href: "/compare" },
        },
        {
          icon: <MessageCircle size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#16a34a]",
          title: "Contact WhatsApp direct",
          body: "Depuis chaque fiche bien, contactez le vendeur ou l'agence directement via WhatsApp. Coordonnées fournies par la source d'origine — à vérifier avant déplacement.",
          cta: { label: "Explorer les biens", href: "/search" },
        },
        {
          icon: <Calendar size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#6d28d9]",
          title: "Demande de visite à distance",
          body: "Demandez une visite planifiée depuis chaque fiche bien. Précisez votre disponibilité et les coordonnées permettant un contact à distance ou une visite virtuelle.",
          cta: { label: "Voir les biens", href: "/search" },
        },
        {
          icon: <Shield size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#1e40af]",
          title: "Signaux de fiabilité",
          body: "Score de complétude, cohérence du prix observé et détection de doublons : des repères pour trier plus vite depuis l'étranger. À confirmer avec un interlocuteur local avant engagement.",
          cta: { label: "Explorer les biens", href: "/search" },
        },
      ]}
      callout={{
        title: "Préparez votre projet à distance",
        body: "Créez un dossier acheteur indicatif pour clarifier votre fourchette de budget, vos critères et vos préférences de ville. Un point de départ pour vos échanges avec vendeurs et agences.",
        cta: { label: "Créer mon dossier acheteur", href: "/onboarding" },
      }}
      disclaimer="Les informations affichées sur AkarFinder proviennent d'annonces publiques analysées et de données partenaires. Elles constituent des repères indicatifs, à confirmer impérativement avec un professionnel local (notaire, agence agréée) avant tout engagement immobilier depuis l'étranger."
    />
  );
}
