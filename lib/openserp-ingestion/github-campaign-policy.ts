// MASS-ACQUISITION-CAMPAIGN-V2
// GitHub `schedule` is a wake-up signal, not a trustworthy clock. The repo
// keeps its canonical */10 trigger, but catch-up work scales with the age of
// the last real engine success so a healthy scheduler stays cheap while a
// delayed/dropped schedule wakes up with bounded extra capacity.

export const CAMPAIGN_MAX_WAVES = 4;

export function resolveCampaignWaveCount(lastSuccessAt: string | null, nowMs = Date.now()): number {
  if (!lastSuccessAt) return CAMPAIGN_MAX_WAVES;
  const last = Date.parse(lastSuccessAt);
  if (!Number.isFinite(last)) return 1;
  const ageMs = Math.max(0, nowMs - last);
  const minute = 60_000;
  if (ageMs <= 20 * minute) return 1;
  if (ageMs <= 45 * minute) return 2;
  if (ageMs <= 90 * minute) return 3;
  return CAMPAIGN_MAX_WAVES;
}
