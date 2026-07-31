/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable Webpack disk caching during development on Windows
      // to permanently prevent missing HMR chunk manifest white screen errors.
      config.cache = false;
    }
    return config;
  },
  async rewrites() {
    return [
      {
        // Proxy all /api/* requests to the Go backend server.
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
