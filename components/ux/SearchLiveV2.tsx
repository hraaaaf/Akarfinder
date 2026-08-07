"use client";

import {
  Bath,
  BedDouble,
  Building2,
  ChevronDown,
  ExternalLink,
  Heart,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Listing } from "@/lib/listings/types";

function formatPrice(value: number | null) {
  return value == null ? "Prix sur demande" : `${new Intl.NumberFormat("fr-FR").format(value)} DH`;
}

function allowedImage(listing: Listing) {
  if (!listing.can_show_thumbnail) return null;
  if (listing.image_permission_status !== "allowed") return null;
  if (listing.source_access_level !== "partner_full" && listing.source_access_level !== "preview_allowed") return null;
  return listing.main_image_url || listing.thumbnail_url || listing.image_url || null;
}

function infoLabel(listing: Listing) {
  if (listing.reliability_badge) return listing.reliability_badge;
  if (listing.data_completeness_score && listing.data_completeness_score >= 75) return "Information élevée";
  if (listing.data_completeness_score && listing.data_completeness_score >= 45) return "Information moyenne";
  return listing.reliability_label || "Information limitée";
}

function sourceLabel(listing: Listing) {
  return listing.source_name || listing.source_attribution_label || listing.source_type;
}

function ListingVisual({ listing }: { listing: Listing }) {
  const image = allowedImage(listing);
  if (image) {
    return <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />;
  }
  return (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 text-slate-400">
      <Building2 size={42} strokeWidth={1.5} />
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const canOpen = Boolean(listing.listing_url && listing.primary_cta !== "none");
  return (
    <article className="grid min-h-[190px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.09)] md:grid-cols-[240px_1fr]">
      <div className="relative min-h-[190px] overflow-hidden bg-slate-100">
        <ListingVisual listing={listing} />
        {listing.images_count ? <span className="absolute bottom-3 left-3 rounded-lg bg-slate-950/75 px-2.5 py-1 text-xs font-bold text-white">{listing.images_count} photos</span> : null}
        <button aria-label="Ajouter aux favoris" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-600 shadow-sm"><Heart size={18} /></button>
      </div>
      <div className="flex min-w-0 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[23px] font-black tracking-[-0.04em] text-slate-950">{formatPrice(listing.price)}</p>
            <h2 className="mt-1 line-clamp-2 text-base font-bold text-slate-800">{listing.title}</h2>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} />{listing.neighborhood || listing.city}, {listing.city}</p>
          </div>
          <span className="max-w-[132px] rounded-xl bg-emerald-50 px-3 py-2 text-center text-[10px] font-extrabold leading-4 text-emerald-700">{infoLabel(listing)}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-5 text-sm font-semibold text-slate-600">
          {listing.bedrooms_count ?? listing.bedrooms ? <span className="flex items-center gap-1.5"><BedDouble size={17} />{listing.bedrooms_count ?? listing.bedrooms}</span> : null}
          {listing.bathrooms_count ?? listing.bathrooms ? <span className="flex items-center gap-1.5"><Bath size={17} />{listing.bathrooms_count ?? listing.bathrooms}</span> : null}
          {listing.surface_m2 ? <span className="flex items-center gap-1.5"><Maximize2 size={16} />{listing.surface_m2} m²</span> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{listing.property_type}</span>
          {listing.condition ? <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{listing.condition}</span> : null}
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4 text-xs text-slate-500">
          <p>Source : <strong className="font-semibold text-slate-600">{sourceLabel(listing)}</strong>{listing.freshness_label ? <><span className="mx-2">·</span>{listing.freshness_label}</> : null}</p>
          {canOpen ? <a href={listing.listing_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-bold text-blue-700 hover:underline">Voir la source <ExternalLink size={13} /></a> : null}
        </div>
      </div>
    </article>
  );
}

export function SearchLiveV2({ initialListings, initialTotal }: { initialListings: Listing[]; initialTotal: number }) {
  const [view, setView] = useState<"list" | "map">("list");
  const visibleListings = useMemo(() => initialListings.filter((listing) => listing.can_show_result !== false && listing.production_allowed !== false), [initialListings]);
  const city = visibleListings[0]?.city || "Casablanca";

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[70px] max-w-[1600px] items-center gap-6 px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2 text-xl font-black tracking-[-0.04em]"><Building2 className="text-blue-700" />AkarFinder</a>
          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-800 xl:flex"><a href="/acheter">Acheter</a><a href="/louer">Louer</a><a href="/neuf">Neuf</a><a href="/vendre">Vendre</a><a href="/map">Carte</a><a href="/pro">Professionnels</a></nav>
          <div className="ml-auto flex items-center gap-2"><a href="/favoris" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold sm:flex"><Heart size={18} />Favoris</a><a href="/mon-projet" className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-extrabold text-white">Mon projet</a></div>
        </div>
      </header>

      <form action="/ux/search-v2/live" className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <div className="flex h-12 min-w-[260px] flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4 shadow-sm"><Search size={19} className="text-slate-400" /><input name="q" defaultValue="Appartement à Casablanca" className="w-full bg-transparent text-sm font-semibold outline-none" /></div>
          <select name="transaction_type" defaultValue="buy" className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold"><option value="buy">Acheter</option><option value="rent">Louer</option><option value="new">Neuf</option></select>
          <select name="property_type" defaultValue="Appartement" className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold"><option>Appartement</option><option>Villa</option><option>Terrain</option><option>Maison</option></select>
          <button className="h-12 rounded-xl bg-blue-700 px-7 text-sm font-extrabold text-white">Rechercher</button>
        </div>
      </form>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1180px] gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {[city, "Prix", "Surface", "Pièces", "Plus de filtres"].map((label, index) => <button key={label} className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm">{index === 0 ? <MapPin size={16} /> : index === 4 ? <SlidersHorizontal size={16} /> : null}{label}<ChevronDown size={14} className="text-slate-400" /></button>)}
        </div>
      </section>

      <div className="grid min-h-[720px] lg:grid-cols-[285px_minmax(520px,760px)_minmax(360px,1fr)]">
        <aside className="hidden border-r border-slate-200 bg-white p-5 lg:block">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">Filtres</h2><a href="/ux/search-v2/live" className="text-xs font-bold text-blue-700">Réinitialiser</a></div>
          <div className="mt-6 space-y-5">
            <label className="grid gap-2 text-sm font-extrabold">Localisation<input name="city" form="filter-form" defaultValue={city} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold" /></label>
            <section><h3 className="mb-3 text-sm font-extrabold">Prix (DH)</h3><div className="grid grid-cols-2 gap-2"><input name="min_price" form="filter-form" placeholder="Min" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" /><input name="max_price" form="filter-form" placeholder="Max" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" /></div></section>
            <section><h3 className="mb-3 text-sm font-extrabold">Surface (m²)</h3><input name="min_surface" form="filter-form" placeholder="Surface minimale" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></section>
            {["Type de bien", "État du bien", "Équipements", "Sources"].map((item) => <button key={item} className="flex w-full items-center justify-between border-b border-slate-100 py-3 text-sm font-extrabold">{item}<ChevronDown size={15} /></button>)}
            <form id="filter-form" action="/ux/search-v2/live"><button className="h-11 w-full rounded-xl bg-blue-700 text-sm font-extrabold text-white">Voir les résultats</button></form>
            <p className="text-center text-xs text-slate-500">{initialTotal} résultat{initialTotal > 1 ? "s" : ""}</p>
          </div>
        </aside>

        <section className="bg-[#fbfcfe] p-4 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3"><div><h1 className="text-2xl font-black tracking-[-0.04em]">{initialTotal} annonce{initialTotal > 1 ? "s" : ""} trouvée{initialTotal > 1 ? "s" : ""}</h1><button className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">Tri : Pertinence <ChevronDown size={15} /></button></div><div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><button onClick={() => setView("list")} className={`rounded-lg px-3 py-2 text-sm font-bold ${view === "list" ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}>Liste</button><button onClick={() => setView("map")} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold ${view === "map" ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}><MapIcon size={15} />Carte</button></div></div>
          {visibleListings.length ? <div className="space-y-4">{visibleListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-black">Aucun résultat exploitable</h2><p className="mt-2 text-sm text-slate-500">Élargissez les critères de recherche.</p></div>}
        </section>

        <aside className={`${view === "map" ? "block" : "hidden"} relative min-h-[520px] overflow-hidden border-l border-slate-200 bg-[#dbeeff] lg:block`}>
          <div className="absolute inset-0 opacity-85" style={{ backgroundImage: "linear-gradient(30deg,rgba(255,255,255,.5) 12%,transparent 12.5%,transparent 87%,rgba(255,255,255,.5) 87.5%),linear-gradient(150deg,rgba(255,255,255,.5) 12%,transparent 12.5%,transparent 87%,rgba(255,255,255,.5) 87.5%)", backgroundSize: "90px 155px" }} />
          {visibleListings.slice(0, 6).map((listing, index) => <div key={listing.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${24 + (index % 3) * 25}%`, top: `${24 + Math.floor(index / 3) * 34}%` }}><span className="grid h-12 min-w-12 place-items-center rounded-full bg-blue-700 px-2 text-xs font-black text-white shadow-lg ring-4 ring-white/70">{formatPrice(listing.price).replace(" DH", "")}</span><span className="mt-1 block max-w-24 truncate text-xs font-bold text-slate-700">{listing.neighborhood || listing.city}</span></div>)}
          <div className="absolute bottom-5 left-5 rounded-xl bg-white px-4 py-3 text-xs font-semibold shadow-md">Zones indicatives selon la précision disponible</div>
        </aside>
      </div>
    </main>
  );
}
