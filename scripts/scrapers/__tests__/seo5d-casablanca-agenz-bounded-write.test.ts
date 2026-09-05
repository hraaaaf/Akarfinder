import assert from "node:assert/strict";
import test from "node:test";
import {
  SEO5D_MAX_WRITES,
  SEO5D_WRITE_CONFIRMATION,
  boundSeo5dWriteLimit,
  hasSeo5dWriteConfirmation,
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
