// ZILLOW-LIKE-PROPERTY-DETAIL-DEMO-1
// Internal, clearly-labeled fictional proximity indicator. Deliberately not
// named after any third-party score brand — "Repère démo" / "Score fictif"
// only, never presented as an official or certified measurement.

type DemoScoreCardProps = {
  label: string;
  score: number;
  tag: string;
  criteria: ReadonlyArray<string>;
};

function scoreColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 65) return "#0B63CE";
  return "#d97706";
}

export function DemoScoreCard({ label, score, tag, criteria }: DemoScoreCardProps) {
  const color = scoreColor(score);
  return (
    <div className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-extrabold text-[#0B1F3A]">{label}</p>
        <span className="rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide" style={{ color, borderColor: color, backgroundColor: `${color}14` }}>
          Score fictif
        </span>
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        <span className="text-[2.1rem] font-extrabold leading-none" style={{ color }}>{score}</span>
        <span className="pb-1 text-[12px] font-bold text-slate-400">/100</span>
      </div>
      <p className="mt-1 text-[12px] font-semibold text-slate-500">{tag}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {criteria.map((c) => (
          <span key={c} className="rounded-full border border-[#e4e9f2] bg-[#f8fafc] px-2 py-0.5 text-[10.5px] font-semibold text-slate-500">
            {c}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-slate-400">Indice indicatif — à confirmer sur place.</p>
    </div>
  );
}
