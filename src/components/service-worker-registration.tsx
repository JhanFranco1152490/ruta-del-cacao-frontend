'use client';

import { useEffect } from 'react';

// La API de Background Sync no es parte del DOM estándar de TypeScript (solo la implementa
// Chrome/Android hoy): se declara el único método que se usa en vez de traer sus tipos.
interface RegistrationWithBackgroundSync {
  sync?: { register(tag: string): Promise<void> };
}

// Registra el Service Worker que hace la app instalable y, donde el navegador lo soporte, la
// sincronización en segundo plano ('cacao-sync') que despierta a la cola cuando vuelve la
// conexión con la app cerrada (session-shell.tsx procesa el aviso). Sin soporte de ninguna de
// las dos, la app sigue funcionando en línea con normalidad.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      const sync = (registration as unknown as RegistrationWithBackgroundSync)
        .sync;
      void sync?.register('cacao-sync');
    });
  }, []);

  return null;
}
