import type { PackageScoreResult, PackageScoreLabel, PackageSignalLevel } from "@/lib/package-score/types";

function overallBadgeStyle(label: PackageScoreLabel): string {
  if (label === "Excellent package") return "border border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]";
  if (label === "Bon package") return "border border-[#6ee7b7] bg-[#d1fae5] text-[#047857]";
  if (label === "Package correct") return "border border-[#fde68a] bg-[#fffbeb] text-[#92400e]";
  if (label === "À analyser") return "border border-[#e5e7eb] bg-[#f9fafb] text-gray-600";
  return "border border-[#e5e7eb] bg-[#f9fafb] text-gray-400";
}

function overallLabelText(label: PackageScoreLabel): string {
  if (label === "Excellent package") return "Niveau d'information élevé";
  if (label === "Bon package") return "Niveau d'information solide";
  if (label === "Package correct") return "Niveau d'information correct";
  return label;
}

function signalDot(level: PackageSignalLevel): React.ReactNode {
  const base = "h-2.5 w-2.5 shrink-0 rounded-full";
  if (level === "high") return <span className={`${base} bg-emerald-500`} aria-hidden="true" />;
  if (level === "medium") return <span className={`${base} bg-amber-400`} aria-hidden="true" />;
  if (level === "low") return <span className={`${base} bg-red-400`} aria-hidden="true" />;
  return <span className={`${base} bg-gray-300`} aria-hidden="true" />;
}

function signalLevelLabel(level: PackageSignalLevel): string {
  if (level === "high") return "Fort";
  if (level === "medium") return "Correct";
  if (level === "low") return "Limité";
  return "—";
}

type SignalRowProps = {
  category: string;
  signal: PackageScoreResult["signals"]["reliability"];
};

function SignalRow({ category, signal }: SignalRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f3ea] px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {signalDot(signal.level)}
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-gray-500">
            {category}
          </p>
          <p className="text-[13px] font-bold leading-snug text-deepblue">{signal.label}</p>
        </div>
      </div>
      {signal.level !== "insufficient" ? (
        <div className="shrink-0 text-right">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
            signal.level === "high"
              ? "bg-emerald-50 text-emerald-700"
              : signal.level === "medium"
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-600"
          }`}>
            {signalLevelLabel(signal.level)}
          </span>
          {signal.detail ? (
            <p className="mt-0.5 text-[11px] text-gray-400">{signal.detail}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type PackageScoreBlockProps = {
  result: PackageScoreResult;
};

export function PackageScoreBlock({ result }: PackageScoreBlockProps) {
  return (
    <div className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-gray-500">
            Niveau d'information AkarFinder
          </p>
          <p className="mt-1.5 text-[1.2rem] font-extrabold tracking-[-0.03em] text-deepblue">
            {overallLabelText(result.overall_label)}
          </p>
        </div>
        <span className={`mt-0.5 rounded-full border px-3 py-1.5 text-[12px] font-extrabold ${overallBadgeStyle(result.overall_label)}`}>
          {result.overall_score > 0 ? `${result.overall_score}/100` : "—"}
        </span>
      </div>

      {result.overall_label !== "Données insuffisantes" ? (
        <p className="mt-3 text-[13.5px] leading-6 text-gray-600">{result.summary}</p>
      ) : (
        <p className="mt-3 text-[13.5px] leading-6 text-gray-500">
          Données insuffisantes pour calculer un package global.
        </p>
      )}

      <div className="mt-4 space-y-2">
        <SignalRow category="Niveau d'information" signal={result.signals.reliability} />
        <SignalRow category="Vie quotidienne" signal={result.signals.proximity} />
        <SignalRow category="Repère prix" signal={result.signals.market_price} />
      </div>

      <p className="mt-4 border-t border-[#f0e6d2] pt-3 text-[11.5px] leading-5 text-gray-400">
        {result.disclaimer}
      </p>
    </div>
  );
}
