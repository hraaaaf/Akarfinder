export type FinanceAssumptions = {
  propertyPriceMad: number;
  downPaymentMad: number;
  annualRatePct: number;
  durationYears: number;
  assumptionsVersion: string;
  assumptionsObservedAt: string;
};

export type FinanceSimulation = {
  financedPrincipalMad: number;
  monthlyPaymentMad: number;
  totalPaymentsMad: number;
  totalInterestMad: number;
  monthlyRate: number;
  paymentCount: number;
  assumptionsVersion: string;
  assumptionsObservedAt: string;
};

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function roundMad(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function simulateFinanceMaroc(input: FinanceAssumptions): FinanceSimulation | null {
  if (!Number.isFinite(input.propertyPriceMad) || input.propertyPriceMad <= 0) return null;
  if (!finiteNonNegative(input.downPaymentMad) || input.downPaymentMad > input.propertyPriceMad) return null;
  if (!finiteNonNegative(input.annualRatePct) || input.annualRatePct > 100) return null;
  if (!Number.isInteger(input.durationYears) || input.durationYears <= 0 || input.durationYears > 50) return null;
  if (!input.assumptionsVersion.trim()) return null;
  if (!Number.isFinite(Date.parse(input.assumptionsObservedAt))) return null;

  const financedPrincipalMad = input.propertyPriceMad - input.downPaymentMad;
  const paymentCount = input.durationYears * 12;
  const monthlyRate = input.annualRatePct / 100 / 12;

  let monthlyPaymentMad = 0;
  if (financedPrincipalMad > 0) {
    monthlyPaymentMad = monthlyRate === 0
      ? financedPrincipalMad / paymentCount
      : financedPrincipalMad * (monthlyRate * Math.pow(1 + monthlyRate, paymentCount)) /
        (Math.pow(1 + monthlyRate, paymentCount) - 1);
  }

  const totalPaymentsMad = monthlyPaymentMad * paymentCount;
  return {
    financedPrincipalMad: roundMad(financedPrincipalMad),
    monthlyPaymentMad: roundMad(monthlyPaymentMad),
    totalPaymentsMad: roundMad(totalPaymentsMad),
    totalInterestMad: roundMad(Math.max(0, totalPaymentsMad - financedPrincipalMad)),
    monthlyRate,
    paymentCount,
    assumptionsVersion: input.assumptionsVersion,
    assumptionsObservedAt: input.assumptionsObservedAt,
  };
}

export const FINANCE_MAROC_DISCLAIMER =
  "Simulation indicative uniquement. Elle ne constitue ni une offre de crédit ni un taux bancaire garanti. Les frais d’acquisition ne sont pas inclus sans source et version explicites.";
