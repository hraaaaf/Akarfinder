import test from "node:test";
import assert from "node:assert/strict";

import {
  isPathAllowedByRobotsDirectives,
  parseApplicableRobotsDirectives,
  robotsPatternMatches,
} from "../utils/fetch-html";

test("robots wildcard matching blocks colon pagination and query patterns", () => {
  assert.equal(robotsPatternMatches("/fr/st/rabat/appartements-a-vendre:p:2", "/*:"), true);
  assert.equal(robotsPatternMatches("/fr/st/rabat/appartements-a-vendre", "/*:"), false);
  assert.equal(robotsPatternMatches("/fr/foo?n=1", "/*?n=1"), true);
});

test("robots parser applies wildcard group to AkarFinderResearchBot", () => {
  const text = `
User-agent: GPTBot
Disallow: /private

User-agent: *
Disallow: /login
Disallow: /*:
Disallow: /*?n=1
Allow: /fr/public
`;
  const directives = parseApplicableRobotsDirectives(text);
  assert.equal(isPathAllowedByRobotsDirectives("/fr/public", directives), true);
  assert.equal(isPathAllowedByRobotsDirectives("/login", directives), false);
  assert.equal(isPathAllowedByRobotsDirectives("/fr/st/rabat/appartements-a-vendre:p:2", directives), false);
  assert.equal(isPathAllowedByRobotsDirectives("/fr/foo?n=1", directives), false);
});
