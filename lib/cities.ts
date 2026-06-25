export type CityConfig = {
  slug: string;
  label: string;
  tag: string;
  description: string;
  image: string | null;
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
    alt: "Skyline nocturne de Casablanca avec la mosquée Hassan II",
    href: "/search?city=Casablanca",
    overlayFrom: "rgba(5,13,28,0.62)",
    gradient: "from-[#0f2746] to-[#1d4d8a]",
  },
  {
    slug: "marrakech",
    label: "Marrakech",
    tag: "Tourisme & Patrimoine",
    description: "Médina classée, Palmeraie et marché immobilier touristique porteur.",
    image: "/images/cities/marrakech.jpg",
    alt: "Coucher de soleil sur Marrakech avec le minaret de la Koutoubia",
    href: "/search?city=Marrakech",
    overlayFrom: "rgba(36,10,4,0.60)",
    gradient: "from-[#3d1808] to-[#8a380e]",
  },
  {
    slug: "rabat",
    label: "Rabat",
    tag: "Capitale & Administration",
    description: "Capitale administrative, quartiers résidentiels calmes et bien équipés.",
    image: "/images/cities/rabat.jpg",
    alt: "Aube sur Rabat avec la Tour Hassan et le mausolée Mohammed V",
    href: "/search?city=Rabat",
    overlayFrom: "rgba(8,30,58,0.60)",
    gradient: "from-[#0e2e5c] to-[#1a5a8a]",
  },
  {
    slug: "tanger",
    label: "Tanger",
    tag: "Portuaire & International",
    description: "Porte de l'Europe, port stratégique et immobilier en forte croissance.",
    image: "/images/cities/tanger.jpg",
    alt: "Vue nocturne de la baie de Tanger avec la Casbah sur les hauteurs",
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
    alt: "La corniche d'Agadir, plage atlantique et kasbah sur les hauteurs",
    href: "/search?city=Agadir",
    overlayFrom: "rgba(6,28,38,0.58)",
    gradient: "from-[#083a56] to-[#0e5c82]",
  },
];
