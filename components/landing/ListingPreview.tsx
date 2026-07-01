"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { WishlistButton } from "@/components/landing/WishlistButton";
import { Container } from "@/components/ui/Container";
import { listingPreviewItems, type ListingPreviewItem } from "@/lib/site";
import type { Listing } from "@/lib/listings/types";

const chips = [
  { label: "Acheter", href: "/acheter", active: true },
  { label: "Louer",   href: "/louer" },
  { label: "Neuf",    href: "/neuf" },
  { label: "MRE",     href: "/mre" },
];

function reliabilityClasses(score?: number) {
  if (score && score >= 80) return "bg-[#dcfce7] text-[#16a34a]";
  if (score && score >= 50) return "bg-[#fef9c3] text-[#a16207]";
  return "bg-[#fee2e2] text-[#dc2626]";
}

function badgeStyle(badge: string, isNew?: boolean) {
  if (isNew || badge === "Nouveau") return "bg-[#2563eb] text-white";
  if (badge === "MRE") return "bg-[#7c3aed] text-white";
  if (badge === "Signal fort") return "bg-[#16a34a] text-white";
  if (badge === "TOP") return "bg-[#ea580c] text-white";
  return "bg-gray-800/75 text-white";
}

function ChevronLeft() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function BedIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 4v16" />
      <path d="M2 8h18a2 2 0 0 1 2 2v10" />
      <path d="M2 17h20" />
      <path d="M6 8v9" />
    </svg>
  );
}

function SqmIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function mapApiListingToPreview(listing: Listing): ListingPreviewItem {
  const priceMad = listing.price_mad ?? 0;
  const pricePerM2 = listing.price_per_m2 ?? 0;
  const surface = listing.surface_m2 ?? 0;
  const reliability = listing.reliability_score ?? 0;

  return {
    title: listing.title,
    location: listing.district
      ? `${listing.district}, ${listing.city}`
      : listing.city,
    price: priceMad > 0 ? `${priceMad.toLocaleString()} DH` : "Prix sur demande",
    pricePerSquareMeter:
      pricePerM2 > 0 ? `${pricePerM2.toLocaleString()} DH/m²` : "Non specifie",
    bedrooms: listing.bedrooms_count,
    surface: surface > 0 ? `${surface} m²` : "Surface inconnue",
    freshness: listing.freshness_label || "Recent",
    reliability: reliability >= 80 ? "Fiabilite elevee" : "A verifier",
    reliabilityTone: reliability >= 80 ? "high" : "medium",
    sourceType: listing.source_name || "AkarFinder",
    imageUrl: listing.image_url || "/skyline-bluehour.jpg",
    badge: listing.is_mre_friendly ? "MRE" : reliability >= 80 ? "TOP" : "",
    isNew: false,
    isFeatured: reliability >= 80,
    listingId: listing.id,
  };
}

