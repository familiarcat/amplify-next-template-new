/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable server components for compatibility with Amplify
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Output directory
  distDir: 'build',
  // Environment variables
  env: {
    NEXT_PUBLIC_BUILD_MODE: 'production',
  },
  // Webpack configuration
  webpack: (config) => {
    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
      process: false,
      zlib: false,
      querystring: false,
      http: false,
      https: false,
      url: false,
      net: false,
      tls: false,
      child_process: false,
    };

    // Ignore all modules that cause issues with Next.js
    config.module = {
      ...config.module,
      exprContextCritical: false,
      unknownContextCritical: false,
    };

    return config;
  },
};

module.exports = nextConfig;
