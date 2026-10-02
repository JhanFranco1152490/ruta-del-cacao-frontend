import { withSerwist } from '@serwist/turbopack';
import type { NextConfig } from 'next';

import { LEGACY_REDIRECTS } from './src/config/redirects';

const nextConfig: NextConfig = {
  experimental: {
    // Una navegación que falla por falta de red queda en espera y se reintenta al volver la
    // conexión, en vez de romper la app.
    useOffline: true,
  },
  async redirects() {
    return LEGACY_REDIRECTS;
  },
};

export default withSerwist(nextConfig);
