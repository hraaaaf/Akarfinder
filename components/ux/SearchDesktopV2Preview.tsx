"use client";

import {
  Bath,
  BedDouble,
  Building2,
  ChevronDown,
  ExternalLink,
  Heart,
  Map,
  MapPin,
  Maximize2,
  Moon,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";

const listings = [
  {
    id: 1,
    price: "1 250 000 DH",
    title: "Bel appartement 2 chambres à Maârif",
    location: "Maârif, Casablanca",
    beds: 2,
    baths: 2,
    area: "85 m²",
    type: "Appartement",
    state: "Bon état",
    source: "Mubawab",
    freshness: "Il y a 2 heures",
    level: "Élevé",
    levelClass: "bg-emerald-50 text-emerald-700",
    photo: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 2,
    price: "980 000 DH",
    title: "Appartement 3 pièces à Racine",
    location: "Racine, Casablanca",
    beds: 2,
    baths: 1,
    area: "72 m²",
    type: "Appartement",
    state: "À rafraîchir",
    source: "Avito.ma",
    freshness: "Il y a 4 heures",
    level: "Moyen",
    levelClass: "bg-amber-50 text-amber-700",
    photo: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 3,
    price: "1 780 000 DH",
    title: "Appartement de standing à Aïn Diab",
    location: "Aïn Diab, Casablanca",
    beds: 3,
    baths: 2,
    area: "120 m²",
    type: "Appartement",
    state: "Très bon état",
    source: "Sarouty.ma",
    freshness: "Il y a 6 heures",
    level: "Élevé",
    levelClass: "bg-emerald-50 text-emerald-700",
    photo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=85",
  },
];

function FilterSelect({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300">
      <span>{children}</span>
      <ChevronDown size={15} className="text-slate-400" />
    </button>
  );
}

function ListingCard({ listing }: { listing: (typeof listings)[number] }) {
  return (
    <article className="grid min-h-[188px] grid-cols-[260px_1fr] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.09)]">
      <div className="relative min-h-[188px] bg-slate-100 bg-cover bg-center" style={{ backgroundImage: `url(${listing.photo})` }}>
        <span className="absolute bottom-3 left-3 rounded-lg bg-slate-950/75 px-2.5 py-1 text-xs font-bold text-white">12 photos</span>
        <button aria-label="Ajouter aux favoris" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-600 shadow-sm">
          <Heart size={18} />
        </button>
      </div>
      <div className="flex min-w-0 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[24px] font-black tracking-[-0.04em] text-slate-950">{listing.price}</p>
            <h2 className="mt-1 truncate text-base font-bold text-slate-800">{listing.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{listing.location}</p>
          </div>
          <span className={`rounded-xl px-3 py-2 text-center text-[11px] font-extrabold ${listing.levelClass}`}>
            <span className="block font-semibold opacity-75">Niveau d’info</span>{listing.level}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-5 text-sm font-semibold text-slate-600">
          <span className="flex items-center gap-1.5"><BedDouble size={17} />{listing.beds}</span>
          <span className="flex items-center gap-1.5"><Bath size={17} />{listing.baths}</span>
          <span className="flex items-center gap-1.5"><Maximize2 size={16} />{listing.area}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{listing.type}</span>
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{listing.state}</span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-4 text-xs text-slate-500">
          <p>Source : <strong className="font-semibold text-slate-600">{listing.source}</strong><span className="mx-2">·</span>{listing.freshness}</p>
          <button className="flex items-center gap-1.5 font-bold text-blue-700 hover:underline">Voir la source <ExternalLink size={13} /></button>
        </div>
      </div>
    </article>
  );
}

export function SearchDesktopV2Preview() {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-10 px-6">
          <div className="flex items-center gap-2 text-xl font-black tracking-[-0.04em]"><Building2 className="text-blue-700" />AkarFinder</div>
          <nav className="flex items-center gap-8 text-sm font-bold text-slate-800">
            <a href="#">Acheter</a><a href="#">Louer</a><a href="#">Neuf</a><a href="#">Vendre</a><a href="#">Carte</a><a href="#">Professionnels</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold"><Heart size={18} />Favoris</button>
            <button className="grid h-10 w-10 place-items-center rounded-full border border-slate-200"><Moon size={18} /></button>
            <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm">Mon projet</button>
          </div>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1120px] items-center gap-2 px-6 py-3">
          <div className="flex h-12 flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4 shadow-sm">
            <Search size={19} className="text-slate-400" />
            <input value="Appartement à Casablanca" readOnly className="w-full bg-transparent text-sm font-semibold outline-none" />
          </div>
          <button className="flex h-12 min-w-36 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold">Acheter <ChevronDown size={16} /></button>
          <button className="flex h-12 min-w-40 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold">Appartement <ChevronDown size={16} /></button>
          <button className="h-12 rounded-xl bg-blue-700 px-7 text-sm font-extrabold text-white shadow-sm">Rechercher</button>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3 px-6 py-3">
          {[
            [<MapPin key="city" size={16} />, "Casablanca"],
            [null, "Prix : 0 - 2 000 000 DH"],
            [null, "Surface"],
            [null, "Pièces"],
            [<SlidersHorizontal key="more" size={16} />, "Plus de filtres"],
          ].map(([icon, label]) => (
            <button key={String(label)} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm">
              {icon}{label}<ChevronDown size={14} className="text-slate-400" />
            </button>
          ))}
          <button className="ml-auto text-sm font-bold text-blue-700">Réinitialiser</button>
        </div>
      </section>

      <div className="grid h-[calc(100vh-170px)] min-h-[720px] grid-cols-[316px_minmax(540px,760px)_minmax(430px,1fr)]">
        <aside className="overflow-y-auto border-r border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">Filtres</h2><button className="text-xs font-bold text-blue-700">Réinitialiser</button></div>
          <div className="mt-6 space-y-5">
            <section><h3 className="mb-3 text-sm font-extrabold">Localisation</h3><div className="grid gap-2"><FilterSelect>Casablanca</FilterSelect><FilterSelect>Tous les quartiers</FilterSelect></div></section>
            <section><h3 className="mb-3 text-sm font-extrabold">Prix (DH)</h3><div className="h-1 rounded-full bg-blue-600" /><div className="mt-3 grid grid-cols-2 gap-2"><input value="0" readOnly className="h-11 rounded-xl border border-slate-200 px-3 text-sm" /><input value="2 000 000" readOnly className="h-11 rounded-xl border border-slate-200 px-3 text-sm" /></div></section>
            <section><h3 className="mb-3 text-sm font-extrabold">Surface (m²)</h3><div className="grid grid-cols-2 gap-2"><input placeholder="Min" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" /><input placeholder="Max" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" /></div></section>
            <section><h3 className="mb-3 text-sm font-extrabold">Pièces</h3><div className="grid grid-cols-5 gap-2">{["1+","2+","3+","4+","5+"].map((item)=><button key={item} className="h-10 rounded-xl border border-slate-200 text-xs font-bold">{item}</button>)}</div></section>
            {["Type de bien", "Étage", "État du bien", "Plus de filtres"].map((item)=><button key={item} className="flex w-full items-center justify-between border-b border-slate-100 py-3 text-sm font-extrabold">{item}<ChevronDown size={15} /></button>)}
            <button className="h-11 w-full rounded-xl bg-blue-700 text-sm font-extrabold text-white">Voir les résultats</button>
            <p className="text-center text-xs text-slate-500">2 452 annonces trouvées</p>
          </div>
        </aside>

        <section className="overflow-y-auto bg-[#fbfcfe] p-6">
          <div className="mb-5 flex items-start justify-between">
            <div><h1 className="text-2xl font-black tracking-[-0.04em]">2 452 annonces trouvées</h1><button className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">Tri : Pertinence <ChevronDown size={15} /></button></div>
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button onClick={() => setView("list")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${view === "list" ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}><span>☷</span>Liste</button>
              <button onClick={() => setView("map")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${view === "map" ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}><Map size={16} />Carte</button>
            </div>
          </div>
          <div className="space-y-4">{listings.map((listing)=><ListingCard key={listing.id} listing={listing} />)}</div>
        </section>

        <aside className="relative overflow-hidden border-l border-slate-200 bg-[#dbeeff]">
          <div className="absolute inset-0 opacity-85" style={{ backgroundImage: "linear-gradient(30deg,rgba(255,255,255,.5) 12%,transparent 12.5%,transparent 87%,rgba(255,255,255,.5) 87.5%),linear-gradient(150deg,rgba(255,255,255,.5) 12%,transparent 12.5%,transparent 87%,rgba(255,255,255,.5) 87.5%),linear-gradient(30deg,rgba(255,255,255,.5) 12%,transparent 12.5%,transparent 87%,rgba(255,255,255,.5) 87.5%)", backgroundSize: "80px 140px" }} />
          <button className="absolute left-5 top-5 rounded-xl bg-white px-4 py-2 text-sm font-bold shadow-md">‹ Réduire la carte</button>
          <div className="absolute right-5 top-5 grid gap-1"><button className="h-10 w-10 rounded-lg bg-white text-xl shadow">+</button><button className="h-10 w-10 rounded-lg bg-white text-xl shadow">−</button></div>
          {[{n:456,x:"22%",y:"30%",l:"Aïn Diab"},{n:312,x:"62%",y:"20%",l:"Corniche"},{n:279,x:"57%",y:"45%",l:"Maârif"},{n:189,x:"66%",y:"60%",l:"Racine"},{n:167,x:"72%",y:"72%",l:"Gauthier"}].map((p)=><div key={p.n} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{left:p.x,top:p.y}}><span className="grid h-12 w-12 place-items-center rounded-full bg-blue-700 text-sm font-black text-white shadow-lg ring-4 ring-white/70">{p.n}</span><span className="mt-1 block text-xs font-bold text-slate-700">{p.l}</span></div>)}
          <div className="absolute bottom-5 left-5 rounded-xl bg-white px-4 py-3 text-xs font-semibold shadow-md"><input type="checkbox" defaultChecked className="mr-2 accent-blue-700" />Mettre à jour quand je déplace la carte</div>
        </aside>
      </div>
    </main>
  );
}
