/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };
    return config;
  },
  transpilePackages: [
    '@aws-amplify/graphql-api-construct',
    '@aws-amplify/backend',
    '@aws-amplify/graphql-types-generator',
    '@aws-amplify/graphql-generator',
  ],
};

module.exports = nextConfig
