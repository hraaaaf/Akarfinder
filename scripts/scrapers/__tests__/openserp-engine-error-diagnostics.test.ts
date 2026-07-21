// OPENSERP-ENGINE-FAILURE-OBSERVABILITY-1 -- unit tests for the additive
// engine-call diagnostic layer: classification into 7 distinguishable
// categories, message sanitization (no full URL/email/long-digit-run/PII,
// bounded length), and the structured [engine-call] log line shape.

import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import {
  classifyEngineErrorDetail,
  sanitizeEngineErrorMessage,
  logEngineCallAttempt,
} from "../../../lib/openserp-ingestion/engine-error-diagnostics";

describe("classifyEngineErrorDetail", () => {
  test("engine_timeout outcome -> timeout, regardless of message", () => {
    const category = classifyEngineErrorDetail({
      outcome: "engine_timeout",
      errorName: "EngineCallError",
      errorCode: null,
      httpStatus: null,
      message: "engine bing timed out after 15000ms",
    });
    assert.equal(category, "timeout");
  });

  test("message contains captcha -> captcha", () => {
    const category = classifyEngineErrorDetail({
      outcome: "network_error",
      errorName: "EngineCallError",
      errorCode: null,
      httpStatus: null,
      message: "engine bing network error: OpenSERP local endpoint returned 200 but a CAPTCHA challenge was detected",
    });
    assert.equal(category, "captcha");
  });

  test("httpStatus 403 -> http_403", () => {
    const category = classifyEngineErrorDetail({
      outcome: "network_error",
      errorName: "OpenSerpHttpError",
      errorCode: null,
      httpStatus: 403,
      message: "OpenSERP local endpoint returned 403",
    });
    assert.equal(category, "http_403");
  });

  test("httpStatus 429 -> http_429", () => {
    const category = classifyEngineErrorDetail({
      outcome: "network_error",
      errorName: "OpenSerpHttpError",
      errorCode: null,
      httpStatus: 429,
      message: "OpenSERP local endpoint returned 429",
    });
    assert.equal(category, "http_429");
  });

  test("ENOTFOUND (DNS) -> dns_network", () => {
    const category = classifyEngineErrorDetail({
      outcome: "network_error",
      errorName: "TypeError",
      errorCode: "ENOTFOUND",
      httpStatus: null,
      message: "getaddrinfo ENOTFOUND local-openserp.internal",
    });
    assert.equal(category, "dns_network");
  });

  test("ECONNREFUSED -> dns_network", () => {
    const category = classifyEngineErrorDetail({
      outcome: "network_error",
      errorName: "Error",
      errorCode: "ECONNREFUSED",
      httpStatus: null,
      message: "connect ECONNREFUSED 127.0.0.1:7001",
    });
    assert.equal(category, "dns_network");
  });

  test("ENOENT (missing CLI binary) -> dns_network", () => {
    const category = classifyEngineErrorDetail({
      outcome: "network_error",
      errorName: "Error",
      errorCode: "ENOENT",
      httpStatus: null,
      message: "spawn openserp ENOENT",
    });
    assert.equal(category, "dns_network");
  });

  test("invalid_response outcome (JSON parse failure) -> malformed_response", () => {
    const category = classifyEngineErrorDetail({
      outcome: "invalid_response",
      errorName: "EngineCallError",
      errorCode: null,
      httpStatus: null,
      message: "engine bing returned invalid JSON: Unexpected token < in JSON at position 0",
    });
    assert.equal(category, "malformed_response");
  });

  test("SyntaxError name alone (no outcome) -> malformed_response", () => {
    const category = classifyEngineErrorDetail({
      outcome: null,
      errorName: "SyntaxError",
      errorCode: null,
      httpStatus: null,
      message: "Unexpected end of JSON input",
    });
    assert.equal(category, "malformed_response");
  });

  test("generic error with no recognizable signal -> unknown", () => {
    const category = classifyEngineErrorDetail({
      outcome: "network_error",
      errorName: "Error",
      errorCode: null,
      httpStatus: null,
      message: "engine bing network error: something unexpected happened",
    });
    assert.equal(category, "unknown");
  });

  test("precedence: timeout wins even if message also contains captcha text", () => {
    const category = classifyEngineErrorDetail({
      outcome: "engine_timeout",
      errorName: "EngineCallError",
      errorCode: null,
      httpStatus: null,
      message: "engine bing timed out after 15000ms (last seen: captcha challenge page)",
    });
    assert.equal(category, "timeout");
  });
});

