import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hashSellerUploadToken, validateSellerPhotoBatch } from "../../../lib/seller/photo-upload";
import { hasExpectedImageSignature } from "../../../lib/seller/photo-signature";

const migration = readFileSync("supabase/migrations/20260805153000_seller_secure_photo_upload_v1.sql", "utf8");
const route = readFileSync("app/api/seller-drafts/[draftId]/photos/route.ts", "utf8");
const leadRoute = readFileSync("app/api/leads/route.ts", "utf8");
const form = readFileSync("components/vendre/SellerSecurePublishForm.tsx", "utf8");
const page = readFileSync("app/vendre/dossier/page.tsx", "utf8");

test("private storage and publication firewall stay explicit", () => {
  assert.match(migration, /'seller-property-drafts'/);
  assert.match(migration, /false,/);
  assert.match(migration, /revoke all on table public\.seller_property_draft_photos from anon, authenticated/);
  assert.match(migration, /publication_eligible/);
  assert.match(route, /publication_eligible: false/);
});

test("draft access uses an opaque token stored only as a hash", () => {
  assert.match(leadRoute, /createSellerUploadToken/);
  assert.match(leadRoute, /upload_token_hash: sellerUpload\?\.tokenHash/);
  assert.match(leadRoute, /seller_upload_token: sellerUpload\?\.token/);
  assert.notEqual(hashSellerUploadToken("draft-secret"), "draft-secret");
  assert.equal(hashSellerUploadToken("draft-secret"), hashSellerUploadToken("draft-secret"));
});

test("photo batch policy rejects unsupported and oversized files", () => {
  assert.equal(validateSellerPhotoBatch([]).ok, false);
  assert.equal(validateSellerPhotoBatch([{ name: "x.gif", size: 100, type: "image/gif" }]).ok, false);
  assert.equal(validateSellerPhotoBatch([{ name: "x.jpg", size: 15 * 1024 * 1024 + 1, type: "image/jpeg" }]).ok, false);
  assert.equal(validateSellerPhotoBatch([{ name: "x.jpg", size: 100, type: "image/jpeg" }]).ok, true);
});

test("binary signatures are checked instead of trusting mime alone", () => {
  assert.equal(hasExpectedImageSignature(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg"), true);
  assert.equal(hasExpectedImageSignature(new Uint8Array([0x00, 0xd8, 0xff]), "image/jpeg"), false);
  assert.equal(hasExpectedImageSignature(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), true);
});

test("UI exposes preview, ordering, deletion, progress and truthful review status", () => {
  assert.match(page, /SellerSecurePublishForm/);
  assert.match(form, /Aperçu final/);
  assert.match(form, /Aperçu et ordre des photos/);
  assert.match(form, /ArrowUp/);
  assert.match(form, /ArrowDown/);
  assert.match(form, /Retirer/);
  assert.match(form, /Envoi privé/);
  assert.match(form, /Prête à vérifier/);
  assert.match(form, /Rien n’est publié automatiquement/);
  assert.match(form, /role="alert"/);
});

test("upload endpoint remains bounded and draft-scoped", () => {
  assert.match(route, /SELLER_PHOTO_MAX_COUNT/);
  assert.match(route, /SELLER_PHOTO_MAX_BYTES/);
  assert.match(route, /x-draft-upload-token/);
  assert.match(route, /\.eq\("draft_id", draftId\)/);
  assert.match(route, /hasExpectedImageSignature/);
});
