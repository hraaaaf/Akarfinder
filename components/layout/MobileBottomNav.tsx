"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Compass, Heart, Map, UserRound } from "lucide-react";

const items = [
  {
    href: "/search",
    label: "Explorer",
    icon: Compass,
    activePrefixes: ["/search", "/acheter", "/louer", "/neuf", "/immobilier", "/quartiers", "/listings"],
  },
  {
    href: "/favorites",
    label: "Favoris",
    icon: Heart,
    activePrefixes: ["/favorites"],
  },
  {
    href: "/map",
    label: "Carte",
    icon: Map,
    activePrefixes: ["/map"],
  },
  {
    href: "/alerts",
    label: "Alertes",
    icon: Bell,
    activePrefixes: ["/alerts"],
  },
  {
    href: "/mon-projet",
    label: "Compte",
    icon: UserRound,
    activePrefixes: ["/mon-projet", "/profil-recherche", "/onboarding"],
  },
] as const;

function matchesPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation mobile"
      data-mobile-bottom-nav="exact-light-blue"
      data-premium-bottomnav="ux-premium-bottomnav-glass-1"
      data-theme="light"
      className="fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-[10px] right-[10px] z-[70] overflow-hidden rounded-[24px] border border-white/75 bg-white/80 text-[#0B2545] shadow-[0_14px_40px_rgba(15,23,42,0.16),0_2px_10px_rgba(15,23,42,0.08)] backdrop-blur-[20px] supports-[backdrop-filter]:bg-white/72 md:hidden"
    >
      <div className="mx-auto grid h-[66px] max-w-lg grid-cols-5 px-1.5 py-1">
        {items.map(({ href, label, icon: Icon, activePrefixes }) => {
          const isActive = activePrefixes.some((prefix) => matchesPath(pathname, prefix));

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              data-mobile-bottom-nav-item={href}
              data-mobile-bottom-nav-active={isActive ? "true" : "false"}
              className={`relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 text-[10px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-inset ${
                isActive ? "bg-[#eef6ff]/95 text-[#0B63CE]" : "text-slate-500 hover:bg-white/70 hover:text-[#0B2545]"
              }`}
            >
              <span
                data-mobile-bottom-nav-icon
                className={`grid h-8 w-10 place-items-center rounded-[14px] transition-colors ${
                  isActive ? "text-[#0B63CE]" : "bg-transparent"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.35 : 2} />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
