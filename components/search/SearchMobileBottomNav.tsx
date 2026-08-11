"use client";

import Link from "next/link";
import { Bell, Heart, Menu, PlusSquare, Search } from "lucide-react";

const items = [
  { href: "/search", label: "Rechercher", icon: Search, active: true },
  { href: "/favorites", label: "Favoris", icon: Heart },
  { href: "/vendre", label: "Publier", icon: PlusSquare },
  { href: "/compagnon", label: "Alertes", icon: Bell },
] as const;

export function SearchMobileBottomNav() {
  return (
    <nav
      data-search-mobile-bottom-nav
      aria-label="Navigation principale mobile"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-[#DCE3EC] bg-white/98 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_22px_rgba(7,27,51,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-[#071B33]/98 sm:hidden"
    >
      <div className="mx-auto grid min-h-[58px] max-w-[430px] grid-cols-5 px-1">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            data-search-bottom-nav-item={label.toLowerCase()}
            className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold transition-colors ${
              active
                ? "text-[#0B63CE]"
                : "text-[#536273] hover:bg-[#F4F7FA] hover:text-[#12345B] dark:text-white/68 dark:hover:bg-white/8 dark:hover:text-white"
            }`}
          >
            <Icon size={21} strokeWidth={active ? 2.25 : 1.9} aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
        <button
          type="button"
          data-search-bottom-nav-item="menu"
          aria-label="Ouvrir le menu"
          onClick={() => window.dispatchEvent(new CustomEvent("akarfinder:open-mobile-menu"))}
          className="flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold text-[#536273] transition-colors hover:bg-[#F4F7FA] hover:text-[#12345B] dark:text-white/68 dark:hover:bg-white/8 dark:hover:text-white"
        >
          <Menu size={21} strokeWidth={1.9} aria-hidden="true" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
