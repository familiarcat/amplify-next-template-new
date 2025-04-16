module.exports = {
  resolve: {
    fallback: {
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
    },
  },
  module: {
    exprContextCritical: false,
    unknownContextCritical: false,
  },
};
