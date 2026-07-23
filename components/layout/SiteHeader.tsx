"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { useFavoriteSelection } from "@/components/favorites/useFavoriteSelection";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { navItems } from "@/lib/site";

type SiteHeaderProps = {
  variant?: "light" | "dark" | "transparent";
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
        isTransparent ? "fixed left-0 right-0 top-0" : "sticky top-0 z-30"
      } ${
        transparentActive
          ? "border-white/0 bg-black/0 text-white shadow-none backdrop-blur-[0px]"
          : isDark || (isTransparent && scrolled)
          ? "border-white/10 bg-[rgba(7,27,51,0.97)] text-white shadow-[0_18px_45px_rgba(2,10,24,0.32)] backdrop-blur"
          : "border-border/20 bg-white/96 text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-white/88 dark:border-white/10 dark:bg-[rgba(7,27,51,0.97)] dark:text-white dark:shadow-[0_18px_45px_rgba(2,10,24,0.32)] dark:supports-[backdrop-filter]:bg-[rgba(7,27,51,0.95)]"
      }`}
    >
      <Container
        className={`flex items-center justify-between gap-2 sm:gap-5 sm:py-4 ${
          compact ? "py-2 sm:py-3" : "py-2.5 sm:py-3"
        }`}
      >
        <Link href="/" className="flex min-w-0 items-center" aria-label="AkarFinder - accueil">
          {isDark || isTransparent ? (
            <img
              src="/brand/logo-v2/logo-header-dark.png"
              alt="AkarFinder"
              width={132}
              height={33}
              className={`h-[24px] w-auto sm:h-[34px] ${
                transparentActive ? "drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]" : ""
              }`}
            />
          ) : (
            <>
              <img
                src="/brand/logo-v2/logo-header-light.png"
                alt="AkarFinder"
                width={132}
                height={33}
                className="h-[24px] w-auto sm:h-[34px] dark:hidden"
              />
              <img
                src="/brand/logo-v2/logo-header-dark.png"
                alt="AkarFinder"
                width={132}
                height={33}
                className="hidden h-[24px] w-auto sm:h-[34px] dark:block"
              />
            </>
          )}
        </Link>

        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul
            className={`flex items-center gap-6 text-[13.5px] font-semibold ${
              isDark || isTransparent
                ? "text-white/88"
                : "text-foreground/80 hover:text-foreground dark:text-white/88"
            }`}
          >
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href.split("?")[0]) && item.href !== "/";

              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`relative rounded-full px-1.5 py-1 pb-1.5 transition-colors ${
                      isActive
                        ? `${
                            isDark || isTransparent
                              ? "text-white"
                              : "text-foreground dark:text-white"
                          } after:absolute after:bottom-0 after:left-1.5 after:right-1.5 after:h-[2px] after:rounded-full after:bg-[#0B63CE] after:content-['']`
                        : ""
                    } ${
                      isDark || isTransparent
                        ? "hover:text-white"
                        : "hover:bg-surface-muted hover:text-foreground dark:hover:bg-white/10 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle className="h-8 w-8 sm:h-9 sm:w-9" />
          <Link
            href="/favorites"
            aria-label={favoriteCount > 0 ? `Mes favoris (${favoriteCount})` : "Mes favoris"}
            className={`relative hidden h-8 w-8 items-center justify-center rounded-full transition sm:flex sm:h-9 sm:w-9 ${
              isDark || isTransparent
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-muted-foreground hover:bg-red-50 hover:text-red-400 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            }`}
          >
            <Heart
              size={18}
              strokeWidth={2}
              fill={favoriteCount > 0 ? "currentColor" : "none"}
              className={
                favoriteCount > 0
                  ? isDark || transparentActive
                    ? "text-red-300"
                    : "text-red-400"
                  : ""
              }
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
                : "border border-bronze-700/30 bg-card text-bronze-700 hover:border-bronze-700/60 hover:bg-[#fef8ed] dark:border-bronze-500/40 dark:bg-white/5 dark:text-bronze-400 dark:hover:bg-bronze-700/20 dark:hover:text-bronze-300"
            } ${pathname.startsWith("/pro") ? "border-bronze-700/60" : ""}`}
          >
            Espace Pro
          </Link>

          <Link
            href="/mon-projet"
            className={`rounded-xl px-3 py-1.5 text-[11.5px] font-bold transition sm:px-5 sm:py-2.5 sm:text-[13px] ${
              isDark || isTransparent
                ? "border border-[#60A5FA]/45 bg-white/8 text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:bg-[#0B63CE] hover:text-white"
                : "border border-[#60A5FA]/55 bg-[#0B63CE] text-white shadow-[0_4px_14px_rgba(11,99,206,0.26)] hover:bg-[#084BA8] dark:border-[#60A5FA]/45 dark:bg-white/5 dark:hover:bg-[#0B63CE] dark:hover:text-white"
            }`}
          >
            Mon projet
          </Link>
        </div>
      </Container>

      <div
        className={`overflow-x-auto border-t scrollbar-none lg:hidden ${
          isDark || isTransparent
            ? "border-white/8 bg-transparent"
            : "border-border/10 bg-white/96 dark:border-white/8 dark:bg-transparent"
        }`}
      >
        <div className={`flex px-4 ${compact ? "gap-1.5 py-1.5" : "gap-2 py-2"}`}>
          {[
            { href: "/acheter", label: "Acheter", aria: "Explorer les biens a acheter" },
            { href: "/louer", label: "Louer", aria: "Explorer les locations" },
            { href: "/neuf", label: "Neuf", aria: "Decouvrir les projets neufs" },
            { href: "/vendre", label: "Vendre", aria: "Preparer la vente de votre bien" },
            { href: "/promoteurs", label: "Promoteurs", aria: "Decouvrir l'espace promoteurs" },
            { href: "/search", label: "Recherche", aria: "Rechercher des biens" },
          ].map((chip) => {
            const isActive = pathname.startsWith(chip.href);
            return (
              <Link
                key={chip.href}
                href={chip.href}
                aria-label={chip.aria}
                className={`flex-shrink-0 whitespace-nowrap rounded-full border font-bold transition focus:outline-none focus:ring-2 focus:ring-[#60A5FA] ${
                  compact ? "px-2.5 py-1 text-[10.5px]" : "px-3 py-1 text-[11px]"
                } ${
                  isActive
                    ? isDark || isTransparent
                      ? "border-[#60A5FA]/60 bg-[#0B63CE]/18 text-white"
                      : "border-[#0B63CE] bg-[#0B63CE] text-white dark:border-[#60A5FA]/60 dark:bg-[#0B63CE]/18 dark:text-white"
                    : isDark || isTransparent
                    ? "border-white/15 bg-white/6 text-white/80 hover:bg-white/12 hover:text-white"
                    : "border-blue-200 bg-blue-50 text-deepblue hover:border-[#0B63CE] hover:bg-blue-100 dark:border-white/15 dark:bg-white/6 dark:text-white/80 dark:hover:border-white/25 dark:hover:bg-white/12"
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
