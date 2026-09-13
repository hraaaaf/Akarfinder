export const PRODUCT_PRIMARY_NAV = [
  { href: "/acheter", label: "Acheter" },
  { href: "/louer", label: "Louer" },
  { href: "/neuf", label: "Neuf" },
  { href: "/map", label: "Vivre ici" },
  { href: "/vendre", label: "Vendre" },
  { href: "/pro", label: "Pro" },
] as const;

export const PRODUCT_UTILITY_NAV = {
  search: { href: "/search", label: "Explorer" },
  favorites: { href: "/favorites", label: "Favoris" },
  project: { href: "/mon-projet", label: "Mon Projet" },
} as const;

export const PRODUCT_MOBILE_BOTTOM_NAV = [
  { href: "/search", label: "Explorer", activePrefixes: ["/search", "/acheter", "/louer", "/neuf", "/immobilier", "/listings"] },
  { href: "/favorites", label: "Favoris", activePrefixes: ["/favorites", "/compare"] },
  { href: "/map", label: "Vivre ici", activePrefixes: ["/map"] },
  { href: "/vendre", label: "Vendre", activePrefixes: ["/vendre"] },
  { href: "/mon-projet", label: "Mon Projet", activePrefixes: ["/mon-projet", "/profil-recherche", "/onboarding", "/compagnon"] },
] as const;

export function isPrimaryProductPath(pathname: string, href: string): boolean {
  if (href === "/pro") return pathname.startsWith("/pro") || pathname.startsWith("/promoteurs");
  if (href === "/neuf") return pathname.startsWith("/neuf") || pathname.startsWith("/projets/");
  if (href === "/map") return pathname.startsWith("/map");
  return pathname === href || pathname.startsWith(`${href}/`);
}
