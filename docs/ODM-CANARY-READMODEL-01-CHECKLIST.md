# ODM-CANARY-READMODEL-01 — approval checklist

This checklist is deliberately separate from activation.

## Required before activation PR

- [ ] Main branch CI green.
- [ ] ODM Shadow reports green on current data.
- [ ] Source Registry unresolved-policy rate at or below 5%.
- [ ] Dual-read implementation reviewed with no response mutation.
- [ ] Aggregated metrics verified without personal data.
- [ ] Stable routing key documented.
- [ ] Rollback owner identified.
- [ ] Alert destination tested.
- [ ] Synthetic rehearsal passes.
- [ ] Explicit production approval recorded.

## Required before expansion above 1%

- [ ] At least 200 evaluated requests.
- [ ] Observation window completed.
- [ ] No stop-gate breach.
- [ ] Divergence report reviewed.
- [ ] No regression in latency, errors or public field integrity.
- [ ] Separate expansion PR approved.

Unchecked items are blockers, not advisory notes.
