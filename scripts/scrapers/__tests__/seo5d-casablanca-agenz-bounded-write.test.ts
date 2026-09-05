import assert from "node:assert/strict";
import test from "node:test";
import {
  SEO5D_MAX_FETCH_ATTEMPTS,
  SEO5D_MAX_WRITES,
  SEO5D_WRITE_CONFIRMATION,
  boundSeo5dWriteLimit,
  hasSeo5dWriteConfirmation,
  isSeo5dRateLimitError,
  shouldRetrySeo5dFetch,
} from "../seo5d-casablanca-agenz-bounded-write";

test("SEO5D write confirmation fails closed unless exact phrase is supplied", () => {
  assert.equal(hasSeo5dWriteConfirmation(undefined), false);
  assert.equal(hasSeo5dWriteConfirmation("true"), false);
  assert.equal(hasSeo5dWriteConfirmation(`${SEO5D_WRITE_CONFIRMATION} `), false);
  assert.equal(hasSeo5dWriteConfirmation(SEO5D_WRITE_CONFIRMATION), true);
});

test("SEO5D write limit is hard-bounded to the 34 strictly validated prices", () => {
  assert.equal(SEO5D_MAX_WRITES, 34);
  assert.equal(boundSeo5dWriteLimit(1), 1);
  assert.equal(boundSeo5dWriteLimit(12.9), 12);
  assert.equal(boundSeo5dWriteLimit(34), 34);
  assert.equal(boundSeo5dWriteLimit(1000), 34);
  assert.throws(() => boundSeo5dWriteLimit(Number.NaN), /must be finite/);
});

test("SEO5D retries only HTTP 429 and remains attempt-bounded", () => {
  const rateLimited = new Error("HTTP 429 for https://agenz.ma/example");
  assert.equal(SEO5D_MAX_FETCH_ATTEMPTS, 3);
  assert.equal(isSeo5dRateLimitError(rateLimited), true);
  assert.equal(isSeo5dRateLimitError(new Error("HTTP 500 for https://agenz.ma/example")), false);
  assert.equal(shouldRetrySeo5dFetch(rateLimited, 1), true);
  assert.equal(shouldRetrySeo5dFetch(rateLimited, 2), true);
  assert.equal(shouldRetrySeo5dFetch(rateLimited, 3), false);
  assert.equal(shouldRetrySeo5dFetch(new Error("timeout"), 1), false);
});
