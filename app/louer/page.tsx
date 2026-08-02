import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Biens à louer au Maroc — AkarFinder",
  description: "Parcourez directement les biens à louer au Maroc et affinez votre recherche par ville, type, budget et surface.",
  alternates: { canonical: "/louer" },
};

export default async function LouerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const target = new URLSearchParams({ transaction_type: "rent" });

  for (const [key, rawValue] of Object.entries(params)) {
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (!value || key === "transaction_type") continue;
    if (key === "budget_min") target.set("min_price", value);
    else if (key === "budget_max") target.set("max_price", value);
    else target.set(key, value);
  }

  redirect(`/search?${target.toString()}`);
}
