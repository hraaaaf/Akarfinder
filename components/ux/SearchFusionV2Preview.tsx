"use client";

import {
  Bath,
  BedDouble,
  ChevronDown,
  ExternalLink,
  Heart,
  Map,
  MapPin,
  Maximize2,
  Moon,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

const listings = [
  { price: "1 250 000 DH", title: "Bel appartement 2 chambres à Maârif", location: "Maârif, Casablanca", beds: 2, baths: 2, area: "85 m²", source: "Mubawab", freshness: "Il y a 2 heures", info: "Information élevée", photo: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=85" },
  { price: "980 000 DH", title: "Appartement lumineux à Racine", location: "Racine, Casablanca", beds: 2, baths: 1, area: "72 m²", source: "Avito.ma", freshness: "Il y a 4 heures", info: "Information moyenne", photo: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=85" },
  { price: "1 780 000 DH", title: "Appartement de standing à Aïn Diab", location: "Aïn Diab, Casablanca", beds: 3, baths: 2, area: "120 m²", source: "Sarouty.ma", freshness: "Il y a 6 heures", info: "Information élevée", photo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85" },
  { price: "1 420 000 DH", title: "Appartement rénové proche des commerces", location: "Gauthier, Casablanca", beds: 2, baths: 2, area: "91 m²", source: "AkarFinder partenaire", freshness: "Aujourd’hui", info: "Information élevée", photo: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1000&q=85" },
];

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#DCE8F5] bg-white/96 backdrop-blur-xl">
      <div className="mx-auto flex h-[66px] max-w-[1600px] items-center gap-7 px-4 sm:px-6">
        <a href="#" aria-label="AkarFinder accueil" className="shrink-0">
          <img src="/brand/logo-v2/logo-horizontal-bilingual.png" alt="AkarFinder" className="h-[46px] w-auto" />
        </a>
        <nav className="hidden items-center gap-6 text-[13px] font-bold text-[#0B1F3A] lg:flex">
          <a href="#">Accueil</a><a href="#">Acheter</a><a href="#">Louer</a><a href="#">Neuf</a><a href="#">Vendre</a><a href="#">Carte</a><a className="text-[#0B63CE]" href="#">Recherche</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button aria-label="Thème sombre" className="grid h-9 w-9 place-items-center rounded-full border border-[#DCE8F5] text-[#0B1F3A]"><Moon size={16}/></button>
          <button className="hidden h-9 items-center gap-2 rounded-full px-3 text-[12px] font-bold text-[#0B1F3A] sm:flex"><Heart size={17}/> Favoris</button>
          <button className="hidden rounded-xl border border-[#C59A5B]/40 px-4 py-2 text-[12px] font-extrabold text-[#8B632C] lg:block">Espace Pro</button>
          <button className="rounded-xl bg-[#0B63CE] px-4 py-2.5 text-[12px] font-extrabold text-white shadow-[0_8px_22px_rgba(11,99,206,.24)]">Mon projet</button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto border-t border-[#EEF3F8] px-4 py-2 lg:hidden">
        {['Recherche','Acheter','Louer','Vendre','Pro'].map((x)=><button key={x} className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold ${x==='Recherche'?'border-[#0B63CE] bg-[#EEF6FF] text-[#0B63CE]':'border-[#DCE8F5] text-[#0B1F3A]'}`}>{x}</button>)}
      </div>
    </header>
  );
}

function Card({ item }: { item: typeof listings[number] }) {
  return (
    <article className="grid overflow-hidden rounded-2xl border border-[#DCE8F5] bg-white shadow-[0_10px_30px_rgba(11,31,58,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_46px_rgba(11,31,58,.11)] sm:grid-cols-[230px_1fr]">
      <div className="relative min-h-[190px] bg-cover bg-center" style={{backgroundImage:`url(${item.photo})`}}>
        <span className="absolute bottom-3 left-3 rounded-lg bg-[#071B33]/82 px-2.5 py-1 text-[11px] font-bold text-white">12 photos</span>
        <button className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-[#0B1F3A] shadow"><Heart size={18}/></button>
      </div>
      <div className="flex min-w-0 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><div className="text-[22px] font-black tracking-[-.035em] text-[#0B1F3A]">{item.price}</div><h2 className="mt-1 truncate text-[15px] font-extrabold text-[#0B1F3A]">{item.title}</h2><p className="mt-1 flex items-center gap-1 text-[12px] text-slate-500"><MapPin size={13}/>{item.location}</p></div>
          <span className="hidden rounded-xl bg-[#ECFDF5] px-2.5 py-2 text-center text-[10px] font-extrabold text-emerald-700 sm:block">{item.info}</span>
        </div>
        <div className="mt-4 flex gap-4 text-[12px] font-bold text-slate-600"><span className="flex items-center gap-1"><BedDouble size={15}/>{item.beds}</span><span className="flex items-center gap-1"><Bath size={15}/>{item.baths}</span><span className="flex items-center gap-1"><Maximize2 size={14}/>{item.area}</span></div>
        <div className="mt-3 flex gap-2"><span className="rounded-lg bg-[#EEF6FF] px-2.5 py-1 text-[11px] font-bold text-[#0B63CE]">Appartement</span><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">Bon état</span></div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4 text-[11px] text-slate-500"><span>Source : <b>{item.source}</b> · {item.freshness}</span><button className="flex shrink-0 items-center gap-1 font-extrabold text-[#0B63CE]">Voir la source <ExternalLink size={12}/></button></div>
      </div>
    </article>
  );
}

function MarketInsight() {
  return (
    <article className="rounded-2xl border border-[#BFDBFE] bg-gradient-to-br from-[#F8FBFF] to-[#EEF6FF] p-5 shadow-[0_12px_34px_rgba(11,99,206,.08)]">
      <div className="flex items-start justify-between gap-4"><div><span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#0B63CE]"><Sparkles size={14}/> Intelligence AkarFinder</span><h2 className="mt-2 text-[18px] font-black text-[#0B1F3A]">Comprendre Maârif avant de poursuivre</h2></div><button className="rounded-xl border border-[#93C5FD] bg-white px-3 py-2 text-[11px] font-extrabold text-[#0B63CE]">Voir l’analyse</button></div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><small className="text-slate-500">Repère observé</small><b className="mt-1 block text-[#0B1F3A]">~14 000 DH/m²</b></div><div><small className="text-slate-500">Tendance</small><b className="mt-1 flex items-center gap-1 text-emerald-700"><TrendingUp size={14}/> +4,8 %</b></div><div><small className="text-slate-500">Période</small><b className="mt-1 block text-[#0B1F3A]">2024–2025</b></div><div><small className="text-slate-500">Confiance</small><b className="mt-1 block text-[#0B1F3A]">Élevée</b></div></div>
      <p className="mt-4 text-[11px] leading-5 text-slate-500">Repères indicatifs issus des données disponibles. Les informations absentes ne sont jamais inventées.</p>
    </article>
  );
}

export default function SearchFusionV2Preview() {
  const [view, setView] = useState<'list'|'map'>('list');
  return (
    <main className="min-h-screen bg-[#F7FAFD] text-[#0B1F3A]">
      <Header />
      <section className="border-b border-[#DCE8F5] bg-white">
        <div className="mx-auto flex max-w-[1120px] gap-2 px-4 py-3 sm:px-6">
          <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#DCE8F5] px-4 shadow-sm"><Search size={18} className="text-[#0B63CE]"/><span className="truncate text-[13px] font-semibold">Appartement à Casablanca</span></div>
          <button className="hidden h-12 min-w-32 items-center justify-between rounded-xl border border-[#DCE8F5] px-4 text-[13px] font-bold sm:flex">Acheter <ChevronDown size={15}/></button>
          <button className="hidden h-12 min-w-40 items-center justify-between rounded-xl border border-[#DCE8F5] px-4 text-[13px] font-bold md:flex">Appartement <ChevronDown size={15}/></button>
          <button className="h-12 rounded-xl bg-[#0B63CE] px-5 text-[13px] font-extrabold text-white">Rechercher</button>
        </div>
      </section>
      <section className="border-b border-[#DCE8F5] bg-white"><div className="mx-auto flex max-w-[1120px] gap-2 overflow-x-auto px-4 py-3 sm:px-6">{['Casablanca','Prix : 0–2 000 000 DH','Surface','Pièces'].map(x=><button key={x} className="shrink-0 rounded-xl border border-[#DCE8F5] bg-white px-3.5 py-2 text-[12px] font-bold">{x}</button>)}<button className="shrink-0 rounded-xl border border-[#93C5FD] bg-[#EEF6FF] px-3.5 py-2 text-[12px] font-extrabold text-[#0B63CE]"><SlidersHorizontal size={14} className="mr-1 inline"/>Filtres</button></div></section>
      <div className="grid min-h-[760px] lg:grid-cols-[286px_minmax(520px,720px)_minmax(390px,1fr)]">
        <aside className="hidden border-r border-[#DCE8F5] bg-white p-5 lg:block"><div className="flex justify-between"><h2 className="font-black">Filtres</h2><button className="text-[11px] font-bold text-[#0B63CE]">Réinitialiser</button></div><div className="mt-5 space-y-5">{['Localisation','Prix (DH)','Surface (m²)','Pièces'].map((x,i)=><section key={x}><h3 className="mb-2 text-[12px] font-extrabold">{x}</h3>{i===0?<><div className="mb-2 rounded-xl border border-[#DCE8F5] p-3 text-[12px] font-semibold">Casablanca⌄</div><div className="rounded-xl border border-[#DCE8F5] p-3 text-[12px] font-semibold">Tous les quartiers⌄</div></>:i===3?<div className="grid grid-cols-4 gap-2">{['1+','2+','3+','4+'].map(y=><button key={y} className={`h-9 rounded-xl border text-[11px] font-bold ${y==='2+'?'border-[#0B63CE] bg-[#EEF6FF] text-[#0B63CE]':'border-[#DCE8F5]'}`}>{y}</button>)}</div>:<div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-[#DCE8F5] p-3 text-[11px] text-slate-500">Min</div><div className="rounded-xl border border-[#DCE8F5] p-3 text-[11px] text-slate-500">Max</div></div>}</section>)}{['Type de bien','Étage','État du bien','Équipements'].map(x=><button key={x} className="flex w-full justify-between border-b border-[#EEF3F8] py-3 text-[12px] font-extrabold">{x}<ChevronDown size={14}/></button>)}<button className="h-11 w-full rounded-xl bg-[#0B63CE] text-[12px] font-extrabold text-white">Voir 2 452 résultats</button></div></aside>
        <section className="overflow-y-auto p-4 sm:p-6"><div className="mb-4 rounded-xl border border-[#DCE8F5] bg-white px-4 py-3 text-[12px] text-slate-600"><b className="text-[#0B1F3A]">Maârif</b> · repère observé <b className="text-[#0B63CE]">~14 000 DH/m²</b> · données 2024–2025 · confiance élevée <button className="ml-2 font-extrabold text-[#0B63CE]">Détails →</button></div><div className="mb-5 flex items-start justify-between"><div><h1 className="text-[22px] font-black tracking-[-.035em]">2 452 annonces trouvées</h1><button className="mt-1 text-[12px] font-semibold">Tri : Pertinence⌄</button></div><div className="flex rounded-xl border border-[#DCE8F5] bg-white p-1"><button onClick={()=>setView('list')} className={`rounded-lg px-3 py-2 text-[11px] font-bold ${view==='list'?'bg-[#EEF6FF] text-[#0B63CE]':''}`}>☷ Liste</button><button onClick={()=>setView('map')} className={`rounded-lg px-3 py-2 text-[11px] font-bold ${view==='map'?'bg-[#EEF6FF] text-[#0B63CE]':''}`}><Map size={13} className="mr-1 inline"/>Carte</button></div></div><div className="space-y-4"><Card item={listings[0]}/><Card item={listings[1]}/><MarketInsight/><Card item={listings[2]}/><Card item={listings[3]}/></div></section>
        <aside className="relative hidden overflow-hidden border-l border-[#DCE8F5] bg-[#E3F0FB] lg:block"><div className="absolute inset-0 opacity-50" style={{backgroundImage:'linear-gradient(35deg,rgba(255,255,255,.7) 12%,transparent 12.5%,transparent 87%,rgba(255,255,255,.7) 87.5%)',backgroundSize:'70px 120px'}}/><button className="absolute left-5 top-5 rounded-xl bg-white px-4 py-2 text-[12px] font-bold shadow">Rechercher dans cette zone</button>{[{n:456,x:'22%',y:'30%',l:'Aïn Diab'},{n:312,x:'62%',y:'20%',l:'Corniche'},{n:279,x:'57%',y:'45%',l:'Maârif'},{n:189,x:'66%',y:'60%',l:'Racine'}].map(p=><div key={p.n} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{left:p.x,top:p.y}}><b className="grid h-11 w-11 place-items-center rounded-full bg-[#0B63CE] text-[12px] text-white shadow-lg ring-4 ring-white/70">{p.n}</b><small className="font-bold text-[#0B1F3A]">{p.l}</small></div>)}</aside>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-[#DCE8F5] bg-white px-2 py-2 lg:hidden"><button className="text-[10px] font-bold text-[#0B63CE]">⌕<small className="block">Recherche</small></button><button className="text-[10px] font-bold">♡<small className="block">Favoris</small></button><button className="text-[10px] font-bold">⌖<small className="block">Carte</small></button><button className="text-[10px] font-bold">▤<small className="block">Projet</small></button></nav>
      <div className="fixed bottom-16 right-4 rounded-full bg-[#071B33] px-3 py-2 text-[10px] font-bold text-white lg:bottom-4">UX Fusion V2 · LOT 5.2</div>
    </main>
  );
}
