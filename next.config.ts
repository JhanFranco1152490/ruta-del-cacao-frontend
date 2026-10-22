import { withSerwist } from '@serwist/turbopack';
import type { NextConfig } from 'next';

import { LEGACY_REDIRECTS } from './src/config/redirects';
import { securityHeaders } from './src/config/security-headers';
import { API_URL } from './src/lib/env';

const nextConfig: NextConfig = {
  async redirects() {
    return LEGACY_REDIRECTS;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders({
          apiUrl: API_URL,
          isDev: process.env.NODE_ENV !== 'production',
        }),
      },
    ];
  },
};

export default withSerwist(nextConfig);
