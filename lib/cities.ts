export type CityConfig = {
  slug: string;
  label: string;
  tag: string;
  description: string;
  image: string | null;
  mark: string;
  alt: string;
  href: string;
  overlayFrom: string;
  gradient: string;
};

export const CITIES: CityConfig[] = [
  {
    slug: "casablanca",
    label: "Casablanca",
    tag: "Économique & Affaires",
    description: "Pôle économique, CBD moderne et quartiers d'affaires actifs.",
    image: "/images/cities/casablanca.jpg",
    mark: "/brand/visual-system/city-casablanca.svg",
    alt: "Repère AkarFinder de Casablanca : mosquée Hassan II et skyline de Casablanca Finance City",
    href: "/search?city=Casablanca",
    overlayFrom: "rgba(5,13,28,0.62)",
    gradient: "from-[#0f2746] to-[#1d4d8a]",
  },
  {
    slug: "rabat",
    label: "Rabat",
    tag: "Capitale & Administration",
    description: "Capitale administrative, quartiers résidentiels calmes et bien équipés.",
    image: "/images/cities/rabat.jpg",
    mark: "/brand/visual-system/city-rabat.svg",
    alt: "Repère AkarFinder de Rabat : nouveau stade Prince Moulay Abdellah et Tour Mohammed VI",
    href: "/search?city=Rabat",
    overlayFrom: "rgba(8,30,58,0.60)",
    gradient: "from-[#0e2e5c] to-[#1a5a8a]",
  },
  {
    slug: "marrakech",
    label: "Marrakech",
    tag: "Tourisme & Patrimoine",
    description: "Médina classée, Palmeraie et marché immobilier touristique porteur.",
    image: "/images/cities/marrakech.jpg",
    mark: "/brand/visual-system/city-marrakech.svg",
    alt: "Repère AkarFinder de Marrakech inspiré de la Koutoubia",
    href: "/search?city=Marrakech",
    overlayFrom: "rgba(36,10,4,0.60)",
    gradient: "from-[#3d1808] to-[#8a380e]",
  },
  {
    slug: "fes",
    label: "Fès",
    tag: "Impériale & Patrimoine",
    description: "Médina historique, patrimoine vivant et tissu urbain à forte identité.",
    image: null,
    mark: "/brand/visual-system/city-fes.svg",
    alt: "Repère AkarFinder de Fès inspiré de Bab Boujloud",
    href: "/search?city=Fès",
    overlayFrom: "rgba(8,30,58,0.60)",
    gradient: "from-[#0B1F3A] to-[#0B63CE]",
  },
  {
    slug: "tanger",
    label: "Tanger",
    tag: "Portuaire & International",
    description: "Porte de l'Europe, port stratégique et immobilier en forte croissance.",
    image: "/images/cities/tanger.jpg",
    mark: "/brand/visual-system/city-tanger.svg",
    alt: "Repère AkarFinder de Tanger : Kasbah, médina et baie",
    href: "/search?city=Tanger",
    overlayFrom: "rgba(6,14,32,0.62)",
    gradient: "from-[#0a1e42] to-[#103278]",
  },
  {
    slug: "agadir",
    label: "Agadir",
    tag: "Balnéaire & Détente",
    description: "Balnéaire atlantique, résidences secondaires et marché en expansion.",
    image: "/images/cities/agadir.jpg",
    mark: "/brand/visual-system/city-agadir.svg",
    alt: "Repère AkarFinder d'Agadir : Kasbah Oufella, relief et baie",
    href: "/search?city=Agadir",
    overlayFrom: "rgba(6,28,38,0.58)",
    gradient: "from-[#083a56] to-[#0e5c82]",
  },
];
