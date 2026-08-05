export const ui = {
  page: "bg-background text-foreground",
  surface:
    "rounded-2xl border border-border/20 bg-card text-card-foreground shadow-[0_14px_38px_rgba(2,10,24,0.1)] dark:border-white/10 dark:shadow-[0_18px_42px_rgba(2,10,24,0.28)]",
  surfaceElevated:
    "rounded-2xl border border-border/20 bg-surface text-foreground dark:border-white/10",
  surfaceMuted:
    "rounded-2xl border border-border/15 bg-surface-muted text-foreground dark:border-white/8",
  field:
    "w-full rounded-xl border border-border/25 bg-card text-foreground outline-none transition placeholder:text-muted-foreground/80 hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-white/12",
  primaryAction:
    "inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-[0_6px_18px_rgba(11,99,206,0.2)] transition hover:bg-primary/90",
  secondaryAction:
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-border/25 bg-surface px-4 font-bold text-foreground transition hover:border-primary/40 dark:border-white/12",
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
