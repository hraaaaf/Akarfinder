import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Biens à vendre au Maroc — AkarFinder",
  description: "Parcourez directement les biens à vendre au Maroc et affinez votre recherche par ville, type, prix et surface.",
  alternates: { canonical: "/acheter" },
};

export default async function AcheterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const target = new URLSearchParams({ transaction_type: "buy" });

  for (const [key, rawValue] of Object.entries(params)) {
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value && key !== "transaction_type") target.set(key, value);
  }

  redirect(`/search?${target.toString()}`);
}
