import { BarChart2, Map, Scale, TrendingUp, TriangleAlert } from "lucide-react";
import { IntentPageShell } from "@/components/intent/IntentPageShell";

export const metadata = {
  title: "Investir au Maroc — AkarFinder",
  description: "Signaux de marché indicatifs pour l'immobilier au Maroc : prix/m² observés, comparaison par quartier, volume d'annonces. Repères à confirmer avant décision.",
};

export default function InvestirPage() {
  return (
    <IntentPageShell
      badge="Signaux de marché"
      badgeColor="text-emerald-400"
      title="Repères de marché indicatifs au Maroc"
      subtitle="AkarFinder agrège des prix observés sur des annonces publiques analysées. Ces données constituent des repères indicatifs, non des conseils financiers. À confirmer avant toute décision d'investissement."
      heroCtas={[
        { label: "Comparer des biens", href: "/compare", variant: "ghost" },
        { label: "Explorer par ville", href: "/map", variant: "ghost" },
        { label: "Voir les prix observés", href: "/search", variant: "ghost" },
      ]}
      whyTitle="Signaux disponibles sur AkarFinder"
      blocks={[
        {
          icon: <TrendingUp size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#15803d]",
          title: "Prix/m² observés",
          body: "Prix médian et moyen par m² calculés sur les annonces publiques analysées dans une zone donnée. Ces repères sont indicatifs et varient selon la qualité et la fraîcheur des annonces.",
          cta: { label: "Voir les prix", href: "/search" },
        },
        {
          icon: <Scale size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#166534]",
          title: "Comparaison multi-biens",
          body: "Comparez jusqu'à 4 biens simultanément sur leur surface, prix/m², score de fiabilité et score de complétude. Un outil de tri, pas une recommandation.",
          cta: { label: "Ouvrir le comparateur", href: "/compare" },
        },
        {
          icon: <BarChart2 size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#14532d]",
          title: "Volume d'annonces par zone",
          body: "Le nombre d'annonces actives dans un quartier ou une ville est un signal de tension du marché. Affiché à titre indicatif — non représentatif du volume réel de transactions.",
          cta: { label: "Explorer", href: "/search" },
        },
        {
          icon: <Map size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#065f46]",
          title: "Carte des biens",
          body: "Visualisez la répartition géographique des annonces par ville, quartier et fourchette de prix. Repère visuel uniquement — non corrigé des doublons ni des annonces expirées.",
          cta: { label: "Ouvrir la carte", href: "/map" },
        },
        {
          icon: <TriangleAlert size={20} strokeWidth={2.2} />,
          iconBg: "bg-[#b45309]",
          title: "Ce que AkarFinder ne fait pas",
          body: "AkarFinder ne donne pas de conseil d'investissement, ne garantit aucun rendement locatif et ne recommande automatiquement aucun bien. Les repères affichés ne se substituent pas à une expertise notariale ou financière.",
        },
      ]}
      callout={{
        title: "Explorer par ville",
        body: "Comparez les prix/m² observés dans les principales villes marocaines. Repères issus des annonces publiques analysées — à confirmer avant décision.",
        cta: { label: "Explorer la carte", href: "/map" },
      }}
      disclaimer="AkarFinder n'est pas un conseiller financier. Les prix affichés sont des prix observés sur des annonces publiques analysées, à titre de repères indicatifs uniquement. Aucun rendement locatif, aucune plus-value et aucun résultat d'investissement ne sont garantis ni estimés. Consultez un professionnel avant toute décision d'investissement immobilier."
    />
  );
}
