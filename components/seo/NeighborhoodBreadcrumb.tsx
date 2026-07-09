import Link from "next/link";
import type { NeighborhoodMetadata } from "@/lib/seo-neighborhood-pages/types";

type Props = {
  neighborhood: NeighborhoodMetadata;
};

export function NeighborhoodBreadcrumb({ neighborhood: n }: Props) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="border-b border-slate-200 bg-white px-4 py-3"
    >
      <ol className="mx-auto flex max-w-3xl items-center gap-2 text-sm text-slate-600">
        <li>
          <Link href="/immobilier" className="hover:text-blue-700">
            Immobilier
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link
            href={`/immobilier/${n.citySlug}`}
            className="hover:text-blue-700"
          >
            {n.cityDisplayName}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="font-semibold text-slate-900">{n.displayName}</li>
      </ol>
    </nav>
  );
}
