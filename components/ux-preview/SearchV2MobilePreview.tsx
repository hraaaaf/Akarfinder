"use client";

import { useState } from "react";
import { Bell, Building2, ChevronDown, Heart, Map, Menu, Search, SlidersHorizontal, UserRound } from "lucide-react";

const listings = [
  { price: "1 250 000 DH", title: "Bel appartement 2 chambres à Maarif", place: "Maarif, Casablanca", meta: "2 ch. · 2 sdb · 85 m²", source: "Mubawab", age: "Il y a 2 heures", level: "Élevé", image: "/images/demo/living-room-1.jpg" },
  { price: "980 000 DH", title: "Appartement 3 pièces à Racine", place: "Racine, Casablanca", meta: "2 ch. · 1 sdb · 72 m²", source: "Avito.ma", age: "Il y a 4 heures", level: "Moyen", image: "/images/demo/living-room-2.jpg" },
  { price: "1 780 000 DH", title: "Appartement de standing à Aïn Diab", place: "Aïn Diab, Casablanca", meta: "3 ch. · 2 sdb · 120 m²", source: "Sarouty.ma", age: "Il y a 6 heures", level: "Élevé", image: "/images/demo/living-room-3.jpg" },
];

function FilterChip({ children }: { children: React.ReactNode }) {
  return <button className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm">{children}</button>;
}

export function SearchV2MobilePreview() {
  const [mode, setMode] = useState<"list" | "map">("list");
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-[#f7f9fc] text-slate-950 shadow-2xl">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button aria-label="Menu"><Menu size={22} /></button>
          <div className="flex items-center gap-2 text-lg font-black"><Building2 className="text-blue-600" />AkarFinder</div>
          <div className="flex items-center gap-4"><Heart size={21} /><UserRound size={21} /></div>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <Search size={18} className="text-slate-500" />
            <span className="flex-1 text-sm font-medium">Appartement à Casablanca</span>
            <span className="text-slate-400">×</span>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
          <FilterChip>Casablanca <ChevronDown className="ml-1 inline" size={13} /></FilterChip>
          <FilterChip>Achat <ChevronDown className="ml-1 inline" size={13} /></FilterChip>
          <FilterChip>Appartement <ChevronDown className="ml-1 inline" size={13} /></FilterChip>
        </div>
        <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-3 scrollbar-none">
          <FilterChip>Prix</FilterChip><FilterChip>Surface</FilterChip><FilterChip>Pièces</FilterChip>
          <button onClick={() => setFiltersOpen(true)} className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm"><SlidersHorizontal className="mr-1 inline" size={13} /> Plus de filtres</button>
        </div>
      </header>

      {mode === "list" ? (
        <main className="px-4 pb-28 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div><h1 className="text-xl font-black">2 452 annonces trouvées</h1><p className="mt-1 text-xs text-slate-500">Tri : Pertinence</p></div>
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Trier</button>
          </div>
          <div className="mt-4 grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 text-sm font-bold">
            <button onClick={() => setMode("list")} className="rounded-lg bg-blue-50 py-2 text-blue-700">Liste</button>
            <button onClick={() => setMode("map")} className="rounded-lg py-2 text-slate-600">Carte</button>
          </div>
          <div className="mt-4 space-y-4">
            {listings.map((listing, index) => (
              <article key={listing.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="relative h-48 bg-gradient-to-br from-slate-200 to-slate-100">
                  <div className="absolute left-3 top-3 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-extrabold text-white">NOUVEAU</div>
                  <button className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white shadow"><Heart size={18} /></button>
                  <div className="absolute bottom-3 left-3 rounded-md bg-black/65 px-2 py-1 text-[11px] font-bold text-white">📷 {12 - index * 2}</div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3"><p className="text-xl font-black">{listing.price}</p><span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${listing.level === "Élevé" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{listing.level}</span></div>
                  <h2 className="mt-1 text-sm font-bold">{listing.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">{listing.place}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-700">{listing.meta}</p>
                  <div className="mt-3 flex gap-2"><span className="rounded-md bg-slate-100 px-2 py-1 text-[11px]">Appartement</span><span className="rounded-md bg-slate-100 px-2 py-1 text-[11px]">Bon état</span></div>
                  <p className="mt-3 text-[11px] text-slate-500">Source : {listing.source} · {listing.age}</p>
                </div>
              </article>
            ))}
          </div>
        </main>
      ) : (
        <main className="relative h-[calc(100vh-220px)] overflow-hidden bg-[#dfeef9]">
          <div className="absolute inset-0 opacity-70" style={{backgroundImage:"linear-gradient(25deg, transparent 48%, #fff 49%, #fff 51%, transparent 52%),linear-gradient(-25deg, transparent 48%, #fff 49%, #fff 51%, transparent 52%)",backgroundSize:"90px 90px"}} />
          {[[72,34,"312"],[35,48,"456"],[66,54,"279"],[72,72,"189"],[58,84,"167"]].map(([x,y,n]) => <span key={String(n)} className="absolute grid h-12 w-12 place-items-center rounded-full border-4 border-white bg-blue-600 text-xs font-black text-white shadow-lg" style={{left:`${x}%`,top:`${y}%`,transform:"translate(-50%,-50%)"}}>{n}</span>)}
          <div className="absolute left-4 top-4 rounded-xl bg-white px-3 py-2 text-xs font-bold shadow">2 452 annonces</div>
          <button onClick={() => setFiltersOpen(true)} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-xl bg-white shadow"><SlidersHorizontal size={18} /></button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2"><button onClick={() => setMode("list")} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-xl">Voir la liste</button></div>
        </main>
      )}

      {filtersOpen && <div className="fixed inset-0 z-50 mx-auto flex max-w-[430px] items-end bg-black/30" onClick={() => setFiltersOpen(false)}><section onClick={(e)=>e.stopPropagation()} className="w-full rounded-t-3xl bg-white p-5 shadow-2xl"><div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300"/><div className="flex items-center justify-between"><h2 className="text-xl font-black">Filtres</h2><button className="text-sm font-bold text-blue-600">Réinitialiser</button></div><div className="mt-5 space-y-3">{["Localisation","Prix (DH)","Surface (m²)","Pièces","Type de bien","Étage","État du bien","Plus de filtres"].map((item)=><button key={item} className="flex w-full items-center justify-between border-b border-slate-100 py-3 text-sm font-bold">{item}<ChevronDown size={16}/></button>)}</div><button onClick={()=>setFiltersOpen(false)} className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-black text-white">Voir 2 452 annonces</button></section></div>}

      <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-4 border-t border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-500"><button className="grid place-items-center gap-1 text-blue-600"><Search size={20}/>Recherche</button><button className="grid place-items-center gap-1"><Heart size={20}/>Sauvegardes</button><button className="grid place-items-center gap-1"><Bell size={20}/>Alertes</button><button className="grid place-items-center gap-1"><Map size={20}/>Mon projet</button></nav>
    </div>
  );
}
