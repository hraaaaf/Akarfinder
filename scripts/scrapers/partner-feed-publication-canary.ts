export type CanaryDecision =
  | 'blocked_source'
  | 'blocked_rights'
  | 'blocked_review'
  | 'blocked_dedup'
  | 'blocked_dry_run'
  | 'blocked_limit'
  | 'ready';

export interface CanaryInput {
  sourceActive: boolean;
  rightsAttested: boolean;
  reviewStatus: 'accepted' | 'merged' | 'pending' | 'in_review' | 'rejected';
  dedupDecision: 'new_property' | 'new_offer' | 'update_offer' | 'duplicate' | 'manual_review' | 'invalid';
  dryRunCompleted: boolean;
  itemCount: number;
  canaryLimit: number;
}

export interface CanaryPlan {
  decision: CanaryDecision;
  publicationEligible: false;
  action: 'create_property' | 'create_offer' | 'update_offer' | null;
  reasons: string[];
}

export function planPublicationCanary(input: CanaryInput): CanaryPlan {
  const reasons: string[] = [];
  if (!input.sourceActive) reasons.push('source_not_active');
  if (!input.rightsAttested) reasons.push('rights_not_attested');
  if (!['accepted', 'merged'].includes(input.reviewStatus)) reasons.push('review_not_accepted');
  if (['duplicate', 'manual_review', 'invalid'].includes(input.dedupDecision)) reasons.push('dedup_not_publishable');
  if (!input.dryRunCompleted) reasons.push('dry_run_missing');
  if (input.itemCount < 1 || input.itemCount > input.canaryLimit || input.canaryLimit > 500) reasons.push('canary_limit_exceeded');

  const decision: CanaryDecision = !input.sourceActive
    ? 'blocked_source'
    : !input.rightsAttested
      ? 'blocked_rights'
      : !['accepted', 'merged'].includes(input.reviewStatus)
        ? 'blocked_review'
        : ['duplicate', 'manual_review', 'invalid'].includes(input.dedupDecision)
          ? 'blocked_dedup'
          : !input.dryRunCompleted
            ? 'blocked_dry_run'
            : input.itemCount < 1 || input.itemCount > input.canaryLimit || input.canaryLimit > 500
              ? 'blocked_limit'
              : 'ready';

  const action = decision !== 'ready'
    ? null
    : input.dedupDecision === 'new_property'
      ? 'create_property'
      : input.dedupDecision === 'new_offer'
        ? 'create_offer'
        : 'update_offer';

  return { decision, publicationEligible: false, action, reasons };
}

export function canRollbackBatch(status: string, executedItems: number, rollbackPayloads: number): boolean {
  return ['completed', 'rollback_requested'].includes(status)
    && executedItems > 0
    && executedItems === rollbackPayloads;
}