export function ListingPreview() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<ListingPreviewItem[]>(listingPreviewItems);
  const [activeIndex, setActiveIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    async function fetchListings() {
      try {
        const res = await fetch("/api/listings?limit=20");
        if (res.ok) {
          const data = await res.json();
          if (data.listings && data.listings.length > 0) {
            const sorted = [...data.listings].sort(
              (
                a: { reliability_score?: number },
                b: { reliability_score?: number }
              ) => (b.reliability_score ?? 0) - (a.reliability_score ?? 0)
            );
            setItems(sorted.map(mapApiListingToPreview));
          }
        }
      } catch (err) {
        console.error("Failed to fetch listings for preview, using mocks", err);
      }
    }
    void fetchListings();
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const cards = scrollRef.current.querySelectorAll("article");
    const card = cards[index];
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setActiveIndex(index);
  }, []);

  const scroll = (dir: -1 | 1) => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.querySelector("article");
    if (!card) return;
    const gap = 20;
    scrollRef.current.scrollBy({
      left: dir * (card.clientWidth + gap),
      behavior: "smooth",
    });
  };

  // Auto-scroll on mobile only
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const timer = setInterval(() => {
      if (pausedRef.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % Math.min(items.length, 5);
        // Delay scroll to next frame so DOM is ready
        requestAnimationFrame(() => scrollToIndex(next));
        return next;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [items.length, scrollToIndex]);

  // Sync activeIndex on manual scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame: number;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const cards = el.querySelectorAll("article");
        const scrollLeft = el.scrollLeft;
        let closest = 0;
        let minDist = Infinity;
        cards.forEach((card, i) => {
          const dist = Math.abs(card.offsetLeft - scrollLeft);
          if (dist < minDist) { minDist = dist; closest = i; }
        });
        setActiveIndex(closest);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);

  const pauseAutoScroll = () => { pausedRef.current = true; };
  const resumeAutoScroll = () => { pausedRef.current = false; };

  return (
    <section id="annonces" className="bg-surface py-10 sm:py-12">
      <Container>
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#2563eb]">
              Biens analyses par AkarFinder
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-foreground sm:text-4xl">
              Les annonces les plus fiables
            </h2>
            <p className="mt-2 max-w-2xl text-[15.5px] leading-7 text-muted-foreground">
              Triees par score de fiabilite AkarFinder - donnees issues de
              sources publiques consolidees.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-full border border-border/15 bg-card p-1 shadow-sm">
              {chips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className={`rounded-full px-3.5 py-2 text-[12px] font-extrabold transition ${
                    chip.active
                      ? "bg-primary-token text-primary-token-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  {chip.label}
                </Link>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => scroll(-1)}
                aria-label="Precedent"
                className="grid h-9 w-9 place-items-center rounded-full border border-border/15 bg-card text-foreground shadow-sm transition hover:bg-surface-muted active:scale-95"
              >
                <ChevronLeft />
              </button>
              <button
                onClick={() => scroll(1)}
                aria-label="Suivant"
                className="grid h-9 w-9 place-items-center rounded-full border border-border/15 bg-card text-foreground shadow-sm transition hover:bg-surface-muted active:scale-95"
              >
                <ChevronRight />
              </button>
            </div>

            <Link
              href="/search"
              className="hidden text-[14px] font-bold text-[#2563eb] transition hover:text-[#1d4ed8] sm:block"
            >
              Voir toutes les annonces →
            </Link>
          </div>
        </div>

        <div className="relative">
          {/* Fade edge to hint horizontal scroll on mobile */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-surface to-transparent lg:hidden"
          />
          <div
            ref={scrollRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            onTouchStart={pauseAutoScroll}
            onTouchEnd={() => setTimeout(resumeAutoScroll, 4000)}
            onMouseEnter={pauseAutoScroll}
            onMouseLeave={resumeAutoScroll}
          >
            {items.slice(0, 5).map((item, i) => (
            <article
              key={item.listingId || item.title + i}
              className="group min-w-[82vw] shrink-0 snap-start overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_4px_18px_rgba(15,40,80,0.07)] transition hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,40,80,0.13)] sm:min-w-[330px] lg:min-w-0"
            >
              <div
                className="relative h-44 bg-cover bg-center bg-gray-100 sm:h-48"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                {item.badge && (
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${badgeStyle(item.badge, item.isNew)}`}
                  >
                    {item.isNew ? "NOUVEAU" : item.isFeatured ? "TOP" : item.badge}
                  </span>
                )}
                <WishlistButton />
                <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {item.sourceType}
                </span>
              </div>

              <div className="p-4">
                <h3 className="truncate text-[15px] font-extrabold leading-5 text-card-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 truncate text-[13px] font-semibold text-muted-foreground">
                  {item.location}
                </p>

                <p className="mt-3 text-[1.35rem] font-black tracking-[-0.035em] text-card-foreground">
                  {item.price}
                </p>
                <p className="mt-0.5 text-[12px] font-bold text-muted-foreground">
                  {item.pricePerSquareMeter}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] font-semibold text-muted-foreground">
                  {item.bedrooms != null && item.bedrooms > 0 && (
                    <span className="flex items-center gap-1">
                      <BedIcon />
                      {item.bedrooms} ch.
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <SqmIcon />
                    {item.surface}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${reliabilityClasses(
                      item.reliabilityTone === "high"
                        ? 85
                        : item.reliabilityTone === "medium"
                          ? 55
                          : 20
                    )}`}
                  >
                    {item.reliability}
                  </span>
                  <Link
                    href={item.listingId ? `/listings/${item.listingId}` : "/search"}
                    className="rounded-full bg-primary-token px-3.5 py-2 text-[12px] font-extrabold text-primary-token-foreground transition hover:opacity-90"
                  >
                    Voir le bien
                  </Link>
                </div>
              </div>
            </article>
          ))}
          </div>
        </div>

        {/* Dot indicators — mobile only */}
        <div className="mt-4 flex justify-center gap-2 lg:hidden" aria-label="Position du carrousel">
          {items.slice(0, 5).map((item, i) => (
            <button
              key={item.listingId || `dot-${i}`}
              onClick={() => { pauseAutoScroll(); scrollToIndex(i); setTimeout(resumeAutoScroll, 5000); }}
              aria-label={`Aller à l'annonce ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 bg-[#2563eb]"
                  : "w-2 bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 text-center sm:hidden">
          <Link href="/search" className="text-[14px] font-bold text-[#2563eb]">
            Voir toutes les annonces →
          </Link>
        </div>
      </Container>
    </section>
  );
}
