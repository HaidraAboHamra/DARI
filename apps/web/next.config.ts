import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // Monorepo root, so the standalone output includes workspace packages.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  async headers() {
    const common = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
    ];
    return [
      // Every page except /embed/* refuses to be framed by other sites (clickjacking).
      { source: '/((?!embed/).*)', headers: [...common, { key: 'X-Frame-Options', value: 'SAMEORIGIN' }] },
      // /embed/* (the public, read-only city map) is shown inside the Dari app.
      { source: '/embed/:path*', headers: [...common, { key: 'Content-Security-Policy', value: 'frame-ancestors *' }] },
    ];
  },
};

export default config;
