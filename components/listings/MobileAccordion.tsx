"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type MobileAccordionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function MobileAccordion({ title, children, defaultOpen = false }: MobileAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-[1.4rem] border border-[#eadfca] bg-white px-5 py-4 shadow-[0_4px_14px_rgba(7,27,51,0.04)] transition hover:border-[#dcc89a] lg:hidden"
      >
        <span className="text-[0.97rem] font-extrabold tracking-[-0.02em] text-deepblue">
          {title}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2.4}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div className={`${open ? "mt-2" : "hidden"} lg:mt-0 lg:block`}>
        {children}
      </div>
    </div>
  );
}
