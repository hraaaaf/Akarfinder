"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, MessageCircle, Plus, UserRound } from "lucide-react";

const items = [
  {
    href: "/search",
    label: "Explorer",
    icon: Compass,
    primary: false,
    activePrefixes: ["/search", "/acheter", "/louer", "/neuf", "/map", "/immobilier", "/quartiers", "/listings"],
  },
  {
    href: "/favorites",
    label: "Favoris",
    icon: Heart,
    primary: false,
    activePrefixes: ["/favorites"],
  },
  {
    href: "/vendre",
    label: "Publier",
    icon: Plus,
    primary: true,
    activePrefixes: ["/vendre"],
  },
  {
    href: "/contact",
    label: "Contact",
    icon: MessageCircle,
    primary: false,
    activePrefixes: ["/contact"],
  },
  {
    href: "/mon-projet",
    label: "Compte",
    icon: UserRound,
    primary: false,
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
        {items.map(({ href, label, icon: Icon, primary, activePrefixes }) => {
          const isActive = activePrefixes.some((prefix) => matchesPath(pathname, prefix));

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              aria-label={primary ? "Publier une annonce" : undefined}
              data-mobile-bottom-nav-item={href}
              data-mobile-bottom-nav-active={isActive ? "true" : "false"}
              data-mobile-bottom-nav-primary={primary ? "true" : "false"}
              className={`relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[18px] px-1 text-[10px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-inset ${
                isActive ? "bg-[#eef6ff]/95 text-[#0B63CE]" : "text-slate-500 hover:bg-white/70 hover:text-[#0B2545]"
              }`}
            >
              <span
                data-mobile-bottom-nav-icon
                data-mobile-bottom-nav-primary-icon={primary ? "true" : undefined}
                className={`grid h-8 w-10 place-items-center rounded-[14px] transition-colors ${
                  primary
                    ? isActive
                      ? "bg-[#0B63CE] text-white"
                      : "bg-[#eaf3ff] text-[#0B63CE]"
                    : isActive
                      ? "text-[#0B63CE]"
                      : "bg-transparent"
                }`}
              >
                <Icon size={20} strokeWidth={isActive || primary ? 2.35 : 2} />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
