import { Building2, ChevronDown, MapPin, Search, SlidersHorizontal } from "lucide-react";
import type { Listing } from "@/lib/listings/types";
import { ListingCardV2 } from "@/components/ux/ListingCardV2";

export function SearchCardsGalleryV2({ listings, total }: { listings: Listing[]; total: number }) {
  const visible = listings.filter((listing) => listing.can_show_result !== false && listing.production_allowed !== false);
  const city = visible[0]?.city || "Casablanca";
  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[70px] max-w-[1500px] items-center gap-7 px-5"><a href="/" className="flex items-center gap-2 text-xl font-black"><Building2 className="text-blue-700" />AkarFinder</a><nav className="hidden gap-7 text-sm font-bold lg:flex"><a href="/acheter">Acheter</a><a href="/louer">Louer</a><a href="/neuf">Neuf</a><a href="/map">Carte</a></nav><a href="/mon-projet" className="ml-auto rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-extrabold text-white">Mon projet</a></div>
      </header>
      <form action="/ux/search-v2/cards" className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1120px] flex-wrap gap-2 px-5 py-3"><label className="flex h-12 min-w-[280px] flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4 shadow-sm"><Search size={18} className="text-slate-400" /><input name="q" defaultValue="Appartement à Casablanca" className="w-full bg-transparent text-sm font-semibold outline-none" /></label><select name="transaction_type" defaultValue="buy" className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold"><option value="buy">Acheter</option><option value="rent">Louer</option><option value="new">Neuf</option></select><button className="h-12 rounded-xl bg-blue-700 px-7 text-sm font-extrabold text-white">Rechercher</button></div>
      </form>
      <div className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-[1120px] gap-2 overflow-x-auto px-5 py-3">{[city,"Prix","Surface","Pièces"].map((label,index)=><button key={label} className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold">{index===0?<MapPin size={15}/>:null}{label}<ChevronDown size={14}/></button>)}<button className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold"><SlidersHorizontal size={15}/>Plus de filtres</button></div></div>
      <section className="mx-auto max-w-[1120px] px-5 py-7"><div className="mb-6 flex items-start justify-between"><div><h1 className="text-2xl font-black tracking-[-.04em]">{total} annonce{total>1?"s":""} trouvée{total>1?"s":""}</h1><button className="mt-2 flex items-center gap-2 text-sm font-semibold">Tri : Pertinence <ChevronDown size={15}/></button></div><span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-extrabold text-blue-700">LOT 4 · Cartes V2</span></div>{visible.length?<div className="grid gap-4">{visible.map((listing)=><ListingCardV2 key={listing.id} listing={listing}/>)}</div>:<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><h2 className="font-black">Aucun résultat exploitable</h2></div>}</section>
    </main>
  );
}
