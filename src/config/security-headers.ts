// Los encabezados de seguridad de toda respuesta. La política de contenido (CSP) enumera de dónde
// puede cargar la app cada tipo de recurso; lo que no está aquí, el navegador lo bloquea.
//
// - Los scripts y estilos en línea los necesita Next (hidratación) y las librerías de mapas y de
//   interfaz, y sin nonce por petición no se pueden quitar: se permiten, pero solo del propio
//   origen y en línea, sin cargar scripts de otros sitios.
// - En desarrollo Next evalúa código y abre un websocket para recargar: solo ahí se permite.
// - Los mosaicos de los mapas vienen de los proveedores de `config/map`.
// - `blob:` y `data:` son las fotos que se eligen o se toman en el dispositivo antes de enviarse.
const MAP_TILE_HOSTS = [
  'https://tile.openstreetmap.org',
  'https://tiles.stadiamaps.com',
  'https://server.arcgisonline.com',
];

export function contentSecurityPolicy({
  apiUrl,
  isDev,
}: {
  apiUrl: string;
  isDev: boolean;
}) {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', apiUrl, ...MAP_TILE_HOSTS],
    'font-src': ["'self'", 'data:'],
    // Los mosaicos también aquí: el Service Worker los pide por su cuenta para guardarlos, y sus
    // peticiones se rigen por `connect-src`, no por `img-src`.
    'connect-src': [
      "'self'",
      apiUrl,
      ...MAP_TILE_HOSTS,
      ...(isDev ? ['ws:', 'wss:'] : []),
    ],
    'media-src': ["'self'", 'blob:'],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  const policy = Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}

export function securityHeaders(options: { apiUrl: string; isDev: boolean }) {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy(options) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // La cámara y la ubicación las usa la propia app (fotos de evidencia y GPS); nada más.
    {
      key: 'Permissions-Policy',
      value: 'camera=(self), geolocation=(self), microphone=(), payment=()',
    },
    ...(options.isDev
      ? []
      : [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ]),
  ];
}
