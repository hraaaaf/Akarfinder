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
    alt: "Skyline de Casablanca avec la mosquée Hassan II",
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
    alt: "Vue urbaine de Rabat",
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
    alt: "Vue de Marrakech avec la Koutoubia",
    href: "/search?city=Marrakech",
    overlayFrom: "rgba(36,10,4,0.60)",
    gradient: "from-[#3d1808] to-[#8a380e]",
  },
  {
    slug: "fes",
    label: "Fès",
    tag: "Impériale & Patrimoine",
    description: "Médina historique, patrimoine vivant et tissu urbain à forte identité.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Bab_Bou_Jeloud-Fez.jpg/1280px-Bab_Bou_Jeloud-Fez.jpg",
    mark: "/brand/visual-system/city-fes.svg",
    alt: "Bab Boujloud, porte historique de la médina de Fès",
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
    alt: "Vue de la baie de Tanger",
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
    alt: "Vue de la corniche et de la baie d'Agadir",
    href: "/search?city=Agadir",
    overlayFrom: "rgba(6,28,38,0.58)",
    gradient: "from-[#083a56] to-[#0e5c82]",
  },
];
