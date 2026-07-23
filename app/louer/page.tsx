import { LouerPageShell } from "@/components/location/LouerPageShell";
import { searchListings } from "@/lib/search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Louer au Maroc — AkarFinder",
  description:
    "Trouvez une location au Maroc selon votre budget mensuel et votre vie quotidienne. Résultats de location issus de sources publiques, repères indicatifs à confirmer auprès de la source.",
};

function parsePositiveNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default async function LouerPage({
  searchParams,
}: {
  searchParams: Promise<{
    property_type?: string;
    budget_max?: string;
    budget_min?: string;
  }>;
}) {
  const params = await searchParams;
  const propertyType = params.property_type;
  const minPrice = parsePositiveNumber(params.budget_min);
  const maxPrice = parsePositiveNumber(params.budget_max);

  let rentListings: Awaited<ReturnType<typeof searchListings>>["listings"] = [];
  let rentTotal: number | null = null;
  try {
    const result = await searchListings({
      transaction_type: "rent",
      limit: 6,
      ...(propertyType ? { property_type: propertyType } : {}),
      ...(minPrice != null ? { min_price: minPrice } : {}),
      ...(maxPrice != null ? { max_price: maxPrice } : {}),
    });
    rentListings = result.listings ?? [];
    rentTotal = result.total ?? null;
  } catch {
    // fallback: no listings shown, CTA tiles displayed
  }

  return (
    <LouerPageShell
      listings={rentListings}
      totalListings={rentTotal}
      selectedPropertyType={propertyType}
      selectedBudgetMax={params.budget_max}
      selectedBudgetMin={params.budget_min}
    />
  );
}
