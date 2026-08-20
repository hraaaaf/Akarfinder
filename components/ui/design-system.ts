export const ui = {
  page: "bg-background text-foreground",
  pageLight: "bg-[#F4F8FC] text-[#0B1F3A]",
  chrome: "border-slate-200/80 bg-white text-[#0B2545]",
  searchChrome:
    "border-b border-slate-200/70 bg-white text-slate-900 shadow-[0_1px_12px_rgba(11,37,69,0.035)]",
  surface:
    "rounded-[28px] border border-[#DCE8F5] bg-card text-card-foreground shadow-[0_16px_44px_rgba(11,31,58,0.08)] dark:border-white/10 dark:shadow-[0_18px_42px_rgba(2,10,24,0.28)]",
  surfacePremium:
    "rounded-[28px] border border-[#DCE8F5] bg-white text-[#0B1F3A] shadow-[0_18px_50px_rgba(11,31,58,0.08)]",
  surfaceGlass:
    "rounded-[28px] border border-white/80 bg-white/82 text-[#0B2545] shadow-[0_18px_50px_rgba(11,31,58,0.10)] backdrop-blur-[20px] supports-[backdrop-filter]:bg-white/76",
  surfaceElevated:
    "rounded-[24px] border border-[#DCE8F5] bg-white text-foreground shadow-[0_10px_32px_rgba(11,31,58,0.06)] dark:border-white/10 dark:bg-surface",
  surfaceMuted:
    "rounded-[22px] border border-[#DCE8F5] bg-[#F4F9FF] text-foreground dark:border-white/8 dark:bg-surface-muted",
  subtlePanel:
    "rounded-[20px] border border-[#DCE8F5] bg-[#F7FAFE] text-[#0B1F3A]",
  panelHeader:
    "border-b border-[#DCE8F5] bg-white",
  iconTile:
    "grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-[#DCE8F5] bg-[#EEF6FF] text-[#0B63CE]",
  field:
    "w-full min-h-12 rounded-[14px] border border-[#DCE8F5] bg-white text-foreground outline-none transition placeholder:text-muted-foreground/80 hover:border-[#B8CEE8] focus:border-[#0B63CE] focus:ring-2 focus:ring-[#0B63CE]/15 dark:border-white/12 dark:bg-card",
  fieldPill:
    "w-full min-h-12 rounded-[14px] border border-[#DCE8F5] bg-white px-4 text-[#0B1F3A] outline-none shadow-[0_2px_8px_rgba(24,56,96,0.025)] transition placeholder:text-slate-500 hover:border-[#B8CEE8] focus:border-[#0B63CE] focus:ring-2 focus:ring-[#0B63CE]/15",
  primaryAction:
    "inline-flex min-h-12 items-center justify-center rounded-[14px] bg-[#0B63CE] px-5 py-3 font-extrabold text-white shadow-[0_8px_22px_rgba(11,99,206,0.18)] transition hover:bg-[#0959B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE]/25 active:translate-y-px",
  primaryActionPill:
    "inline-flex min-h-12 items-center justify-center rounded-[14px] bg-[#0B63CE] px-5 py-3 font-extrabold text-white shadow-[0_8px_22px_rgba(11,99,206,0.18)] transition hover:bg-[#0959B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE]/25 active:translate-y-px",
  secondaryAction:
    "inline-flex min-h-12 items-center justify-center rounded-[14px] border border-[#DCE8F5] bg-white px-5 py-3 font-bold text-[#0B2545] transition hover:border-[#B8CEE8] hover:bg-[#F7FAFE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE]/15",
  secondaryActionPill:
    "inline-flex min-h-12 items-center justify-center rounded-[14px] border border-[#DCE8F5] bg-white px-5 py-3 font-bold text-[#0B2545] transition hover:border-[#B8CEE8] hover:bg-[#F7FAFE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE]/15",
  chip:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#DCE8F5] bg-white px-4 text-[13px] font-bold text-[#122A49] shadow-[0_2px_8px_rgba(24,56,96,0.025)] transition hover:border-[#B8CEE8]",
  chipActive:
    "border-[#0B63CE] bg-[#EEF6FF] text-[#0B63CE] shadow-[0_0_0_1px_rgba(11,99,206,0.06),0_3px_10px_rgba(11,99,206,0.06)]",
  toolbar:
    "flex min-h-[56px] items-center justify-between gap-2 bg-white text-[#0B1F3A]",
  emptyState:
    "rounded-[28px] border border-dashed border-[#C9DBEE] bg-white p-8 text-center shadow-[0_14px_38px_rgba(11,31,58,0.05)]",
  eyebrow:
    "text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]",
  label:
    "text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground",
  body: "text-muted-foreground",
  status: {
    attention:
      "border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100",
    positive:
      "border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100",
    informative:
      "border-[#0B63CE]/25 bg-[#EEF6FF] text-[#0B63CE] dark:border-primary/35 dark:bg-primary/15 dark:text-blue-100",
    neutral:
      "border-[#DCE8F5] bg-[#F7FAFE] text-muted-foreground dark:border-white/12 dark:bg-surface-muted",
  },
} as const;
