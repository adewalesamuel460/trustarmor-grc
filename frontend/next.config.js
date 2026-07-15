/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // Proxy all /api/* requests to the Go backend server.
        // This works both locally and in Codespaces because Next.js
        // makes the request server-side where localhost:8000 is reachable.
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