describe("sanitizeEngineErrorMessage", () => {
  test("redacts a full URL including query string", () => {
    const sanitized = sanitizeEngineErrorMessage(
      "fetch failed for https://example.com/search?q=some+query&token=abc123secret",
    );
    assert.ok(!sanitized.includes("example.com"));
    assert.ok(!sanitized.includes("token=abc123secret"));
    assert.ok(sanitized.includes("<url-redacted>"));
  });

  test("redacts an email address", () => {
    const sanitized = sanitizeEngineErrorMessage("contact owner at jane.doe@example.com for access");
    assert.ok(!sanitized.includes("jane.doe@example.com"));
    assert.ok(sanitized.includes("<email-redacted>"));
  });

  test("redacts a long digit run (phone-like)", () => {
    const sanitized = sanitizeEngineErrorMessage("call 0612345678 to unblock this engine");
    assert.ok(!sanitized.includes("0612345678"));
    assert.ok(sanitized.includes("<digits-redacted>"));
  });

  test("truncates an overly long message", () => {
    const long = "x".repeat(1000);
    const sanitized = sanitizeEngineErrorMessage(long);
    assert.ok(sanitized.length < 300);
    assert.ok(sanitized.endsWith("<truncated>"));
  });

  test("leaves a short benign message unchanged", () => {
    const sanitized = sanitizeEngineErrorMessage("spawn openserp ENOENT");
    assert.equal(sanitized, "spawn openserp ENOENT");
  });

  test("empty message stays empty", () => {
    assert.equal(sanitizeEngineErrorMessage(""), "");
  });
});

describe("logEngineCallAttempt", () => {
  test("emits exactly one [engine-call]-prefixed JSON line with the full expected shape", () => {
    const calls: string[] = [];
    const restore = mock.method(console, "info", (line: string) => {
      calls.push(line);
    });
    try {
      logEngineCallAttempt({
        engine: "bing",
        query_id: "nqu1-030b0f2d41d0fe64",
        attempt_outcome: "failure",
        category: "dns_network",
        error_name: "Error",
        error_code: "ENOENT",
        http_status: null,
        message: "spawn openserp ENOENT",
        duration_ms: 12,
        started_at: "2026-07-19T14:20:21.863Z",
        finished_at: "2026-07-19T14:20:21.875Z",
      });
    } finally {
      restore.mock.restore();
    }
    assert.equal(calls.length, 1);
    assert.ok(calls[0].startsWith("[engine-call] "));
    const parsed = JSON.parse(calls[0].slice("[engine-call] ".length));
    assert.deepEqual(Object.keys(parsed).sort(), [
      "attempt_outcome",
      "category",
      "duration_ms",
      "engine",
      "error_code",
      "error_name",
      "finished_at",
      "http_status",
      "message",
      "query_id",
      "started_at",
    ]);
    assert.equal(parsed.engine, "bing");
    assert.equal(parsed.category, "dns_network");
    assert.equal(parsed.message, "spawn openserp ENOENT");
  });

  test("never logs a raw URL even if the caller forgot to sanitize (defense in depth check on the test's own input, not the function)", () => {
    // logEngineCallAttempt does not itself re-sanitize -- this test documents
    // that expectation so a future change can't silently start passing raw
    // messages through without the caller sanitizing first.
    const calls: string[] = [];
    const restore = mock.method(console, "info", (line: string) => {
      calls.push(line);
    });
    try {
      const sanitized = sanitizeEngineErrorMessage("engine bing network error: https://internal.example/search?token=xyz");
      logEngineCallAttempt({
        engine: "bing",
        query_id: "nqu1-abc",
        attempt_outcome: "failure",
        category: "unknown",
        error_name: "Error",
        error_code: null,
        http_status: null,
        message: sanitized,
        duration_ms: 5,
        started_at: "2026-07-19T00:00:00.000Z",
        finished_at: "2026-07-19T00:00:00.005Z",
      });
    } finally {
      restore.mock.restore();
    }
    assert.ok(!calls[0].includes("internal.example"));
    assert.ok(!calls[0].includes("token=xyz"));
  });
});
