import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Immobilier neuf au Maroc — AkarFinder",
  description: "Parcourez directement les programmes et biens neufs disponibles au Maroc.",
  alternates: { canonical: "/neuf" },
};

export default async function NeufPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const target = new URLSearchParams({ transaction_type: "new" });

  for (const [key, rawValue] of Object.entries(params)) {
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value && key !== "transaction_type") target.set(key, value);
  }

  redirect(`/search?${target.toString()}`);
}
