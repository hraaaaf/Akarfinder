# AkarFinder — Autonomous Recrawl Micro-Batch V1

## Objective

Activate the smallest safe autonomous execution boundary above the certified transactional recrawl pipeline.

## Hard limits

- source allowlist: Mubawab only;
- maximum three claimed offers per run;
- sequential execution only;
- dry-run by default;
- no pagination or category/list-page crawling;
- no CAPTCHA, login, proxy, stealth or bypass;
- a policy block or unexpected exception opens the circuit immediately;
- all remaining claims are released after the circuit opens;
- `publication_eligible=false` remains mandatory.

## Execution contract

For each claimed source offer, the executor must:

1. resolve the existing canonical individual listing URL;
2. apply the certified source policy and robots gate;
3. perform one bounded fetch;
4. call the certified transactional recrawl RPC;
5. return only an internal outcome: committed, unchanged, retry, blocked or failed.

The orchestrator never writes listing or SERP tables directly.

## Circuit breaker

The run stops after the first policy block or uncaught exception. No later job is fetched. Remaining leases are released with an explicit internal reason.

## Certification boundary

This LOT first certifies the orchestrator, hard limits and fail-closed behaviour in CI. A real three-offer Production micro-batch is a separate controlled proof after the connected repository/executor wiring is reviewed. There is no recurring schedule and no mass activation in this V1.
