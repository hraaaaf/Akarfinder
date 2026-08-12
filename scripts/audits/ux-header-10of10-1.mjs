// UX-HEADER-10OF10-1 remains a frozen workflow entrypoint.
// UX-PREMIUM-HEADER-1 supersedes only the Search header geometry, so replay
// the new exact contract while preserving the historical artifact path.
process.env.AUDIT_LOT = "ux-header-10of10-1";
await import("./ux-premium-header-1.mjs");
