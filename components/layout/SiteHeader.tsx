"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Container } from "@/components/ui/Container";
import { useFavoriteSelection } from "@/components/favorites/useFavoriteSelection";
import { navItems } from "@/lib/site";

type SiteHeaderProps = {
  variant?: "light" | "dark" | "transparent";
  /** Allège la hauteur du header + chips sur mobile (desktop inchangé). */
  compact?: boolean;
};

export function SiteHeader({ variant = "light", compact = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const isDark = variant === "dark";
  const isTransparent = variant === "transparent";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isTransparent) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isTransparent]);

  const transparentActive = isTransparent && !scrolled;
  const { ids: favoriteIds } = useFavoriteSelection();
  const favoriteCount = favoriteIds.length;

  return (
    <header
      className={`z-50 border-b transition-all duration-500 ${
        isTransparent
          ? "fixed left-0 right-0 top-0"
          : "sticky top-0 z-30"
      } ${
        transparentActive
          ? "border-white/10 bg-black/10 backdrop-blur-[2px] text-white shadow-none"
          : isDark || (isTransparent && scrolled)
          ? "border-white/10 bg-[rgba(7,27,51,0.97)] text-white shadow-[0_18px_45px_rgba(2,10,24,0.32)] backdrop-blur"
          : "border-gray-200/90 bg-white/96 text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-white/88"
      }`}
    >
      <Container className={`flex items-center justify-between gap-3 sm:gap-5 sm:py-4 ${compact ? "py-2.5" : "py-3"}`}>
        <Link href="/" className="min-w-0" aria-label="AkarFinder - accueil">
          <BrandLogo
            variant={isDark || isTransparent ? "dark" : "default"}
            size="md"
            className={`origin-left scale-[0.95] sm:scale-105 ${transparentActive ? "drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]" : ""}`}
          />
        </Link>

        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className={`flex items-center gap-6 text-[13.5px] font-semibold ${isDark || isTransparent ? "text-white/88" : "text-gray-700"}`}>
            {navItems.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("?")[0]) && item.href !== "/";
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`relative rounded-full px-1.5 py-1 pb-1.5 transition-colors ${
                      isActive
                        ? `${isDark || isTransparent ? "text-white" : "text-deepblue"} after:absolute after:bottom-0 after:left-1.5 after:right-1.5 after:h-[2px] after:rounded-full after:bg-bronze-700 after:content-['']`
                        : ""
                    } ${isDark || isTransparent ? "hover:text-white" : "hover:bg-[#f7f3ea] hover:text-gray-900"}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/favorites"
            aria-label={favoriteCount > 0 ? `Mes favoris (${favoriteCount})` : "Mes favoris"}
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition ${
              isDark || isTransparent ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-gray-400 hover:bg-red-50 hover:text-red-400"
            }`}
          >
            <Heart
              size={18}
              strokeWidth={2}
              fill={favoriteCount > 0 ? "currentColor" : "none"}
              className={favoriteCount > 0 ? (isDark || transparentActive ? "text-red-300" : "text-red-400") : ""}
            />
            {favoriteCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white">
                {favoriteCount > 9 ? "9+" : favoriteCount}
              </span>
            ) : null}
          </Link>
          <Link
            href="/pro"
            className={`hidden rounded-xl px-4 py-2 text-[13px] font-bold transition lg:block ${
              isDark || isTransparent
                ? "border border-bronze-500/40 bg-white/5 text-bronze-400 hover:bg-bronze-700/20 hover:text-bronze-300"
                : "border border-bronze-700/30 bg-[#fffdf8] text-bronze-700 hover:border-bronze-700/60 hover:bg-[#fef8ed]"
            } ${pathname.startsWith("/pro") ? "border-bronze-700/60" : ""}`}
          >
            Espace Pro
          </Link>
          <Link
            href="/search"
            className={`rounded-xl px-4 py-2 text-[13px] font-bold transition sm:px-5 sm:py-2.5 ${
              isDark || isTransparent
                ? "border border-bronze-500/60 bg-white/5 text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:bg-bronze-500 hover:text-deepblue"
                : "bg-deepblue text-white shadow-[0_4px_14px_rgba(7,27,51,0.26)] hover:bg-deepblue-700"
            }`}
          >
            Se connecter
          </Link>
        </div>
      </Container>

      {/* Chips intentions — mobile only */}
      <div className={`lg:hidden overflow-x-auto border-t scrollbar-none ${
        isDark || isTransparent
          ? "border-white/8 bg-transparent"
          : "border-gray-100 bg-white/96"
      }`}>
        <div className={`flex gap-2 px-4 ${compact ? "py-1.5" : "py-2"}`}>
          {[
            { href: "/acheter", label: "Acheter", aria: "Explorer les biens à acheter" },
            { href: "/louer", label: "Louer", aria: "Explorer les locations" },
            { href: "/neuf", label: "Neuf", aria: "Découvrir les projets neufs" },
            { href: "/promoteurs", label: "Promoteurs", aria: "Découvrir l'espace promoteurs" },
            { href: "/search", label: "Recherche", aria: "Rechercher des biens" },
          ].map((chip) => {
            const isActive = pathname.startsWith(chip.href);
            return (
              <Link
                key={chip.href}
                href={chip.href}
                aria-label={chip.aria}
                className={`flex-shrink-0 rounded-full border font-bold transition focus:outline-none focus:ring-2 focus:ring-bronze-500 ${compact ? "px-3 py-1 text-[11.5px]" : "px-3.5 py-1.5 text-[12px]"} ${
                  isActive
                    ? isDark || isTransparent
                      ? "border-bronze-500/60 bg-bronze-700/20 text-white"
                      : "border-deepblue bg-deepblue text-white"
                    : isDark || isTransparent
                    ? "border-white/15 bg-white/6 text-white/80 hover:bg-white/12 hover:text-white"
                    : "border-[#e2d9c9] bg-[#f7f3ea] text-deepblue hover:border-[#c9b99a] hover:bg-[#f0e9d8]"
                }`}
              >
                {chip.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
