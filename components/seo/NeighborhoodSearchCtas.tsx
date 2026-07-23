import Link from "next/link";
import type { NeighborhoodMetadata } from "@/lib/seo-neighborhood-pages/types";

type Props = { neighborhood: NeighborhoodMetadata };

export function NeighborhoodSearchCtas({ neighborhood: n }: Props) {
  const city = encodeURIComponent(n.cityDisplayName);
  const q = encodeURIComponent(n.displayName);
  const base = `/search?city=${city}&q=${q}`;

  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-extrabold text-slate-900">Rechercher à {n.displayName}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href={`${base}&transaction_type=buy`} className="rounded-lg border border-slate-200 bg-white p-4 font-semibold text-slate-900 transition hover:border-blue-300 hover:bg-blue-50">Acheter</Link>
          <Link href={`${base}&transaction_type=rent`} className="rounded-lg border border-slate-200 bg-white p-4 font-semibold text-slate-900 transition hover:border-blue-300 hover:bg-blue-50">Louer</Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {n.propertyTypes.map((type) => <Link key={type} href={`${base}&property_type=${encodeURIComponent(type)}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold capitalize text-slate-700">{type}</Link>)}
        </div>
      </div>
    </section>
  );
}
