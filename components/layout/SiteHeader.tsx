"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Menu, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { useFavoriteSelection } from "@/components/favorites/useFavoriteSelection";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type SiteHeaderProps = {
  variant?: "light" | "dark" | "transparent";
  compact?: boolean;
};

const primaryNav = [
  { href: "/acheter", text: "Acheter" },
  { href: "/louer", text: "Louer" },
  { href: "/neuf", text: "Neuf" },
  { href: "/search", text: "Recherche" },
] as const;

const secondaryNav = [
  { href: "/map", text: "Carte" },
  { href: "/compagnon", text: "Compagnon" },
  { href: "/pro/agences", text: "Agences" },
  { href: "/promoteurs", text: "Promoteurs" },
] as const;

const mobileNav = [
  { href: "/search", label: "Recherche" },
  { href: "/acheter", label: "Acheter" },
  { href: "/louer", label: "Louer" },
  { href: "/vendre", label: "Vendre" },
  { href: "/pro", label: "Pro" },
] as const;

export function SiteHeader({ variant = "light", compact = false }: SiteHeaderProps) {
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

  const transparentActive = isTransparent && !scrolled;
  const darkSurface = isDark || (isTransparent && scrolled);

  const linkClass = (isActive: boolean) =>
    `relative rounded-full px-2 py-1.5 text-[13.5px] font-semibold transition ${
      isActive
        ? darkSurface || transparentActive
          ? "text-white after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-bronze-400"
          : "text-foreground after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[#0B63CE] dark:text-white"
        : darkSurface || transparentActive
          ? "text-white/78 hover:text-white"
          : "text-foreground/70 hover:bg-surface-muted hover:text-foreground dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
    }`;

  return (
    <header
      className={`z-50 border-b transition-all duration-300 ${
        isTransparent ? "fixed left-0 right-0 top-0" : "sticky top-0 z-30"
      } ${
        transparentActive
          ? "border-transparent bg-transparent text-white"
          : darkSurface
            ? "border-white/10 bg-[rgba(7,27,51,0.97)] text-white shadow-[0_16px_40px_rgba(2,10,24,0.28)] backdrop-blur"
            : "border-border/20 bg-white/94 text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/10 dark:bg-[rgba(7,27,51,0.97)] dark:text-white"
      }`}
    >
      <Container
        className={`flex items-center justify-between gap-3 ${compact ? "py-2 sm:py-2.5" : "py-2.5 sm:py-3"}`}
      >
        <Link href="/" className="flex min-w-0 items-center" aria-label="AkarFinder - accueil">
          {darkSurface || transparentActive ? (
            <img
              src="/brand/logo-v2/logo-header-dark.png"
              alt="AkarFinder"
              width={132}
              height={33}
              className="h-[25px] w-auto sm:h-[34px]"
            />
          ) : (
            <>
              <img
                src="/brand/logo-v2/logo-header-light.png"
                alt="AkarFinder"
                width={132}
                height={33}
                className="h-[25px] w-auto sm:h-[34px] dark:hidden"
              />
              <img
                src="/brand/logo-v2/logo-header-dark.png"
                alt="AkarFinder"
                width={132}
                height={33}
                className="hidden h-[25px] w-auto sm:h-[34px] dark:block"
              />
            </>
          )}
        </Link>

        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex items-center gap-4">
            {primaryNav.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={linkClass(isActive)}
                  >
                    {item.text}
                  </Link>
                </li>
              );
            })}
            <li className="group relative">
              <button type="button" className={linkClass(false)} aria-haspopup="menu">
                Plus
              </button>
              <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 translate-y-1 rounded-2xl border border-border/15 bg-card p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 dark:border-white/10 dark:bg-[#0A213D]">
                {secondaryNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-xl px-3 py-2.5 text-[13px] font-semibold text-foreground/75 transition hover:bg-surface hover:text-foreground dark:text-white/75 dark:hover:bg-white/8 dark:hover:text-white"
                  >
                    {item.text}
                  </Link>
                ))}
              </div>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle className="h-9 w-9" />
          <Link
            href="/favorites"
            aria-label={favoriteCount > 0 ? `Mes favoris (${favoriteCount})` : "Mes favoris"}
            className={`relative hidden h-9 w-9 items-center justify-center rounded-full transition sm:flex ${
              darkSurface || transparentActive
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            }`}
          >
            <Heart size={18} fill={favoriteCount > 0 ? "currentColor" : "none"} />
            {favoriteCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold text-white">
                {favoriteCount > 9 ? "9+" : favoriteCount}
              </span>
            ) : null}
          </Link>

          <Link
            href="/vendre"
            className={`hidden rounded-xl border px-3.5 py-2 text-[12.5px] font-bold transition md:block ${
              darkSurface || transparentActive
                ? "border-white/18 bg-white/6 text-white hover:bg-white/12"
                : "border-border/20 bg-card text-foreground/80 hover:border-bronze-500/40 hover:text-foreground dark:border-white/12 dark:bg-white/5 dark:text-white/80"
            }`}
          >
            Publier
          </Link>

          <Link
            href="/mon-projet"
            aria-current={pathname.startsWith("/mon-projet") ? "page" : undefined}
            className="rounded-xl bg-[#0B63CE] px-3 py-2 text-[11.5px] font-bold text-white shadow-[0_4px_14px_rgba(11,99,206,0.24)] transition hover:bg-[#084BA8] sm:px-4 sm:text-[13px]"
          >
            Mon projet
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className={`grid h-9 w-9 place-items-center rounded-full lg:hidden ${
              darkSurface || transparentActive ? "text-white hover:bg-white/10" : "text-foreground hover:bg-surface dark:text-white"
            }`}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </Container>

      {menuOpen ? (
        <nav
          aria-label="Navigation mobile principale"
          className="border-t border-border/10 bg-card px-4 py-3 dark:border-white/8 dark:bg-[#071B33] lg:hidden"
        >
          <div className="grid grid-cols-2 gap-2">
            {mobileNav.map((item) => {
              const isActive =
                item.href === "/pro"
                  ? pathname.startsWith("/pro") || pathname.startsWith("/promoteurs")
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`min-h-10 rounded-xl border px-3 py-3 text-[13px] font-bold transition ${
                    isActive
                      ? "border-[#0B63CE] bg-[#0B63CE] text-white"
                      : "border-border/15 bg-surface text-foreground/75 hover:border-[#0B63CE]/40 hover:text-foreground dark:border-white/10 dark:bg-white/[0.045] dark:text-white/75"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
