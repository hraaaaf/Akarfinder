import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mon Projet — AkarFinder",
  description:
    "Construisez Mon Projet AkarFinder : objectif, budget, zones, critères et priorités.",
  alternates: {
    canonical: "/mon-projet",
  },
  robots: {
    index: false,
    follow: true,
  },
};

/**
 * Legacy search-profile surface kept only for compatibility with old links and
 * bookmarks. Mon Projet is the single canonical destination and product name.
 */
export default function SearchProfilePage() {
  redirect("/mon-projet");
}
