import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/producers', destination: '/productores', permanent: false },
      {
        source: '/producers/new',
        destination: '/productores/nuevo',
        permanent: false,
      },
      {
        source: '/producers/:id',
        destination: '/productores/:id',
        permanent: false,
      },
      {
        source: '/producers/:id/edit',
        destination: '/productores/:id/editar',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
