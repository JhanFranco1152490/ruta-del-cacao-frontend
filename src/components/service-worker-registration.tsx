'use client';

import { useEffect } from 'react';

export const SERVICE_WORKER_URL = '/serwist/sw.js';

// La API de Background Sync no es parte del DOM estándar de TypeScript (solo la implementa
// Chrome/Android hoy): se declara el único método que se usa en vez de traer sus tipos.
interface RegistrationWithBackgroundSync {
  sync?: { register(tag: string): Promise<void> };
}

// Registra el Service Worker que guarda la app para abrirla sin conexión y, donde el navegador lo
// soporte, la sincronización en segundo plano ('cacao-sync') que despierta a la cola cuando vuelve
// la conexión con la app cerrada (session-shell.tsx procesa el aviso). En desarrollo no se
// registra: los archivos cambian a cada rato y lo guardado confundiría. Sin soporte, la app sigue
// funcionando en línea con normalidad.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === 'development' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }
    navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { scope: '/' })
      .then((registration) =>
        (
          registration as unknown as RegistrationWithBackgroundSync
        ).sync?.register('cacao-sync'),
      )
      .catch(() => {
        // Sin Service Worker activo o sin soporte: la cola se procesa al abrir la app y al volver
        // la red, así que no hace falta avisar.
      });
  }, []);

  return null;
}
