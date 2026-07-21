// OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 — Phase 9, items 4-5.
// Tests runOpenSerpLiveQuery's classification of engine-call outcomes on
// both paths. HTTP path: monkeypatches the global fetch (a plain
// reassignment, not a module import). CLI path: mocks node:child_process's
// execFile via node:test's module-mocking API, so the real OS-level
// timeout/kill semantics never need to run for real -- zero real
// subprocess, zero real waiting. Run via the dedicated
// `test:openserp-time-budget-and-lock-safety` npm script (requires
// --experimental-test-module-mocks).

import assert from "node:assert/strict";
import { test, mock, before } from "node:test";

const originalFetch = globalThis.fetch;

let runOpenSerpLiveQuery: typeof import("../../../lib/openserp-ingestion/openserp-live").runOpenSerpLiveQuery;
let EngineCallError: typeof import("../../../lib/openserp-ingestion/openserp-live").EngineCallError;

before(async () => {
  mock.module("node:child_process", {
    namedExports: {
      execFile: (
        _file: string,
        _args: string[],
        _opts: unknown,
        callback: (error: Error | null, result?: { stdout: string; stderr: string }) => void,
      ) => {
        const behavior = (globalThis as { __fakeExecFileBehavior?: string }).__fakeExecFileBehavior ?? "success";
        if (behavior === "timeout") {
          const err = Object.assign(new Error("command timed out"), { killed: true, signal: "SIGTERM" });
          callback(err);
          return;
        }
        if (behavior === "invalid_json") {
          callback(null, { stdout: "not json{{{", stderr: "" });
          return;
        }
        callback(null, { stdout: JSON.stringify({ query: { text: "ok" }, results: [] }), stderr: "" });
      },
    },
  });

  const mod = await import("../../../lib/openserp-ingestion/openserp-live");
  runOpenSerpLiveQuery = mod.runOpenSerpLiveQuery;
  EngineCallError = mod.EngineCallError;
});

test("item 4: HTTP path classifies an aborted (timed-out) call as engine_timeout", async () => {
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        reject(err);
      });
    });
  }) as typeof fetch;

  try {
    await assert.rejects(
      runOpenSerpLiveQuery({
        engine: "duckduckgo",
        query: "test",
        limit: 5,
        env: {
          PUBLIC_INDEX_POC_ENABLED: "true",
          OPENSERP_ASYNC_FEEDER_ENABLED: "true",
          OPENSERP_LOCAL_URL: "http://fake-openserp.internal",
        },
        timeoutMs: 50,
      }),
      (error: unknown) => {
        assert.ok(error instanceof EngineCallError);
        assert.equal(error.outcome, "engine_timeout");
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("item 5a: HTTP path classifies a non-JSON response as invalid_response", async () => {
  globalThis.fetch = (async () => {
    return {
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token in JSON");
      },
    } as unknown as Response;
  }) as typeof fetch;

  try {
    await assert.rejects(
      runOpenSerpLiveQuery({
        engine: "bing",
        query: "test",
        limit: 5,
        env: {
          PUBLIC_INDEX_POC_ENABLED: "true",
          OPENSERP_ASYNC_FEEDER_ENABLED: "true",
          OPENSERP_LOCAL_URL: "http://fake-openserp.internal",
        },
        timeoutMs: 1000,
      }),
      (error: unknown) => {
        assert.ok(error instanceof EngineCallError);
        assert.equal(error.outcome, "invalid_response");
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("item 5b: HTTP path classifies a rejected fetch (connection refused, etc.) as network_error", async () => {
  globalThis.fetch = (async () => {
    throw new Error("ECONNREFUSED");
  }) as typeof fetch;

  try {
    await assert.rejects(
      runOpenSerpLiveQuery({
        engine: "ecosia",
        query: "test",
        limit: 5,
        env: {
          PUBLIC_INDEX_POC_ENABLED: "true",
          OPENSERP_ASYNC_FEEDER_ENABLED: "true",
          OPENSERP_LOCAL_URL: "http://fake-openserp.internal",
        },
        timeoutMs: 1000,
      }),
      (error: unknown) => {
        assert.ok(error instanceof EngineCallError);
        assert.equal(error.outcome, "network_error");
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("item 4b: CLI path classifies a killed subprocess (real Vercel-equivalent timeout signal) as engine_timeout", async () => {
  (globalThis as { __fakeExecFileBehavior?: string }).__fakeExecFileBehavior = "timeout";
  try {
    await assert.rejects(
      runOpenSerpLiveQuery({ engine: "bing", query: "test", limit: 5, env: {}, timeoutMs: 5000 }),
      (error: unknown) => {
        assert.ok(error instanceof EngineCallError);
        assert.equal(error.outcome, "engine_timeout");
        return true;
      },
    );
  } finally {
    delete (globalThis as { __fakeExecFileBehavior?: string }).__fakeExecFileBehavior;
  }
});

test("item 5c: CLI path classifies invalid JSON stdout as invalid_response", async () => {
  (globalThis as { __fakeExecFileBehavior?: string }).__fakeExecFileBehavior = "invalid_json";
  try {
    await assert.rejects(
      runOpenSerpLiveQuery({ engine: "ecosia", query: "test", limit: 5, env: {}, timeoutMs: 5000 }),
      (error: unknown) => {
        assert.ok(error instanceof EngineCallError);
        assert.equal(error.outcome, "invalid_response");
        return true;
      },
    );
  } finally {
    delete (globalThis as { __fakeExecFileBehavior?: string }).__fakeExecFileBehavior;
  }
});
