import { Calendar, Heart, Scale, Search, ShieldCheck } from "lucide-react";
import { IntentPageShell } from "@/components/intent/IntentPageShell";

export const metadata = {
  title: "Acheter au Maroc — AkarFinder",
  description: "Recherchez, comparez et shortlistez des biens immobiliers au Maroc avec des signaux de fiabilité lisibles avant de contacter.",
};

export default function AcheterPage() {
  return (
    <IntentPageShell
      badge="Achat immobilier"
      badgeColor="text-bronze-400"
      title="Acheter au Maroc avec méthode"
      subtitle="AkarFinder centralise les annonces de plusieurs sources, regroupées et filtrées pour vous aider à comparer avant de contacter. Les signaux affichés sont indicatifs — à confirmer avant décision."
      heroCtas={[
        { label: "Rechercher un bien", href: "/search", variant: "ghost" },
        { label: "Comparer des biens", href: "/compare", variant: "ghost" },
        { label: "Créer mon dossier acheteur", href: "/onboarding", variant: "ghost" },
      ]}
      whyTitle="Acheter avec plus de méthode"
      blocks={[
        {
          icon: <Search size={20} strokeWidth={2.2} />,
          iconBg: "bg-deepblue",
          title: "Recherche multi-sources",
          body: "Annonces publiques analysées depuis plusieurs canaux marocains. Filtrez par ville, budget, surface et type de bien sans changer de plateforme.",
          cta: { label: "Lancer une recherche", href: "/search" },
        },
        {
          icon: <Scale size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#1a4a8a]",
          title: "Comparateur de biens",
          body: "Ajoutez jusqu'à 4 biens au comparateur et analysez surface, prix/m² et signaux de fiabilité côte à côte avant de prendre contact.",
          cta: { label: "Comparer maintenant", href: "/compare" },
        },
        {
          icon: <Heart size={20} strokeWidth={2.2} />,
          iconBg: "bg-red-500",
          title: "Shortlist personnelle",
          body: "Sauvegardez les biens qui vous intéressent dans votre shortlist. Retrouvez-les, comparez-les ou demandez une visite sans perdre le fil.",
          cta: { label: "Voir mes favoris", href: "/favorites" },
        },
        {
          icon: <ShieldCheck size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#15803d]",
          title: "Signaux de fiabilité",
          body: "Score de complétude, cohérence du prix observé et détection de doublons possibles. Des repères indicatifs pour affiner votre sélection.",
          cta: { label: "Explorer les biens", href: "/search" },
        },
        {
          icon: <Calendar size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#7c3aed]",
          title: "Demande de visite",
          body: "Depuis chaque fiche bien, demandez une visite ou contactez directement via WhatsApp. Les coordonnées proviennent de la source d'origine.",
          cta: { label: "Voir les biens", href: "/search" },
        },
      ]}
      callout={{
        title: "Pas sûr de votre budget ?",
        body: "Renseignez votre fourchette indicative pour que les biens affichés correspondent mieux à votre profil. Les estimations restent des repères, à confirmer avant tout engagement.",
        cta: { label: "Créer mon dossier acheteur", href: "/onboarding" },
      }}
      disclaimer="Les prix affichés sont observés sur des annonces publiques analysées. Ils constituent des repères indicatifs et non des prix officiels. À confirmer avant toute décision d'achat."
    />
  );
}
