import Link from "next/link";
import { Bell, Mail, Globe, ChevronRight } from "lucide-react";

type MapSideCTAProps = {
  city: string;
};

const ctas = [
  {
    title: "Créer une alerte",
    desc: "Soyez prévenu dès qu'un bien correspond.",
    Icon: Bell,
  },
  {
    title: "Recevoir les biens similaires",
    desc: "Une sélection régulière par e-mail.",
    Icon: Mail,
  },
  {
    title: "Recherche MRE",
    desc: "Achat à distance, WhatsApp, brochure.",
    Icon: Globe,
  },
];

export function MapSideCTA({ city }: MapSideCTAProps) {
  const href = city === "Maroc" ? "/map" : `/map?city=${encodeURIComponent(city)}`;

  return (
    <aside className="overflow-hidden rounded-[1.5rem] border border-[#eadfca] bg-white shadow-[0_10px_30px_rgba(7,27,51,0.08)]">
      <div className="border-b border-[#eadfca] bg-[#fffdf8] px-5 py-3.5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-bronze-700">
          Rester sur le marché de {city}
        </p>
      </div>
      <div className="divide-y divide-[#f0e6d2]">
        {ctas.map(({ title, desc, Icon }) => (
          <button
            key={title}
            type="button"
            className="group flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition hover:bg-[#fbf7ee]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-deepblue text-bronze-400 transition group-hover:bg-deepblue-700">
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-extrabold text-deepblue">{title}</span>
              <span className="mt-0.5 block text-[12.5px] font-medium text-gray-500">{desc}</span>
            </span>
            <ChevronRight size={16} strokeWidth={2.4} className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-bronze-700" aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="border-t border-[#f0e6d2] px-5 py-4">
        <Link
          href={href}
          className="flex w-full items-center justify-center rounded-xl bg-deepblue px-4 py-3 text-[13px] font-extrabold text-white transition hover:bg-deepblue-700"
        >
          Ouvrir la carte
        </Link>
        <p className="mt-3 text-[11px] leading-5 text-gray-500">
          Actions de démonstration — aucune donnée n'est envoyée.
        </p>
      </div>
    </aside>
  );
}
