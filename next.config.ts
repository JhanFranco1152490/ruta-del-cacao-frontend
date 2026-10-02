import { withSerwist } from '@serwist/turbopack';
import type { NextConfig } from 'next';

import { LEGACY_REDIRECTS } from './src/config/redirects';

const nextConfig: NextConfig = {
  async redirects() {
    return LEGACY_REDIRECTS;
  },
};

export default withSerwist(nextConfig);
