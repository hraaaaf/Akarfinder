// ZILLOW-LIKE-PROPERTY-DETAIL-DEMO-1
// Categorized "nearby places" list — fictional, vague on purpose (no precise
// walking minutes since the underlying data is not real/computed).
import { MapPin } from "lucide-react";

type DemoNearbyPlacesProps = {
  categories: ReadonlyArray<{ category: string; items: ReadonlyArray<string> }>;
  className?: string;
};

export function DemoNearbyPlaces({ categories, className = "" }: DemoNearbyPlacesProps) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {categories.map((c) => (
        <div key={c.category} className="rounded-2xl border border-[#e4e9f2] bg-white p-4">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-[#0B63CE]" aria-hidden="true" />
            <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#0B1F3A]">{c.category}</p>
          </div>
          <ul className="mt-2 space-y-1.5">
            {c.items.map((item) => (
              <li key={item} className="text-[12px] leading-5 text-slate-500">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
