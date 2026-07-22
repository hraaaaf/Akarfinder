import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Créer mon projet de recherche — AkarFinder",
  description:
    "Construisez votre projet immobilier avec le Compagnon AkarFinder : objectif, budget, zones, critères et priorités.",
  alternates: {
    canonical: "/compagnon",
  },
  robots: {
    index: false,
    follow: true,
  },
};

/**
 * Legacy 8-step search-profile surface retired in favor of the Companion.
 * Keep the route as a compatibility redirect so old links/bookmarks do not
 * create a second, diverging buyer-profile journey.
 */
export default function SearchProfilePage() {
  redirect("/compagnon");
}
