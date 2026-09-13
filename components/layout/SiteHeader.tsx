"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Menu, UserRound, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { useFavoriteSelection } from "@/components/favorites/useFavoriteSelection";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { PRODUCT_PRIMARY_NAV, isPrimaryProductPath } from "@/lib/product-navigation";

type SiteHeaderProps = {
  variant?: "light" | "dark" | "transparent";
  compact?: boolean;
  fluid?: boolean;
  searchMode?: boolean;
};

const professionalAudience = "agences et promoteurs";

export function SiteHeader({
  variant = "light",
  compact = false,
  fluid = false,
  searchMode = false,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const isDark = variant === "dark";
  const isTransparent = variant === "transparent";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { ids: favoriteIds } = useFavoriteSelection();
  const favoriteCount = favoriteIds.length;

  useEffect(() => {
    if (!isTransparent) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isTransparent]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const renderMobileMenu = (dark = false) =>
    menuOpen ? (
      <nav
        aria-label="Navigation mobile principale"
        data-product-primary-nav="p2-ia-v1-mobile"
        className={dark
          ? "border-t border-white/8 bg-[#071B33] px-4 py-3 lg:hidden"
          : "border-t border-slate-200 bg-white px-4 py-3 lg:hidden"}
      >
        <div className="grid grid-cols-2 gap-2">
          {PRODUCT_PRIMARY_NAV.map((item) => {
            const active = isPrimaryProductPath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.href === "/pro" ? `Espace Pro — ${professionalAudience}` : undefined}
                aria-current={active ? "page" : undefined}
                className={`min-h-11 rounded-xl border px-3 py-3 text-[13px] font-bold transition ${
                  active
                    ? "border-[#0B63CE] bg-[#0B63CE] text-white"
                    : dark
                      ? "border-white/10 bg-white/[0.045] text-white/75 hover:border-[#0B63CE]/40 hover:text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[#0B63CE]/40 hover:text-[#0B2545]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    ) : null;

  if (searchMode) {
    return (
      <header
        data-search-global-header="exact-white"
        data-premium-search-header="ux-premium-header-1"
        data-product-ia="p2-ia-v1"
        className="sticky top-0 z-30 border-b border-slate-200/70 bg-white text-slate-900 shadow-[0_1px_12px_rgba(11,37,69,0.035)]"
      >
        <Container fluid={fluid} className="relative h-[67px] !px-4 sm:!px-6 lg:h-[63px] lg:!px-6">
          <div className="grid h-full grid-cols-[44px_1fr_44px] items-center lg:hidden">
            <button
              type="button"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-11 w-11 place-items-center rounded-full text-[#0B2545] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE]/30"
            >
              {menuOpen ? <X size={23} strokeWidth={1.8} /> : <Menu size={23} strokeWidth={1.8} />}
            </button>
            <Link href="/" className="mx-auto flex items-center rounded-md" aria-label="AkarFinder - accueil">
              <img src="/brand/logo-v2/logo-header-light.png" alt="AkarFinder" width={142} height={35} className="h-[29px] w-auto" />
            </Link>
            <Link href="/mon-projet" aria-label="Mon Projet" className="grid h-11 w-11 place-items-center rounded-full text-[#0B2545] transition hover:bg-slate-100">
              <UserRound size={23} strokeWidth={1.8} />
            </Link>
          </div>

          <div className="hidden h-full items-center justify-between gap-6 lg:flex">
            <div className="flex min-w-0 items-center gap-7">
              <Link href="/" className="flex shrink-0 items-center rounded-md" aria-label="AkarFinder - accueil">
                <img src="/brand/logo-v2/logo-header-light.png" alt="AkarFinder" width={150} height={37} className="h-[31px] w-auto" />
              </Link>
              <nav aria-label="Navigation principale" data-product-primary-nav="p2-ia-v1-desktop">
                <ul className="flex h-[63px] items-center gap-5 xl:gap-7">
                  {PRODUCT_PRIMARY_NAV.map((item) => {
                    const active = isPrimaryProductPath(pathname, item.href);
                    return (
                      <li key={item.href} className="h-full">
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`relative flex h-full items-center px-0.5 text-[13px] font-semibold transition ${active ? "text-[#0B2545] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#0B63CE]" : "text-slate-700 hover:text-[#0B2545]"}`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/favorites" aria-label={favoriteCount > 0 ? `Mes favoris (${favoriteCount})` : "Mes favoris"} className="relative flex h-10 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0B2545]">
                <Heart size={18} fill={favoriteCount > 0 ? "currentColor" : "none"} />
                <span>Favoris</span>
                {favoriteCount > 0 ? <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0B63CE] px-1 text-[9px] font-extrabold text-white">{favoriteCount > 9 ? "9+" : favoriteCount}</span> : null}
              </Link>
              <Link href="/mon-projet" aria-label="Mon Projet" className="grid h-10 w-10 place-items-center rounded-full text-[#0B2545] transition hover:bg-slate-100">
                <UserRound size={21} strokeWidth={1.8} />
              </Link>
            </div>
          </div>
        </Container>
        {renderMobileMenu(false)}
      </header>
    );
  }

  const transparentActive = isTransparent && !scrolled;
  const darkSurface = isDark || (isTransparent && scrolled);
  const linkClass = (active: boolean) =>
    `relative rounded-full ${compact ? "px-1.5 py-1 text-[12.5px]" : "px-2 py-1.5 text-[13.5px]"} font-semibold transition ${
      active
        ? darkSurface || transparentActive
          ? "text-white after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-bronze-400"
          : "text-slate-900 after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[#0B63CE]"
        : darkSurface || transparentActive
          ? "text-white/78 hover:text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header
      data-search-global-header={compact ? "compact" : undefined}
      data-product-ia="p2-ia-v1"
      className={`z-50 border-b transition-all duration-300 ${isTransparent ? "fixed left-0 right-0 top-0" : "sticky top-0 z-30"} ${
        transparentActive
          ? "border-transparent bg-transparent text-white"
          : darkSurface
            ? "border-white/10 bg-[rgba(7,27,51,0.97)] text-white shadow-[0_16px_40px_rgba(2,10,24,0.28)] backdrop-blur"
            : "border-slate-200/80 bg-white text-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05)] backdrop-blur"
      }`}
    >
      <Container fluid={fluid} className={`flex items-center justify-between gap-3 ${compact ? "py-1.5 sm:py-2" : "py-2.5 sm:py-3"}`}>
        <Link href="/" className="flex min-w-0 items-center" aria-label="AkarFinder - accueil">
          <img
            src={darkSurface || transparentActive ? "/brand/logo-v2/logo-header-dark.png" : "/brand/logo-v2/logo-header-light.png"}
            alt="AkarFinder"
            width={132}
            height={33}
            className={compact ? "h-[23px] w-auto sm:h-[28px]" : "h-[25px] w-auto sm:h-[34px]"}
          />
        </Link>

        <nav aria-label="Navigation principale" className="hidden lg:block" data-product-primary-nav="p2-ia-v1-desktop">
          <ul className={`flex items-center ${compact ? "gap-1.5 xl:gap-2.5" : "gap-2.5 xl:gap-4"}`}>
            {PRODUCT_PRIMARY_NAV.map((item) => {
              const active = isPrimaryProductPath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle className="h-9 w-9" />
          <Link
            href="/favorites"
            aria-label={favoriteCount > 0 ? `Mes favoris (${favoriteCount})` : "Mes favoris"}
            className={`relative hidden h-9 w-9 items-center justify-center rounded-full transition sm:flex ${darkSurface || transparentActive ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-red-50 hover:text-red-500"}`}
          >
            <Heart size={18} fill={favoriteCount > 0 ? "currentColor" : "none"} />
            {favoriteCount > 0 ? <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold text-white">{favoriteCount > 9 ? "9+" : favoriteCount}</span> : null}
          </Link>
          <Link
            href="/mon-projet"
            aria-current={pathname.startsWith("/mon-projet") ? "page" : undefined}
            className={compact
              ? darkSurface || transparentActive
                ? "rounded-lg border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11.5px] font-bold text-white transition hover:bg-white/[0.14] sm:px-3.5 sm:text-[12.5px]"
                : "rounded-lg border border-[#0B63CE]/20 bg-[#0B63CE]/[0.06] px-3 py-1.5 text-[11.5px] font-bold text-[#0B63CE] transition hover:bg-[#0B63CE]/[0.10] sm:px-3.5 sm:text-[12.5px]"
              : "rounded-xl bg-[#0B63CE] px-3 py-2 text-[11.5px] font-bold text-white shadow-[0_4px_14px_rgba(11,99,206,0.24)] transition hover:bg-[#084BA8] sm:px-4 sm:text-[13px]"}
          >
            Mon Projet
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className={`grid h-9 w-9 place-items-center rounded-full lg:hidden ${darkSurface || transparentActive ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"}`}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </Container>
      {renderMobileMenu(darkSurface || transparentActive)}
    </header>
  );
}
