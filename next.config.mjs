/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Simple webpack configuration that just handles Node.js module errors
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

    return config;
  },
};

export default nextConfig;
