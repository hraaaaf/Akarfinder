import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UX-PREMIUM-BOTTOMNAV-GLASS-1 source contract", () => {
  const nav = fs.readFileSync("components/layout/MobileBottomNav.tsx", "utf8");
  assert.match(nav, /data-premium-bottomnav="ux-premium-bottomnav-glass-1"/);
  assert.match(nav, /backdrop-blur-\[20px\]/);
  assert.match(nav, /rounded-\[24px\]/);
  assert.match(nav, /h-\[66px\]/);
  assert.match(nav, /href: "\/search"/);
  assert.match(nav, /href: "\/favorites"/);
  assert.match(nav, /href: "\/vendre"/);
  assert.match(nav, /href: "\/contact"/);
  assert.match(nav, /href: "\/mon-projet"/);
  assert.match(nav, /label: "Publier"/);
  assert.match(nav, /label: "Contact"/);
});
