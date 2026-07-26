/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["node:sqlite"],
  env: {
    // ODM-09 — the certified Thin Index Search Gateway is active by default.
    // Set NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED=false only for an explicit rollback.
    NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED:
      process.env.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED ?? "true",
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("node:sqlite");
    }
    return config;
  },
};

export default nextConfig;
