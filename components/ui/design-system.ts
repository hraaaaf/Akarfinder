export const ui = {
  page: "bg-background text-foreground",
  pageLight: "bg-[#F8FAFC] text-[#0B1F3A]",
  chrome: "border-slate-200/80 bg-white text-[#0B2545]",
  surface:
    "rounded-2xl border border-border/20 bg-card text-card-foreground shadow-[0_14px_38px_rgba(2,10,24,0.1)] dark:border-white/10 dark:shadow-[0_18px_42px_rgba(2,10,24,0.28)]",
  surfacePremium:
    "rounded-2xl border border-slate-200 bg-white text-[#0B1F3A] shadow-[0_8px_28px_rgba(24,56,96,0.07)]",
  surfaceGlass:
    "rounded-[24px] border border-white/80 bg-white/80 text-[#0B2545] shadow-[0_10px_28px_rgba(15,23,42,0.12),0_2px_8px_rgba(15,23,42,0.06)] backdrop-blur-[20px] supports-[backdrop-filter]:bg-white/74",
  surfaceElevated:
    "rounded-2xl border border-border/20 bg-surface text-foreground dark:border-white/10",
  surfaceMuted:
    "rounded-2xl border border-border/15 bg-surface-muted text-foreground dark:border-white/8",
  field:
    "w-full rounded-xl border border-border/25 bg-card text-foreground outline-none transition placeholder:text-muted-foreground/80 hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-white/12",
  fieldPill:
    "w-full min-h-11 rounded-full border border-slate-200 bg-white px-4 text-[#0B1F3A] outline-none shadow-[0_2px_8px_rgba(24,56,96,0.035)] transition placeholder:text-slate-500 hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/15",
  primaryAction:
    "inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-[0_6px_18px_rgba(11,99,206,0.2)] transition hover:bg-primary/90",
  primaryActionPill:
    "inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 font-extrabold text-white shadow-[0_6px_18px_rgba(11,99,206,0.18)] transition hover:bg-primary/90",
  secondaryAction:
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-border/25 bg-surface px-4 font-bold text-foreground transition hover:border-primary/40 dark:border-white/12",
  secondaryActionPill:
    "inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 font-bold text-[#0B2545] transition hover:border-primary/40 hover:bg-slate-50",
  chip:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-bold text-[#122A49] shadow-[0_2px_8px_rgba(24,56,96,0.035)] transition hover:border-slate-300",
  chipActive:
    "border-primary bg-blue-50 text-primary shadow-[0_0_0_1px_rgba(11,99,206,0.08),0_3px_10px_rgba(11,99,206,0.07)]",
  toolbar:
    "flex min-h-[54px] items-center justify-between gap-2 bg-white text-[#0B1F3A]",
  emptyState:
    "rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-[0_8px_24px_rgba(24,56,96,0.04)]",
  eyebrow:
    "text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary",
  label:
    "text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground",
  body: "text-muted-foreground",
  status: {
    attention:
      "border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100",
    positive:
      "border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100",
    informative:
      "border-primary/25 bg-primary/10 text-primary dark:border-primary/35 dark:bg-primary/15 dark:text-blue-100",
    neutral:
      "border-border/25 bg-surface-muted text-muted-foreground dark:border-white/12",
  },
} as const;
