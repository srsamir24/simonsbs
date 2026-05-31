/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // The lib/ and seed/ modules use explicit ".js" ESM import specifiers that resolve to
    // ".ts" source (required by tsx/vitest/NodeNext). Teach webpack the same mapping so the
    // engine can be imported by the app without changing extensions.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
