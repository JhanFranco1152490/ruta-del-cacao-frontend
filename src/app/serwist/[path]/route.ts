import { createSerwistRoute } from '@serwist/turbopack';

import { OFFLINE_PRECACHE_ROUTES } from '@/config/offline-routes';

// Una revisión por build: en cada despliegue las pantallas guardadas se renuevan y nunca queda una
// versión vieja apuntando a archivos que ya no existen.
const revision = crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: OFFLINE_PRECACHE_ROUTES.map((url) => ({
      url,
      revision,
    })),
    swSrc: 'src/app/sw.ts',
    useNativeEsbuild: true,
  });
