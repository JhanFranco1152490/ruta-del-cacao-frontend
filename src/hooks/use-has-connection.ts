'use client';

import { useIsOnline } from './use-is-online';
import { useSessionSource } from './use-session';

// Hay conexión de verdad: el navegador dice tener red y el servidor respondió al pedir la
// sesión. Con señal débil o wifi sin internet el navegador dice que hay red aunque no llegue
// nada; la sesión de la copia del dispositivo lo delata.
export function useHasConnection() {
  const isOnline = useIsOnline();
  const sessionSource = useSessionSource();
  return isOnline && sessionSource !== 'device';
}
