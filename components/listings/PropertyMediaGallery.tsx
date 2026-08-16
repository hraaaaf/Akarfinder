"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Images, Maximize2, Share2, X } from "lucide-react";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { DbProviderThumbnail } from "@/components/listings/DbProviderThumbnail";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { buildPropertyMediaModel, type PropertyMediaItem } from "@/lib/listings/property-media";
import type { Listing } from "@/lib/listings/types";

function MediaImage({
  item,
  className,
  onError,
  eager = false,
}: {
  item: PropertyMediaItem;
  className: string;
  onError: () => void;
  eager?: boolean;
}) {
  return (
    // Signed private-storage URLs are intentionally served directly instead of
    // through Next Image optimization so optimizer caches never outlive URL TTL.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt={item.alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={onError}
      className={className}
    />
  );
}

export function PropertyMediaGallery({
  listing,
  priceLabel,
  location,
  transactionLabel,
}: {
  listing: Listing;
  priceLabel: string;
  location: string;
  transactionLabel: string;
}) {
  const model = useMemo(() => buildPropertyMediaModel(listing), [listing]);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const touchStart = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(
    () => model.items.filter((item) => !failedUrls.has(item.url)),
    [model.items, failedUrls],
  );

  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(Math.max(0, items.length - 1));
  }, [activeIndex, items.length]);

  useEffect(() => {
    if (!fullscreen) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
      if (event.key === "ArrowRight" && items.length > 1) {
        setActiveIndex((current) => (current + 1) % items.length);
      }
      if (event.key === "ArrowLeft" && items.length > 1) {
        setActiveIndex((current) => (current - 1 + items.length) % items.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreen, items.length]);

  const fail = (url: string) => {
    setFailedUrls((current) => new Set([...current, url]));
  };

  const previous = () => {
    if (items.length > 1) setActiveIndex((current) => (current - 1 + items.length) % items.length);
  };
  const next = () => {
    if (items.length > 1) setActiveIndex((current) => (current + 1) % items.length);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
        window.setTimeout(() => setShareState("idle"), 1600);
      }
    } catch {
      // User cancellation or unavailable clipboard must not break the gallery.
    }
  };

  const onTouchStart = (event: React.TouchEvent) => {
    touchStart.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    const end = event.changedTouches[0]?.clientX;
    if (start == null || end == null || Math.abs(start - end) < 45) return;
    if (start > end) next(); else previous();
  };

  const active = items[activeIndex] ?? null;
  const realGallery = model.mode === "gallery" && items.length >= 2;

  const controls = (
    <div className="absolute right-3 top-3 z-20 flex gap-2 sm:right-4 sm:top-4">
      <button
        type="button"
        onClick={share}
        aria-label="Partager cette annonce"
        className="grid h-11 min-w-11 place-items-center rounded-full bg-white/95 px-3 text-[#0B2545] shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE]"
      >
        <Share2 size={19} strokeWidth={2} />
        <span className="sr-only">{shareState === "copied" ? "Lien copié" : "Partager"}</span>
      </button>
      <div className="grid h-11 min-w-11 place-items-center rounded-full bg-white/95 shadow-lg backdrop-blur">
        <FavoriteToggleButton listingId={listing.id} variant="icon" />
      </div>
    </div>
  );

  if (model.mode === "provider_preview" && model.items[0]) {
    return (
      <section data-property-media-mode="provider_preview" className="relative overflow-hidden rounded-[1.6rem] border border-[#eadfca] bg-white shadow-[0_18px_54px_rgba(7,27,51,0.16)]">
        <div className="relative h-[280px] sm:h-[460px]">
          <DbProviderThumbnail
            listing={listing}
            thumbnailUrl={model.items[0].url}
            className="absolute inset-0 h-full w-full"
            imgClassName="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />
          {controls}
          <HeroLabels listing={listing} transactionLabel={transactionLabel} priceLabel={priceLabel} location={location} />
          <span className="absolute bottom-3 right-4 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white/85 backdrop-blur-sm">Aperçu source</span>
        </div>
      </section>
    );
  }

  if (!active) {
    return (
      <section data-property-media-mode="fallback" className="relative overflow-hidden rounded-[1.6rem] border border-[#eadfca] bg-white shadow-[0_18px_54px_rgba(7,27,51,0.16)]">
        <div className="relative h-[280px] sm:h-[460px]">
          <ListingVisual listing={listing} className="absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />
          {controls}
          <HeroLabels listing={listing} transactionLabel={transactionLabel} priceLabel={priceLabel} location={location} />
          <span className="absolute bottom-3 right-4 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-sm">Visuel illustratif</span>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        data-property-media-mode={realGallery ? "gallery" : "single_real"}
        className="relative overflow-hidden rounded-[1.6rem] border border-[#eadfca] bg-white shadow-[0_18px_54px_rgba(7,27,51,0.16)]"
      >
        <div className="relative lg:hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="relative h-[320px] sm:h-[500px]">
            <MediaImage item={active} eager className="absolute inset-0 h-full w-full object-cover" onError={() => fail(active.url)} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/20" />
            {controls}
            <HeroLabels listing={listing} transactionLabel={transactionLabel} priceLabel={priceLabel} location={location} />
            {realGallery ? <GalleryNav count={items.length} activeIndex={activeIndex} previous={previous} next={next} open={() => setFullscreen(true)} /> : null}
          </div>
        </div>

        <div className="relative hidden h-[500px] gap-1.5 bg-slate-100 lg:grid lg:grid-cols-[1.55fr_1fr]">
          <button type="button" onClick={() => setFullscreen(true)} className="relative overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0B63CE]" aria-label="Ouvrir la galerie en plein écran">
            <MediaImage item={items[0]} eager className="absolute inset-0 h-full w-full object-cover transition duration-300 hover:scale-[1.01]" onError={() => fail(items[0].url)} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/20" />
            <HeroLabels listing={listing} transactionLabel={transactionLabel} priceLabel={priceLabel} location={location} />
          </button>
          <div className="grid min-w-0 grid-rows-2 gap-1.5">
            {[items[1], items[2]].map((item, index) => item ? (
              <button key={item.id} type="button" onClick={() => { setActiveIndex(index + 1); setFullscreen(true); }} className="relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0B63CE]" aria-label={`Ouvrir la photo ${index + 2}`}>
                <MediaImage item={item} className="absolute inset-0 h-full w-full object-cover transition duration-300 hover:scale-[1.02]" onError={() => fail(item.url)} />
              </button>
            ) : (
              <div key={`empty-${index}`} className="relative overflow-hidden">
                <ListingVisual listing={listing} className="absolute inset-0 h-full w-full" />
              </div>
            ))}
          </div>
          {controls}
          {realGallery ? (
            <button type="button" onClick={() => setFullscreen(true)} className="absolute bottom-4 right-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-[12px] font-extrabold text-[#0B2545] shadow-lg transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE]">
              <Images size={17} /> Voir les {items.length} photos
            </button>
          ) : null}
        </div>
      </section>

      {fullscreen && active ? (
        <div role="dialog" aria-modal="true" aria-label={`Galerie photos de ${listing.title}`} className="fixed inset-0 z-[100] flex flex-col bg-[#061425]/95 text-white backdrop-blur-sm">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <p className="text-sm font-bold">{activeIndex + 1} / {items.length}</p>
            <div className="flex gap-2">
              <button type="button" onClick={share} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Partager cette annonce"><Share2 size={20} /></button>
              <button ref={closeRef} type="button" onClick={() => setFullscreen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Fermer la galerie"><X size={22} /></button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-4 sm:px-16">
            <MediaImage item={active} eager className="max-h-full max-w-full object-contain" onError={() => fail(active.url)} />
            {items.length > 1 ? (
              <>
                <button type="button" onClick={previous} className="absolute left-3 grid h-12 w-12 place-items-center rounded-full bg-black/45 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-5" aria-label="Photo précédente"><ChevronLeft size={26} /></button>
                <button type="button" onClick={next} className="absolute right-3 grid h-12 w-12 place-items-center rounded-full bg-black/45 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-5" aria-label="Photo suivante"><ChevronRight size={26} /></button>
              </>
            ) : null}
          </div>
          {model.attribution ? <p className="px-4 pb-4 text-center text-[11px] text-white/65">{model.attribution}</p> : null}
        </div>
      ) : null}
    </>
  );
}

function HeroLabels({ listing, transactionLabel, priceLabel, location }: { listing: Listing; transactionLabel: string; priceLabel: string; location: string }) {
  return (
    <>
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#0B2545] shadow">{transactionLabel}</span>
        <span className="rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm">{listing.property_type}</span>
      </div>
      <div className="pointer-events-none absolute bottom-5 left-5 right-5 z-10 pr-24">
        <p className="text-[2rem] font-extrabold tracking-[-0.05em] text-white sm:text-[3rem]">{priceLabel}</p>
        <p className="mt-2 text-[14px] font-bold text-white/90 sm:text-[17px]">{location}</p>
      </div>
    </>
  );
}

function GalleryNav({ count, activeIndex, previous, next, open }: { count: number; activeIndex: number; previous: () => void; next: () => void; open: () => void }) {
  return (
    <>
      <button type="button" onClick={previous} className="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Photo précédente"><ChevronLeft size={22} /></button>
      <button type="button" onClick={next} className="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Photo suivante"><ChevronRight size={22} /></button>
      <button type="button" onClick={open} className="absolute bottom-4 right-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-[11px] font-extrabold text-[#0B2545] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE]" aria-label={`Ouvrir les ${count} photos en plein écran`}>
        <Maximize2 size={16} /> {activeIndex + 1}/{count}
      </button>
    </>
  );
}
