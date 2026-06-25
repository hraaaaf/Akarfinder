"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Share2, MapPin, Clock } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { siteStats } from "@/lib/site";

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 4);
      setCount(Math.round(eased * target));
      if (elapsed < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return count;
}

function parseValue(str: string): { prefix: string; suffix: string; target: number; raw: string } | null {
  if (str === "1 h") return null;
  const prefix = str.startsWith("+") ? "+" : "";
  const digits = str.replace(/[^0-9]/g, "");
  const target = parseInt(digits, 10);
  return { prefix, suffix: "", target, raw: str };
}

function formatFR(n: number): string {
  return n.toLocaleString("fr-FR");
}

function StatCounter({ value, label, icon, delay }: {
  value: string; label: string; icon: React.ReactNode; delay: number;
}) {
  const parsed = parseValue(value);
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = useCountUp(parsed?.target ?? 0, 1400, active);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTimeout(() => setActive(true), delay); obs.disconnect(); } },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  const displayValue = parsed
    ? `${parsed.prefix}${formatFR(count)}`
    : value;

  return (
    <div ref={ref} className="flex items-center gap-3.5 px-4 py-6 sm:px-6 sm:py-7">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
        {icon}
      </span>
      <div>
        <p className={`text-[1.5rem] font-extrabold leading-none tracking-[-0.03em] text-[#2563eb] transition-all sm:text-[1.65rem] ${active ? "opacity-100" : "opacity-0 translate-y-1"}`}
          style={{ transition: "opacity 0.3s ease, transform 0.3s ease" }}>
          {displayValue}
        </p>
        <p className="mt-1 text-[12.5px] font-medium text-gray-500">{label}</p>
      </div>
    </div>
  );
}

const ICONS = [
  <Monitor key="0" size={20} strokeWidth={1.75} />,
  <Share2  key="1" size={20} strokeWidth={1.75} />,
  <MapPin  key="2" size={20} strokeWidth={1.75} />,
  <Clock   key="3" size={20} strokeWidth={1.75} />,
];

export function StatsBar() {
  return (
    <section className="border-b border-gray-100 bg-white">
      <Container>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 md:grid-cols-4 md:divide-y-0">
          {siteStats.map((stat, i) => (
            <StatCounter
              key={stat.label}
              value={stat.value}
              label={stat.label}
              icon={ICONS[i]}
              delay={i * 120}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
