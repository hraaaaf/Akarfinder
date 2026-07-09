import Link from "next/link";
import type { NeighborhoodMetadata } from "@/lib/seo-neighborhood-pages/types";

type Props = {
  neighborhood: NeighborhoodMetadata;
};

export function NeighborhoodSearchCtas({ neighborhood: n }: Props) {
  const intents = [
    {
      label: "Acheter",
      query: encodeURIComponent(`acheter ${n.displayName} ${n.cityDisplayName}`),
    },
    {
      label: "Louer",
      query: encodeURIComponent(`location ${n.displayName} ${n.cityDisplayName}`),
    },
  ];

  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Par intention
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {intents.map((intent) => (
              <Link
                key={intent.label}
                href={`/search?q=${intent.query}`}
                className="rounded-lg border border-blue-200 bg-blue-50 p-4 transition hover:bg-blue-100"
              >
                <p className="font-semibold text-blue-900">{intent.label}</p>
                <p className="mt-1 text-sm text-blue-700">
                  Rechercher des annonces à {n.displayName}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Par type de bien
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {n.propertyTypes.map((type) => (
              <Link
                key={type}
                href={`/search?q=${encodeURIComponent(`${type} ${n.displayName} ${n.cityDisplayName}`)}`}
                className="rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:bg-slate-50"
              >
                <p className="text-sm font-semibold capitalize text-slate-900">
                  {type}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
