'use client';

import { useEffect } from 'react';

// Registra el Service Worker que hace la app instalable y avisa a la cola de sincronización
// cuando el navegador dispara una sincronización en segundo plano (ver session-shell.tsx).
// Sin soporte del navegador la app sigue funcionando en línea con normalidad.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js');
  }, []);

  return null;
}
