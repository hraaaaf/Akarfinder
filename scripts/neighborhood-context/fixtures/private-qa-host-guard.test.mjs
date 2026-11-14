import test from "node:test";
import assert from "node:assert/strict";
import { isPrivateQaLoopbackRequest as check } from "../private-qa-host-guard.mjs";

test("J11-C2 host: real local host without forwarded header allowed", () => {
  assert.equal(check("127.0.0.1", "127.0.0.1:3100", null), true);
  assert.equal(check("localhost", "localhost:3000", null), true);
  assert.equal(check("::1", "[::1]:3000", null), true);
});
test("J11-C2 host: spoofed direct host is rejected despite normalized request URL", () => {
  assert.equal(check("127.0.0.1", "evil.invalid", null), false);
  assert.equal(check("127.0.0.1", "127.0.0.1.evil.invalid:3100", null), false);
  assert.equal(check("127.0.0.1", null, null), false);
});
test("J11-C2 host: untrusted X-Forwarded-Host is rejected", () => {
  assert.equal(check("127.0.0.1", "127.0.0.1:3100", "foo.invalid"), false);
  assert.equal(check("127.0.0.1", "127.0.0.1:3100", "localhost, foo.invalid"), false);
  assert.equal(check("127.0.0.1", "127.0.0.1:3100", "localhost"), true);
});
test("J11-C2 host: URL not loopback and malformed headers are rejected", () => {
  assert.equal(check("evil.invalid", "localhost:3100", null), false);
  assert.equal(check("127.0.0.1", "localhost@evil.invalid", null), false);
  assert.equal(check("127.0.0.1", "localhost:3100/path", null), false);
  assert.equal(check("127.0.0.1", " localhost:3100", null), false);
});
