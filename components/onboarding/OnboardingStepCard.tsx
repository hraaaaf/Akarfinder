"use client";

import { ChevronLeft } from "lucide-react";

type Props = {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  children: React.ReactNode;
};

export function OnboardingStepCard({
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  onContinue,
  continueLabel = "Continuer",
  continueDisabled = false,
  children,
}: Props) {
  const progress = ((step) / totalSteps) * 100;

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-bronze-700">
            Étape {step} / {totalSteps}
          </span>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-[12.5px] font-semibold text-gray-500 hover:text-deepblue transition"
            >
              <ChevronLeft size={14} strokeWidth={2.5} aria-hidden="true" />
              Retour
            </button>
          ) : null}
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#f0e6d2]">
          <div
            className="h-1.5 rounded-full bg-bronze-700 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="rounded-[1.6rem] border border-[#eadfca] bg-white p-6 shadow-[0_12px_38px_rgba(7,27,51,0.08)] sm:p-8">
        <h2 className="text-[1.5rem] font-extrabold tracking-[-0.04em] text-deepblue sm:text-[1.8rem]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-[14px] leading-6 text-gray-500">{subtitle}</p>
        ) : null}

        <div className="mt-6">{children}</div>

        {onContinue ? (
          <button
            type="button"
            onClick={onContinue}
            disabled={continueDisabled}
            className="mt-7 w-full rounded-xl bg-deepblue px-6 py-3.5 text-[15px] font-extrabold text-white shadow-[0_6px_18px_rgba(7,27,51,0.22)] transition hover:bg-[#0d2a4d] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {continueLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
