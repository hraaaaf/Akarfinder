import Link from "next/link";
import { Compass, Heart, MessageCircle, Plus, UserRound } from "lucide-react";

const items = [
  { href: "/search", label: "Explorer", icon: Compass, primary: true },
  { href: "/favorites", label: "Favoris", icon: Heart, primary: false },
  { href: "/vendre", label: "Ajouter", icon: Plus, primary: false },
  { href: "/contact", label: "Messages", icon: MessageCircle, primary: false },
  { href: "/mon-projet", label: "Compte", icon: UserRound, primary: false },
] as const;

export function MobileBottomNav() {
  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid h-[64px] max-w-lg grid-cols-5 px-1">
        {items.map(({ href, label, icon: Icon, primary }) => (
          <Link
            key={href}
            href={href}
            className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors ${
              primary ? "text-[#F97316]" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {label === "Ajouter" ? (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#F97316] text-white shadow-[0_4px_12px_rgba(249,115,22,0.28)]">
                <Icon size={19} strokeWidth={2.35} />
              </span>
            ) : (
              <Icon size={20} strokeWidth={primary ? 2.35 : 2} />
            )}
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
